import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { setTimeout as pause } from 'node:timers/promises'
import { Prisma, PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import puppeteer, { type Browser, type BrowserContext, type HTTPRequest, type Page } from 'puppeteer'
import { firstPassHref, TS_BASICS_HREF, TS_FIRST_PASS_STEPS } from '../lib/typescript-first-pass'
import { createFirstPassLessonFixture } from '../test-fixtures/typescript-first-pass'

const origin = 'http://127.0.0.1:3014'
const template = '/courses/[courseSlug]/[sectionSlug]/[lessonSlug]'
const fixture = createFirstPassLessonFixture()
const first = fixture.problems[0]
const oldBody = 'G4_PRIVATE_LESSON_BODY'
const newBody = 'G4_PRIVATE_RENDERING_FRESH_BODY'
const oldAnswer = 'Synthetic fixture feedback.'
const newAnswer = 'G4_RENDERING_FRESH_FREE_FEEDBACK.'
const newDescription = 'G4_RENDERING_FRESH_DESCRIPTION: synthetic lesson rendering fixture.'
const profiles = [null, 'g4-ci-free', 'g4-ci-premium', 'g4-ci-revoked'] as const
const stack = (error: unknown) => error instanceof Error ? error.stack ?? error.message : String(error)
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function guardDatabase() {
  assert.equal(process.env.READER_LAYOUT_FIXTURE, '1')
  assert(process.env.DATABASE_URL)
  for (const value of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED]) {
    if (value === undefined) continue
    const target = new URL(value)
    assert(['postgres:', 'postgresql:'].includes(target.protocol))
    assert(['localhost', '127.0.0.1'].includes(target.hostname), 'Only loopback fixture databases are permitted')
    assert.equal(target.pathname, '/memoized_ci')
    assert.equal(target.searchParams.get('schema'), 'public')
  }
}

function compiled(value: Prisma.JsonValue) {
  assert(record(value) && typeof value.compiledSource === 'string', 'Expected compiled synthetic MDX')
  assert(isDeepStrictEqual(Object.keys(value).sort(), ['compiledSource', 'frontmatter', 'scope']))
  assert(record(value.scope) && Object.keys(value.scope).length === 0)
  assert(record(value.frontmatter) && Object.keys(value.frontmatter).length === 0)
  return { compiledSource: value.compiledSource, scope: {}, frontmatter: {} } satisfies Prisma.InputJsonObject
}

async function readFixture(prisma: PrismaClient) {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: fixture.id } })
  const problem = await prisma.problem.findUniqueOrThrow({ where: { id: first.id } })
  assert.equal(lesson.contentId, fixture.contentId)
  assert.equal(lesson.href, TS_BASICS_HREF)
  assert.equal(lesson.slug, 'ts-basics')
  assert.equal(lesson.title, fixture.title)
  assert.equal(lesson.access, 'PREMIUM')
  assert.equal(problem.lessonId, lesson.id)
  assert.equal(problem.contentId, first.contentId)
  assert.equal(problem.slug, first.slug)
  assert.equal(problem.title, first.title)
  assert.equal(problem.question, first.question)
  assert.equal(problem.type, first.type)
  assert.equal(problem.difficulty, first.difficulty)
  compiled(lesson.serializedBody)
  compiled(problem.serializedAnswer)
  return { lesson, problem }
}

async function progress(prisma: PrismaClient) {
  const lessons = await prisma.userLessonProgress.findMany({ orderBy: { id: 'asc' } })
  const problems = await prisma.userProblemProgress.findMany({ orderBy: { id: 'asc' } })
  assert([...lessons, ...problems].every(row => row.userId.startsWith('g4-ci-')), 'Progress evidence must contain only synthetic fixture owners')
  return { lessons, problems }
}

function cachePolicy(value: string | null | undefined) {
  assert(value, 'Session-dependent responses must declare Cache-Control')
  assert(/(?:^|,)\s*no-store(?:\s*,|$)/i.test(value), 'Session-dependent responses must be no-store')
  assert(!/(?:^|,)\s*public(?:\s*,|$)/i.test(value), 'Session-dependent responses must not be public')
  assert(!/(?:^|,)\s*s-maxage\s*=\s*[1-9]\d*/i.test(value), 'Shared caches must not retain session-dependent responses')
}

function checkManifests() {
  const prerender: unknown = JSON.parse(fs.readFileSync('.next/prerender-manifest.json', 'utf8'))
  const appPaths: unknown = JSON.parse(fs.readFileSync('.next/server/app-paths-manifest.json', 'utf8'))
  assert(record(prerender) && prerender.version === 4)
  assert(record(prerender.routes) && record(prerender.dynamicRoutes) && Array.isArray(prerender.notFoundRoutes))
  assert(record(appPaths))
  const entry = appPaths[`${template}/page`]
  assert(typeof entry === 'string', 'The built app must contain the runtime lesson route')
  const server = path.resolve('.next/server')
  const relative = path.relative(server, path.resolve(server, entry))
  assert(!relative.startsWith('..') && !path.isAbsolute(relative))
  assert(fs.statSync(path.join(server, relative)).isFile(), 'The runtime lesson module must actually exist')
  const lessonPath = (value: unknown) => typeof value === 'string' &&
    /^\/?courses\/[^/]+\/[^/]+\/[^/]+(?:\/page)?\/?$/.test(value)
  for (const routes of [prerender.routes, prerender.dynamicRoutes]) {
    for (const [route, details] of Object.entries(routes)) {
      assert(!lessonPath(route), `Lesson route was prerendered: ${route}`)
      assert(record(details))
      assert(!lessonPath(details.srcRoute) && !lessonPath(details.fallback), 'Lesson templates must not have static fallback output')
    }
  }
  assert(!prerender.notFoundRoutes.some(lessonPath), 'Lesson misses must resolve at request time, not from a build-time catalog')
  // Never persist the manifest's preview signing material.
  return { template, runtimeModule: entry, version: prerender.version, prerenderedLessons: 0, staticLessonFallbacks: 0 }
}

async function reveal(page: Page, expected: string) {
  const selector = `#${TS_FIRST_PASS_STEPS[0].id}`
  await page.waitForFunction(query => [...document.querySelectorAll(`${query} button`)].some(button =>
    button.textContent?.trim() === 'Reveal answer'), {}, selector)
  for (const button of await page.$$(`${selector} button`)) {
    if (await button.evaluate(element => element.textContent?.trim() === 'Reveal answer')) {
      await button.focus()
      assert(await button.evaluate(element => document.activeElement === element))
      await page.keyboard.press('Enter')
      await page.waitForFunction((query, text) =>
        document.querySelector<HTMLElement>(query)?.innerText.includes(text), {}, selector, expected)
      return
    }
  }
  throw new Error('The expanded first question must expose a native Reveal answer control')
}

function retryDelay(value: string | null | undefined) {
  assert(/^\d+$/.test(value ?? '') && Number(value) <= 120, 'Bounded numeric Retry-After is required')
  return (Number(value) + 1) * 1000
}

async function readFlight(page: Page, url: string, markers: string[], deadline: number) {
  for (let attempt = 0; attempt < 3; attempt++) {
    assert(Date.now() < deadline, 'Rendering gate exceeded its ten-minute work budget')
    const result = await page.evaluate(async (target, values) => {
      const response = await fetch(target, { headers: { RSC: '1' }, signal: AbortSignal.timeout(90_000) })
      const text = await response.text()
      return { status: response.status, cacheControl: response.headers.get('cache-control'),
        contentType: response.headers.get('content-type'), retryAfter: response.headers.get('retry-after'),
        markers: values.map(marker => text.includes(marker)) }
    }, url, markers)
    if (result.status !== 429) return result
    await pause(retryDelay(result.retryAfter))
  }
  throw new Error('RSC read remained rate limited after honoring Retry-After')
}

async function main() {
  guardDatabase()
  const mode = process.argv[2]
  assert(mode === 'on' || mode === 'off')
  const output = process.env.READER_LAYOUT_REPORT_DIR
  const secret = process.env.NEXTAUTH_SECRET
  const site = process.env.NEXT_PUBLIC_SITE_URL
  assert(output && secret && site)
  const canonical = new URL(TS_BASICS_HREF, site).href
  fs.mkdirSync(output, { recursive: true })
  const report = {
    mode, complete: false, expectedCases: 15, phase: 'setup', browserCacheEnabled: true, workBudgetMinutes: 10,
    cases: [] as { name: string; successful: boolean }[], failures: [] as string[],
    statuses: [] as object[], states: [] as object[],
    progressBefore: {} as object, progressAfter: {} as object,
    blockedExternal: 0, blockedPosts: 0,
  }
  const deadline = Date.now() + 10 * 60_000
  const publish = (phase?: string) => {
    if (phase) {
      report.phase = phase
      console.log(`Lesson rendering ${mode}: ${phase}`)
    }
    try {
      const target = path.join(output, `lesson-rendering-${mode}.json`)
      fs.writeFileSync(`${target}.next`, JSON.stringify(report, null, 2) + '\n')
      fs.renameSync(`${target}.next`, target)
    } catch (error) {
      report.complete = false
      report.failures.push(`Evidence persistence: ${stack(error)}`)
      console.error(`Lesson rendering evidence persistence failed: ${stack(error)}`)
      process.exitCode = 1
    }
  }
  const times: number[] = []
  const pace = async (url: URL) => {
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api/auth') ||
        /\.(png|jpe?g|svg|webp|avif|gif|css|js|woff2?|ttf|otf|ico|xml|txt|webmanifest)$/i.test(url.pathname)) return
    while (true) {
      const now = Date.now()
      while (times.length && times[0] <= now - 60_000) times.shift()
      if (times.length < 60) { times.push(now); return }
      await pause(times[0] + 60_100 - now)
    }
  }
  const prisma = new PrismaClient()
  let browser: Browser | undefined
  let original: Awaited<ReturnType<typeof readFixture>> | undefined
  let originalProgress: Awaited<ReturnType<typeof progress>> | undefined
  let mutationAttempted = false
  let normalTitles: string[] | undefined
  const restore = async () => {
    if (!mutationAttempted) return
    guardDatabase()
    assert(original)
    publish('restore-exact-fixture-fields')
    await prisma.$transaction([
      prisma.lesson.update({ where: { id: fixture.id }, data: {
        description: original.lesson.description, body: original.lesson.body,
        serializedBody: compiled(original.lesson.serializedBody), updatedAt: original.lesson.updatedAt,
      } }),
      prisma.problem.update({ where: { id: first.id }, data: {
        answer: original.problem.answer, serializedAnswer: compiled(original.problem.serializedAnswer),
        updatedAt: original.problem.updatedAt,
      } }),
    ])
    assert(isDeepStrictEqual(await readFixture(prisma), original), 'Exact fixture restoration failed')
    mutationAttempted = false
  }
  const run = async (name: string, test: (page: Page) => Promise<void>, user: typeof profiles[number] = null, width = 375) => {
    const result = { name, successful: false }
    report.cases.push(result)
    const failuresBefore = report.failures.length
    let context: BrowserContext | undefined
    let page: Page | undefined
    const errors: string[] = []
    const pending = new Set<Promise<void>>()
    try {
      publish(`${name}:start`)
      assert(Date.now() < deadline, 'Rendering gate exceeded its ten-minute work budget')
      assert(browser)
      context = await browser.createBrowserContext()
      page = await context.newPage()
      page.setDefaultTimeout(90_000)
      page.setDefaultNavigationTimeout(120_000)
      await page.setViewport({ width, height: 1000 })
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      if (user) {
        const token = await encode({ secret, maxAge: 3600,
          token: { sub: user, userId: user, name: user, email: `${user}@example.invalid` } })
        await context.setCookie({ name: 'next-auth.session-token', value: token, domain: '127.0.0.1',
          path: '/', httpOnly: true, sameSite: 'Lax' })
      }
      page.on('pageerror', error => errors.push(stack(error)))
      const intercept = async (request: HTTPRequest) => {
        const url = new URL(request.url())
        if (url.origin !== origin && url.protocol !== 'data:') {
          report.blockedExternal++
          await request.abort('blockedbyclient')
        } else if (!['GET', 'HEAD'].includes(request.method())) {
          report.blockedPosts++
          if (request.postData()?.includes('"problemId"') || request.postData()?.includes('"lessonId"')) {
            errors.push('Unexpected browser completion-write attempt was blocked')
          }
          await request.abort('blockedbyclient')
        } else {
          if (url.origin === origin) await pace(url)
          await request.continue()
        }
      }
      await page.setRequestInterception(true)
      await page.setCacheEnabled(true)
      page.on('request', request => {
        const work = intercept(request).catch(async error => {
          errors.push(stack(error))
          if (!request.isInterceptResolutionHandled()) {
            try { await request.abort('failed') }
            catch (failure) { errors.push(stack(failure)) }
          }
        })
        pending.add(work)
        void work.finally(() => pending.delete(work))
      })
      page.on('response', response => {
        const request = response.request()
        if (request.isNavigationRequest() || request.headers().rsc === '1') {
          report.statuses.push({ case: name, phase: report.phase, path: new URL(response.url()).pathname,
            kind: request.headers().rsc === '1' ? 'rsc' : 'document', status: response.status(),
            cacheControl: response.headers()['cache-control'] ?? null, fromCache: response.fromCache() })
          publish()
        }
      })
      await test(page)
      assert(errors.length === 0, 'Browser/interception errors occurred')
      result.successful = true
    } catch (error) {
      report.failures.push(`${name} (${report.phase}): ${stack(error)}`)
      if (page) {
        try {
          report.states.push({ case: name, failedDom: await page.$eval('body', element => element.innerText) })
          await page.screenshot({ path: path.join(output, `lesson-rendering-${mode}-${name}-failed.png`) })
        } catch (failure) { report.failures.push(`Failure capture: ${stack(failure)}`) }
      }
    } finally {
      try { await Promise.all(pending); if (context) await context.close() }
      catch (error) { report.failures.push(`Browser cleanup: ${stack(error)}`) }
      report.failures.push(...errors)
      try {
        await restore()
        const after = await progress(prisma)
        report.progressAfter = after
        assert(isDeepStrictEqual(after, originalProgress), 'Reading must not change any lesson/problem progress rows')
      } catch (error) { report.failures.push(`Fixture/progress cleanup: ${stack(error)}`) }
      result.successful = result.successful && report.failures.length === failuresBefore
      publish(`${name}:${result.successful ? 'passed-restored' : 'FAILED'}`)
    }
  }
  const readDocument = async (page: Page, url: string, reload = false) => {
    assert.equal(new URL(url).origin, origin)
    for (let attempt = 0; attempt < 3; attempt++) {
      assert(Date.now() < deadline, 'Rendering gate exceeded its ten-minute work budget')
      const response = reload ? await page.reload({ waitUntil: 'networkidle0' }) : await page.goto(url, { waitUntil: 'networkidle0' })
      assert(response)
      if (response.status() !== 429) return { response, text: await response.text() }
      await pause(retryDelay(response.headers()['retry-after']))
    }
    throw new Error('Read remained rate limited after honoring Retry-After')
  }
  try {
    publish('inspect-built-runtime-manifests')
    report.states.push({ manifests: checkManifests() })
    report.cases.push({ name: 'built-runtime-manifests', successful: true })
    original = await readFixture(prisma)
    assert(original.lesson.description)
    assert.equal(original.lesson.description, fixture.description)
    assert(original.lesson.body.includes(oldBody) && compiled(original.lesson.serializedBody).compiledSource.includes(oldBody))
    assert(original.problem.answer.includes(oldAnswer) && compiled(original.problem.serializedAnswer).compiledSource.includes(oldAnswer))
    assert(!JSON.stringify(original).includes(newBody) && !JSON.stringify(original).includes(newAnswer))
    const users = await prisma.user.findMany({ where: { id: { in: profiles.filter(user => user !== null) } },
      select: { id: true, email: true, _count: { select: { accounts: true } } } })
    assert(users.length === 3 && users.every(user => user.email === `${user.id}@example.invalid` && user._count.accounts === 0))
    originalProgress = await progress(prisma)
    report.progressBefore = originalProgress
    publish('launch-browser-with-normal-caching')
    browser = await puppeteer.launch({ headless: true, ...(process.env.CI ? { args: ['--no-sandbox'] } : {}) })
    publish('respect-shared-rate-window-61-seconds')
    await pause(61_000)
    for (const [kind, pathname] of [
      ['missing-lesson', '/courses/js-track/typescript-introduction/g4-rendering-missing-lesson'],
      ['missing-section-lesson', '/courses/js-track/g4-rendering-missing-section/ts-basics'],
      ['missing-section', '/courses/js-track/g4-rendering-missing-section'],
    ]) for (const guided of [false, true]) {
      await run(`${kind}-${guided ? 'query' : 'normal'}`, async page => {
        const url = `${origin}${pathname}${guided ? '?path=typescript-first-pass' : ''}`
        const result = await readDocument(page, url)
        assert.equal(result.response.status(), 404, 'Unknown catalog paths must be actual HTTP 404s')
        assert(!result.text.includes(oldBody) && !result.text.includes(newBody))
        const robots = await page.$$eval('meta[name="robots"]', elements => elements.map(element => element.getAttribute('content') ?? ''))
        assert(robots.some(value => value.includes('noindex')), 'Not-found pages must not be indexable')
        await page.screenshot({ path: path.join(output, `lesson-rendering-${mode}-${kind}-${guided ? 'query' : 'normal'}.png`) })
      })
    }
    for (const user of profiles) for (const guided of [false, true]) {
      const name = `${user ?? 'anonymous'}-${guided ? 'query' : 'normal'}`
      await run(name, async page => {
        assert(original)
        const isGuided = guided && mode === 'on'
        const hasBody = user === 'g4-ci-premium' && !isGuided
        const url = `${origin}${guided ? firstPassHref(TS_FIRST_PASS_STEPS[0].id) : `${TS_BASICS_HREF}#${TS_FIRST_PASS_STEPS[0].id}`}`
        for (const fresh of [false, true]) {
          const expectedDescription: string | null = fresh ? newDescription : original.lesson.description
          assert(expectedDescription)
          publish(`${name}:${fresh ? 'reload-exact-url-after-fixture-change' : 'read-original'}`)
          const result = await readDocument(page, url, fresh)
          assert.equal(result.response.status(), 200)
          assert.equal(page.url(), url, 'Freshness must not use a different URL or cache-busting query')
          cachePolicy(result.response.headers()['cache-control'])
          assert.equal(result.text.includes(oldBody), hasBody && !fresh, 'Raw document/embedded RSC old body projection differs')
          assert.equal(result.text.includes(newBody), hasBody && fresh, 'Raw document/embedded RSC new body projection differs')
          await page.waitForSelector(`#${TS_FIRST_PASS_STEPS[0].id}`)
          assert.equal(!!await page.$('[data-guided-path]'), isGuided)
          const seo = await page.evaluate(() => ({
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            title: document.title,
            ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
            twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
            ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
            descriptions: ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']
              .map(selector => document.querySelector(selector)?.getAttribute('content')),
            robots: [...document.querySelectorAll('meta[name="robots"]')].map(element => element.getAttribute('content') ?? ''),
            jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(element => element.textContent ?? ''),
          }))
          report.states.push({ case: name, fresh, url, width: guided ? 1024 : 375, seo })
          publish()
          assert.equal(seo.canonical, canonical)
          assert.equal(seo.ogUrl, canonical)
          assert(seo.descriptions.every(value => value === expectedDescription), 'All description metadata must be fresh')
          assert(seo.robots.length > 0 && seo.robots.every(value => !value.includes('noindex')), 'Known lessons must retain indexable metadata in CI')
          const structured: unknown[] = seo.jsonLd.map(value => JSON.parse(value))
          assert(structured.some(value => record(value) && value.url === canonical && value.name === fixture.title &&
            value.description === expectedDescription && Array.isArray(value['@type']) && value['@type'].includes('LearningResource')),
          'Lesson structured data must retain its canonical identity and fresh description')
          const titles = [seo.title, seo.ogTitle, seo.twitterTitle]
          assert(titles.every(value => typeof value === 'string' && value.includes(fixture.title)))
          const actualTitles = titles.map(value => { assert(typeof value === 'string'); return value })
          if (!normalTitles) normalTitles = actualTitles
          assert.deepEqual(actualTitles, normalTitles, 'Guided/fallback metadata must retain the normal lesson titles')
          publish(`${name}:${fresh ? 'fresh' : 'original'}-native-reveal`)
          await reveal(page, fresh ? newAnswer : oldAnswer)
          const dom = await page.$eval('body', element => element.innerText)
          const answer = await page.$eval(`#${TS_FIRST_PASS_STEPS[0].id}`, element => (element as HTMLElement).innerText)
          report.states.push({ case: name, fresh, dom: {
            firstQuestion: answer, oldPrivateVisible: dom.includes(oldBody), newPrivateVisible: dom.includes(newBody),
          } })
          publish()
          assert.equal(dom.includes(oldBody), hasBody && !fresh)
          assert.equal(dom.includes(newBody), hasBody && fresh)
          assert.equal(answer.includes(newAnswer), fresh)
          assert.equal(answer.includes(oldAnswer), !fresh)
          // A separate real Flight GET, with browser-default caching and no _rsc nonce.
          publish(`${name}:${fresh ? 'fresh' : 'original'}-flight-cache-and-projection`)
          const rsc = await readFlight(page, url, [oldBody, newBody, newAnswer, expectedDescription], deadline)
          report.states.push({ case: name, fresh, rsc })
          publish()
          assert.equal(rsc.status, 200)
          assert(rsc.contentType?.includes('text/x-component'), 'Expected an actual RSC representation')
          cachePolicy(rsc.cacheControl)
          assert.deepEqual(rsc.markers, [hasBody && !fresh, hasBody && fresh, fresh, true], 'Flight projection/freshness differs')
          await page.screenshot({ path: path.join(output, `lesson-rendering-${mode}-${name}-${fresh ? 'fresh' : 'original'}.png`) })
          if (!fresh) {
            publish(`${name}:mutate-only-synthetic-description-body-answer`)
            guardDatabase()
            mutationAttempted = true
            const body = compiled(original.lesson.serializedBody)
            const feedback = compiled(original.problem.serializedAnswer)
            await prisma.$transaction([
              prisma.lesson.update({ where: { id: fixture.id }, data: {
                description: newDescription, body: original.lesson.body.replaceAll(oldBody, newBody),
                serializedBody: { ...body, compiledSource: body.compiledSource.replaceAll(oldBody, newBody) },
                updatedAt: new Date(),
              } }),
              prisma.problem.update({ where: { id: first.id }, data: {
                answer: original.problem.answer.replaceAll(oldAnswer, newAnswer),
                serializedAnswer: { ...feedback, compiledSource: feedback.compiledSource.replaceAll(oldAnswer, newAnswer) },
                updatedAt: new Date(),
              } }),
            ])
          }
        }
      }, user, guided ? 1024 : 375)
      assert(!mutationAttempted, 'Stop rather than run another case on unrestored fixture data')
    }
    assert.equal(report.cases.length, report.expectedCases)
    assert(report.cases.every(result => result.successful))
    assert.equal(report.failures.length, 0)
  } catch (error) { report.failures.push(stack(error)) }
  finally {
    try { if (browser) await browser.close() }
    catch (error) { report.failures.push(`Browser shutdown: ${stack(error)}`) }
    try {
      await restore()
      if (originalProgress) {
        report.progressAfter = await progress(prisma)
        assert(isDeepStrictEqual(report.progressAfter, originalProgress), 'Final progress history differs')
      }
    } catch (error) { report.failures.push(`Final fixture restoration: ${stack(error)}`) }
    try { await prisma.$disconnect() }
    catch (error) { report.failures.push(`Database disconnect: ${stack(error)}`) }
    report.complete = report.failures.length === 0 && report.cases.length === report.expectedCases &&
      report.cases.every(result => result.successful) && !mutationAttempted
    publish(report.complete ? 'complete' : 'incomplete')
  }
  if (!report.complete) process.exitCode = 1
}

main().catch(error => {
  console.error(stack(error))
  process.exitCode = 1
})
