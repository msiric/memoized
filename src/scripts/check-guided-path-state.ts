import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import { PrismaClient } from '@prisma/client'
import { encode } from 'next-auth/jwt'
import puppeteer, { type Browser, type BrowserContext, type CDPSession, type ElementHandle, type HTTPResponse, type Page, type Protocol } from 'puppeteer'
import { firstPassHref, TS_BASICS_HREF, TS_FIRST_PASS_OPTIONAL, TS_FIRST_PASS_STEPS } from '../lib/typescript-first-pass'
import { createFirstPassLessonFixture } from '../test-fixtures/typescript-first-pass'
import {
  assertStateFixtureDatabase, G4_OLD_READER_SHA, STATE_PROFILES, stateUserId,
  UNRELATED_LESSON, UNRELATED_PROBLEM, type StateProfile,
} from './guided-path-state-fixture'

const origin = 'http://127.0.0.1:3014'
const baselineOrigin = 'http://127.0.0.1:3015'
const fixture = createFirstPassLessonFixture()
const feedback = 'Synthetic fixture feedback.'
const privateMarker = 'G4_PRIVATE_LESSON_BODY'
const ownedUsers = STATE_PROFILES.map(profile => stateUserId(profile.key))
const diagnostic = (error: unknown) => error instanceof Error ? error.stack ?? error.message : String(error)

type Snapshot = Awaited<ReturnType<typeof snapshot>>
type Mark = { problemId: string; completed: boolean; expectedUserId: string }
type CaseEvidence = {
  name: string; width: number; phase: string; successful: boolean
  timeline: { at: string; phase: string }[]
  states: object[]; responses: object[]; failures: string[]
  before?: Snapshot; after?: Snapshot; restored?: Snapshot
}
type PublishProgress = (evidence?: CaseEvidence, phase?: string) => void

async function snapshot(prisma: PrismaClient, userIds: string[]) {
  assert(userIds.every(id => ownedUsers.includes(id)), 'Only exact synthetic owners may be inspected or restored')
  const [problems, lessons, subscriptions] = await Promise.all([
    prisma.userProblemProgress.findMany({ where: { userId: { in: userIds } }, orderBy: [{ userId: 'asc' }, { problemId: 'asc' }] }),
    prisma.userLessonProgress.findMany({ where: { userId: { in: userIds } }, orderBy: [{ userId: 'asc' }, { lessonId: 'asc' }] }),
    prisma.subscription.findMany({
      where: { customer: { userId: { in: userIds } } },
      select: { id: true, status: true, updatedAt: true },
      orderBy: { id: 'asc' },
    }),
  ])
  return { userIds, problems, lessons, subscriptions }
}

async function restore(prisma: PrismaClient, before: Snapshot, allowedProblems: string[], allowedLessons: string[]) {
  assertStateFixtureDatabase()
  const current = await snapshot(prisma, before.userIds)
  assert(current.problems.every(row => allowedProblems.includes(row.problemId)), 'Unexpected non-fixture problem mutation')
  assert(current.lessons.every(row => allowedLessons.includes(row.lessonId)), 'Unexpected non-fixture lesson mutation')
  await prisma.$transaction([
    prisma.userProblemProgress.deleteMany({ where: {
      userId: { in: before.userIds }, problemId: { in: allowedProblems },
      id: { notIn: before.problems.map(row => row.id) },
    } }),
    prisma.userLessonProgress.deleteMany({ where: {
      userId: { in: before.userIds }, lessonId: { in: allowedLessons },
      id: { notIn: before.lessons.map(row => row.id) },
    } }),
    ...before.problems.map(row => prisma.userProblemProgress.upsert({ where: { id: row.id }, create: row, update: row })),
    ...before.lessons.map(row => prisma.userLessonProgress.upsert({ where: { id: row.id }, create: row, update: row })),
    ...before.subscriptions.map(({ id, ...data }) => prisma.subscription.update({ where: { id }, data })),
  ])
  assert.deepEqual(await snapshot(prisma, before.userIds), before, 'Fixture restoration must be exact, including history timestamps')
}

async function clickText(page: Page, selector: string, text: string) {
  for (const element of await page.$$(selector)) {
    if (await element.evaluate((node, expected) => node.textContent?.trim() === expected, text)) {
      await clickElement(page, element)
      return
    }
  }
  throw new Error(`Missing visible control: ${selector} / ${text}`)
}

async function clickElement(page: Page, element: ElementHandle<Element>) {
  // Native scrolling keeps targets clear of the fixed header. Wait for the
  // real drawer's entrance animation rather than clicking through it.
  await element.evaluate(node => node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }))
  await page.waitForFunction(async node => {
    const before = node.getBoundingClientRect()
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    const box = node.getBoundingClientRect()
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)
    return node.isConnected && box.width > 0 && box.height > 0 &&
      box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth &&
      Math.abs(box.x - before.x) < 0.25 && Math.abs(box.y - before.y) < 0.25 &&
      Math.abs(box.width - before.width) < 0.25 && Math.abs(box.height - before.height) < 0.25 &&
      hit !== null && node.contains(hit)
  }, {}, element)
  await element.click()
}

async function clickSelector(page: Page, selector: string) {
  const element = await page.waitForSelector(selector)
  assert(element)
  await clickElement(page, element)
}

async function waitChecked(page: Page, selector: string, completed: boolean) {
  await page.waitForFunction((query, value) => {
    const element = document.querySelector<HTMLInputElement>(query)
    return element?.checked === value && !element.disabled && element.getAttribute('aria-busy') !== 'true'
  }, {}, selector, completed)
}

function tableCheckbox(title: string) {
  return `table input[aria-label=${JSON.stringify(`Mark "${title}" complete`)}]`
}

async function unrelatedBankMark(page: Page) {
  await page.waitForFunction(href => {
    const row = [...document.querySelectorAll('table tbody tr')].find(item =>
      item.querySelector('button')?.textContent?.trim() === 'Layout question 1' &&
      item.querySelector('a')?.getAttribute('href') === href)
    return row?.querySelector<HTMLInputElement>('input')?.checked === true
  }, {}, `/courses${UNRELATED_LESSON}`)
}

async function bankTitles(page: Page, titles: string[]) {
  await page.waitForFunction(expected =>
    JSON.stringify([...document.querySelectorAll('table tbody tr button')].map(button => button.textContent?.trim())) ===
      JSON.stringify(expected), {}, titles)
}

async function drawerPosition(page: Page, title: string, index: number, total: number) {
  await page.waitForFunction((expectedTitle, current, count) => {
    const heading = document.getElementById('slide-over-title')
    const counter = [...(heading?.parentElement?.querySelectorAll(':scope > span') ?? [])].some(element =>
      element.textContent?.trim() === `${current}/${count}`)
    const next = document.querySelector<HTMLButtonElement>('[role="dialog"] button[title="Next problem (→)"]')
    return heading?.textContent === expectedTitle && counter && next?.disabled === (current === count)
  }, {}, title, index + 1, total)
}

// Every browser context shares this budget, including RSC prefetches. No bot/IP
// bypasses, middleware resets, or automatic retries of ambiguous writes.
const requestTimes: number[] = []
let blockedUntil = 0
async function pace(target: URL) {
  if (target.pathname.startsWith('/_next') || target.pathname.startsWith('/api/auth') ||
      /\.(png|jpe?g|gif|svg|webp|avif|css|js|woff2?|ttf|otf|ico|xml|txt|webmanifest)$/i.test(target.pathname)) return
  while (true) {
    const now = Date.now()
    while (requestTimes.length && requestTimes[0] <= now - 60_000) requestTimes.shift()
    const waitUntil = Math.max(blockedUntil, requestTimes.length >= 70 ? requestTimes[0] + 60_100 : 0)
    if (waitUntil > now) await pause(waitUntil - now)
    else {
      requestTimes.push(now)
      return
    }
  }
}

function retryDelay(value: string | undefined) {
  assert(/^\d+$/.test(value ?? '') && Number(value) <= 120, 'Expected a bounded numeric Retry-After')
  return (Number(value) + 1) * 1000
}

class Reader {
  readonly marks: Mark[] = []
  readonly errors: string[] = []
  holdNextMark = false
  held: Protocol.Fetch.RequestPausedEvent | null = null
  private readRetryAt: number | null = null
  private readonly pending = new Set<Promise<void>>()
  private readonly pendingMarks = new Map<string, { mark: Mark; hold: boolean }>()
  private readonly capturedMarks = new Map<Mark, { status: number | undefined; body: string }>()

  private constructor(
    readonly context: BrowserContext, readonly page: Page, readonly cdp: CDPSession,
    readonly evidence: CaseEvidence, readonly output: string, readonly secret: string,
    readonly publish: PublishProgress, readonly base: string,
  ) {}

  static async open(browser: Browser, evidence: CaseEvidence, output: string, secret: string, publish: PublishProgress, base = origin) {
    assert([origin, baselineOrigin].includes(base))
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    const cdp = await page.createCDPSession()
    const reader = new Reader(context, page, cdp, evidence, output, secret, publish, base)
    page.setDefaultTimeout(120_000)
    page.setDefaultNavigationTimeout(180_000)
    await page.setViewport({ width: evidence.width, height: 1000 })
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    page.on('pageerror', error => reader.errors.push(diagnostic(error)))
    page.on('response', response => {
      const request = response.request()
      const target = new URL(response.url())
      if (target.origin !== base || target.pathname.startsWith('/_next') ||
          (!target.pathname.startsWith('/api/') && request.method() !== 'POST' && !request.isNavigationRequest())) return
      const mark = request.method() === 'POST' && request.postData()?.includes('"problemId"')
      evidence.responses.push({
        phase: evidence.phase, path: target.pathname, method: request.method(),
        kind: mark ? 'mark' : request.method() === 'POST' ? 'progress-read' : 'read',
        status: response.status(), retryAfter: response.headers()['retry-after'] ?? null,
      })
      publish(evidence)
      if (response.status() === 429 && !mark) {
        try {
          blockedUntil = Date.now() + retryDelay(response.headers()['retry-after'])
          if (request.method() === 'POST') reader.readRetryAt = blockedUntil
        } catch (error) { reader.errors.push(diagnostic(error)) }
      }
    })
    cdp.on('Fetch.requestPaused', event => {
      const work = reader.intercept(event).catch(async error => {
        reader.errors.push(diagnostic(error))
        try { await cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'Failed' }) }
        catch (failure) { reader.errors.push(diagnostic(failure)) }
      })
      reader.pending.add(work)
      void work.finally(() => reader.pending.delete(work))
    })
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
    return reader
  }

  private async intercept(event: Protocol.Fetch.RequestPausedEvent) {
    if (event.responseStatusCode !== undefined || event.responseErrorReason !== undefined) {
      const pending = this.pendingMarks.get(event.requestId)
      assert(pending, 'Only actual mark responses are intercepted')
      const result = await this.cdp.send('Fetch.getResponseBody', { requestId: event.requestId })
      this.capturedMarks.set(pending.mark, {
        status: event.responseStatusCode,
        body: result.base64Encoded ? Buffer.from(result.body, 'base64').toString('utf8') : result.body,
      })
      this.evidence.responses.push({
        phase: this.evidence.phase, kind: pending.hold ? 'committed-save-response-held' : 'actual-save-response-captured',
        method: event.request.method,
        path: new URL(event.request.url).pathname, status: event.responseStatusCode,
      })
      this.publish(this.evidence)
      this.pendingMarks.delete(event.requestId)
      if (pending.hold) {
        assert.equal(this.held, null, 'Only one old-owner save response may be held')
        this.held = event
      } else await this.cdp.send('Fetch.continueResponse', { requestId: event.requestId })
      return
    }
    const target = new URL(event.request.url)
    if (target.origin !== this.base && target.protocol !== 'data:') {
      await this.cdp.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' })
      return
    }
    if (target.origin === this.base) await pace(target)
    let interceptResponse = false
    if (target.origin === this.base && event.request.method === 'POST' && event.request.postData?.includes('"problemId"')) {
      const payload: unknown = JSON.parse(event.request.postData)
      assert(Array.isArray(payload) && payload.length === 1, 'Expected one explicit save argument')
      const value: unknown = payload[0]
      assert(value !== null && typeof value === 'object' &&
        'problemId' in value && typeof value.problemId === 'string' &&
        'completed' in value && typeof value.completed === 'boolean' &&
        'expectedUserId' in value && typeof value.expectedUserId === 'string',
      'Every write must contain an explicit desired value and owner')
      const mark: Mark = { problemId: value.problemId, completed: value.completed, expectedUserId: value.expectedUserId }
      assert(fixture.problems.some(problem => problem.id === mark.problemId))
      assert.equal(typeof mark.completed, 'boolean', 'Every write must express the desired value')
      assert(ownedUsers.includes(mark.expectedUserId), 'Every new-writer save must specify its exact synthetic owner')
      this.marks.push(mark)
      this.pendingMarks.set(event.requestId, { mark, hold: this.holdNextMark })
      interceptResponse = true
      this.holdNextMark = false
    }
    await this.cdp.send('Fetch.continueRequest', { requestId: event.requestId, interceptResponse })
  }

  assertConfirmation(index: number) {
    const mark = this.marks[index]
    const reply = this.capturedMarks.get(mark)
    assert(reply, 'Capture the original response with Fetch before continuing it')
    assert.equal(reply.status, 200)
    assert(reply.body.includes('"success":true'), 'The actual action must confirm success, not just return HTTP 200')
    assert(reply.body.includes(`"userId":${JSON.stringify(mark.expectedUserId)}`), 'Confirmation owner must match')
    assert(reply.body.includes(`"problemId":${JSON.stringify(mark.problemId)}`), 'Confirmation question must match')
    assert(reply.body.includes(`"completed":${JSON.stringify(mark.completed)}`), 'Confirmation desired value must match')
  }

  async signIn(profile: StateProfile) {
    const id = stateUserId(profile)
    const token = await encode({ secret: this.secret, maxAge: 3600,
      token: { sub: id, userId: id, name: id, email: `${id}@example.invalid` } })
    await this.context.setCookie({
      name: 'next-auth.session-token', value: token, domain: '127.0.0.1',
      path: '/', httpOnly: true, sameSite: 'Lax',
    })
  }

  expectResponse(kind: 'mark' | 'progress-read' | 'session') {
    // Install before the interaction, but keep rejected waits observed even
    // when an earlier assertion fails and closes the page before consumption.
    const result = this.page.waitForResponse(reply => {
      const request = reply.request()
      const target = new URL(reply.url())
      if (target.origin !== this.base) return false
      if (kind === 'session') return target.pathname === '/api/auth/session'
      return request.method() === 'POST' && !!request.headers()['next-action'] &&
        !!request.postData()?.includes('"problemId"') === (kind === 'mark')
    }).then(
      response => ({ response }),
      error => {
        this.errors.push(diagnostic(error))
        return { error }
      },
    )
    return async (): Promise<HTTPResponse> => {
      const outcome = await result
      if ('error' in outcome) throw outcome.error
      return outcome.response
    }
  }

  async go(href: string, reload = false) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = reload
        ? await this.page.reload({ waitUntil: 'networkidle0' })
        : await this.page.goto(new URL(href, this.base).href, { waitUntil: 'networkidle0' })
      assert(response)
      if (response.status() === 429) await pause(retryDelay(response.headers()['retry-after']))
      else {
        assert.equal(response.status(), 200, 'Actual document read must succeed')
        return
      }
    }
    throw new Error('Repeated document read rate limiting after honoring Retry-After')
  }

  async count(value: number) {
    const expected = `${value}/4 marked complete`
    const deadline = Date.now() + 180_000
    while (Date.now() < deadline) {
      assert.deepEqual(this.errors, [])
      if (await this.page.evaluate(value =>
        document.querySelector('[data-path-count]')?.textContent?.trim() === value &&
        ![...document.querySelectorAll('[data-guided-path] [role="status"]')].some(element =>
          element.textContent?.includes('Refreshing saved marks')), expected)) return
      if (this.readRetryAt !== null) {
        await pause(Math.max(0, this.readRetryAt - Date.now()))
        this.readRetryAt = null
        await clickText(this.page, '[data-guided-path] button', 'Retry saved marks')
      }
      await pause(100)
    }
    throw new Error(`Confirmed count did not become ${expected}`)
  }

  async guided(count: number, step: number) {
    await this.page.waitForSelector('[data-guided-path="typescript-first-pass"]')
    await this.count(count)
    await this.question(step)
    assert(!(await this.page.content()).includes(privateMarker), 'Guided payload must not include the paid lesson body')
  }

  async question(index: number, focused = false) {
    await this.page.waitForFunction((title, focus) => {
      const heading = document.getElementById('guided-question-title')
      return heading?.textContent === title && (!focus || document.activeElement === heading)
    }, {}, TS_FIRST_PASS_STEPS[index].title, focused)
    assert.equal(await this.page.$$eval('[aria-current="step"]', elements => elements.length), 1)
    assert.equal(await this.page.$eval('[aria-current="step"]', element => element.getAttribute('href')), firstPassHref(TS_FIRST_PASS_STEPS[index].id))
  }

  async reveal(scope = '[data-guided-path]') {
    await clickText(this.page, `${scope} button`, 'Reveal answer')
    // Framer's exiting ThinkingPrompt precedes mounting the actual answer.
    await this.page.waitForFunction((query, text) =>
      document.querySelector<HTMLElement>(query)?.innerText.includes(text), {}, scope, feedback)
  }

  async capture(label: string) {
    this.phase(label)
    this.evidence.states.push({ label, dom: await this.page.evaluate(() => ({
      location: `${location.pathname}${location.search}${location.hash}`,
      width: innerWidth, documentWidth: document.documentElement.scrollWidth,
      count: document.querySelector('[data-path-count]')?.textContent?.trim() ?? null,
      title: document.getElementById('guided-question-title')?.textContent ?? null,
      focusId: document.activeElement?.id ?? null,
      focusTag: document.activeElement?.tagName ?? null,
      focusedPlaceholder: document.activeElement?.getAttribute('placeholder') ?? null,
      mainText: document.querySelector<HTMLElement>('main')?.innerText ?? '',
      checkboxes: [...document.querySelectorAll<HTMLInputElement>('main input[type="checkbox"], [role="dialog"] input[type="checkbox"]')].map(input => ({
        label: input.getAttribute('aria-label'), checked: input.checked, disabled: input.disabled,
        busy: input.getAttribute('aria-busy'),
      })),
    })) })
    this.publish(this.evidence)
    await this.page.screenshot({ path: path.join(this.output, `guided-state-${this.evidence.name}-${label}.png`) })
  }

  phase(value: string) {
    this.publish(this.evidence, value)
  }

  async release() {
    assert(this.held, 'Expected a real server response paused after commit')
    const { requestId, responseStatusCode } = this.held
    assert.equal(responseStatusCode, 200, 'The held response must be a successful actual server response')
    await this.cdp.send('Fetch.continueResponse', { requestId })
    this.held = null
  }

  async close() {
    // Failure cleanup releases the real response, never replays its write.
    if (this.held) {
      await this.cdp.send('Fetch.continueResponse', { requestId: this.held.requestId })
      this.held = null
    }
    await Promise.all(this.pending)
    await this.context.close()
  }
}

async function assertChangedOnly(prisma: PrismaClient, before: Snapshot, userId: string, problemId: string, completed: boolean) {
  const after = await snapshot(prisma, before.userIds)
  assert.deepEqual(after.lessons, before.lessons, 'All full-user lesson history must survive question saves')
  assert.deepEqual(after.subscriptions, before.subscriptions)
  assert.deepEqual(
    after.problems.filter(row => row.userId !== userId || row.problemId !== problemId),
    before.problems.filter(row => row.userId !== userId || row.problemId !== problemId),
    'Unrelated full-user problem rows must survive unchanged',
  )
  assert.equal(after.problems.find(row => row.userId === userId && row.problemId === problemId)?.completed, completed)
  return after
}

async function save(reader: Reader, selector: string, checkbox: string, user: StateProfile, problemIndex: number, completed: boolean) {
  const start = reader.marks.length
  const response = reader.expectResponse('mark')
  await clickSelector(reader.page, selector)
  const reply = await response()
  assert.equal(reply.status(), 200, 'No write retry: inspect the server/database if this save is ambiguous')
  reader.assertConfirmation(start)
  await waitChecked(reader.page, checkbox, completed)
  assert.deepEqual(reader.marks.slice(start), [{
    problemId: fixture.problems[problemIndex].id, completed, expectedUserId: stateUserId(user),
  }])
}

async function main() {
  assertStateFixtureDatabase()
  const mode = process.argv[2]
  assert(mode === 'on' || mode === 'compat', 'Use on or compat; never run against real accounts or databases')
  if (mode === 'compat') assert.equal(process.env.G4_OLD_READER_SHA, G4_OLD_READER_SHA)
  const oldGuidedEnabled = process.env.G4_OLD_READER_FLAG_ENABLED === 'true'
  if (mode === 'compat' && oldGuidedEnabled) {
    assert.equal(process.versions.node.split('.')[0], '24', 'Run the new-writer checker with Node 24')
    assert.match(process.env.G4_OLD_READER_NODE_VERSION ?? '', /^v20\./, 'Record the previous production reader runtime')
  }
  const output = process.env.READER_LAYOUT_REPORT_DIR
  const secret = process.env.NEXTAUTH_SECRET
  assert(output && secret)
  fs.mkdirSync(output, { recursive: true })
  const prisma = new PrismaClient()
  const report = {
    mode, baseline: mode === 'compat' ? G4_OLD_READER_SHA : null,
    checkerNodeVersion: process.version,
    baselineNodeVersion: mode === 'compat' ? process.env.G4_OLD_READER_NODE_VERSION ?? null : null,
    baselineGuidedEnabled: mode === 'compat' && oldGuidedEnabled,
    phase: 'starting', updatedAt: new Date().toISOString(),
    expectedCases: mode === 'on' ? 14 : 1, complete: false,
    cases: [] as CaseEvidence[], failures: [] as string[],
  }
  const reportPath = path.join(output, `guided-state-${mode}.json`)
  const publish: PublishProgress = (evidence, phase) => {
    const at = new Date().toISOString()
    report.updatedAt = at
    if (phase) {
      report.phase = phase
      if (evidence) {
        evidence.phase = phase
        evidence.timeline.push({ at, phase })
      }
      const event = { at, mode, case: evidence?.name ?? null, width: evidence?.width ?? null, phase }
      console.log(`G4 state phase: ${JSON.stringify(event)}`)
      try { fs.appendFileSync(path.join(output, `guided-state-${mode}.jsonl`), JSON.stringify(event) + '\n') }
      catch (error) {
        report.failures.push(`Phase journal: ${diagnostic(error)}`)
        report.complete = false
        process.exitCode = 1
        console.error(`G4 state phase journal failed: ${diagnostic(error)}`)
      }
    }
    try {
      fs.writeFileSync(`${reportPath}.next`, JSON.stringify(report, null, 2) + '\n')
      fs.renameSync(`${reportPath}.next`, reportPath)
    } catch (error) {
      // Evidence failures fail acceptance without preventing fixture restoration.
      report.failures.push(`Progress report: ${diagnostic(error)}`)
      report.complete = false
      process.exitCode = 1
      console.error(`G4 state evidence persistence failed in ${report.phase}: ${diagnostic(error)}`)
    }
  }
  publish(undefined, 'validate-fixtures')
  const heartbeat = setInterval(() => {
    const current = report.cases.at(-1)
    console.log(`G4 state waiting: ${JSON.stringify({
      at: new Date().toISOString(), mode, case: current?.name ?? null, phase: report.phase,
      lastUpdate: report.updatedAt, responses: current?.responses.length ?? 0,
    })}`)
  }, 20_000)
  heartbeat.unref()
  let browser: Browser | undefined
  let suitePassed = false
  try {
    const unrelatedProblem = await prisma.problem.findUniqueOrThrow({ where: { contentId: UNRELATED_PROBLEM }, select: { id: true } })
    const unrelatedLesson = await prisma.lesson.findUniqueOrThrow({ where: { contentId: UNRELATED_LESSON }, select: { id: true } })
    const allowedProblems = [...fixture.problems.map(problem => problem.id), unrelatedProblem.id]
    const allowedLessons = [fixture.id, unrelatedLesson.id]
    const users = await prisma.user.findMany({ where: { id: { in: ownedUsers } },
      select: { id: true, email: true, _count: { select: { accounts: true } } } })
    assert.equal(users.length, ownedUsers.length, 'Seed the extended synthetic fixture users first')
    assert(users.every(user => user.email === `${user.id}@example.invalid` && user._count.accounts === 0))
    publish(undefined, 'launch-browser')
    browser = await puppeteer.launch({ headless: true, ...(process.env.CI ? { args: ['--no-sandbox'] } : {}) })
    // Previous layout/checker traffic shares the middleware's real IP window.
    publish(undefined, 'respect-shared-rate-window-61-seconds')
    await pause(61_000)

    const runCase = async (
      name: string, width: number, profiles: StateProfile[],
      test: (reader: Reader, before: Snapshot, evidence: CaseEvidence) => Promise<void>,
    ) => {
      const evidence: CaseEvidence = { name, width, phase: 'setup', successful: false, timeline: [], states: [], responses: [], failures: [] }
      report.cases.push(evidence)
      publish(evidence, 'snapshot-before')
      const before = await snapshot(prisma, profiles.map(stateUserId))
      evidence.before = before
      publish(evidence, 'setup-browser-context')
      let reader: Reader | undefined
      try {
        reader = await Reader.open(browser!, evidence, output, secret, publish)
        await reader.signIn(profiles[0])
        await test(reader, before, evidence)
        assert.deepEqual(reader.errors, [])
        assert.equal(await reader.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'The page must not overflow horizontally')
        evidence.after = await snapshot(prisma, before.userIds)
        await reader.capture('verified')
        evidence.successful = true
      } catch (error) {
        evidence.failures.push(`Phase ${evidence.phase}: ${diagnostic(error)}`)
        publish(evidence, 'case-failed')
        if (reader) {
          try { await reader.capture('failed') }
          catch (failure) { evidence.failures.push(`Failure capture: ${diagnostic(failure)}`) }
        }
      } finally {
        publish(evidence, 'close-browser-context')
        try { if (reader) await reader.close() }
        catch (error) { evidence.failures.push(`Browser cleanup: ${diagnostic(error)}`) }
        if (reader?.errors.length) evidence.failures.push(...reader.errors)
        try {
          publish(evidence, 'snapshot-after')
          evidence.after = await snapshot(prisma, before.userIds)
          publish(evidence, 'restore-exact-fixture-history')
          await restore(prisma, before, allowedProblems, allowedLessons)
          evidence.restored = await snapshot(prisma, before.userIds)
        } catch (error) { evidence.failures.push(`Fixture restoration: ${diagnostic(error)}`) }
        if (evidence.failures.length) evidence.successful = false
        publish(evidence, evidence.successful ? 'case-passed-restored' : 'case-failed-restoration-inspected')
        console.log(`${name}: ${evidence.successful ? 'passed' : 'FAILED'} (${evidence.phase})`)
      }
    }

    if (mode === 'on') {
      for (const profile of [
        { key: 'empty-free', width: 320, count: 0 },
        { key: 'full-free', width: 375, count: 4 },
        { key: 'empty-premium', width: 768, count: 0 },
        { key: 'optional-only', width: 320, count: 0 },
        { key: 'lesson-only', width: 1024, count: 0 },
      ] as const) {
        await runCase(profile.key, profile.width, [profile.key], async (reader, before) => {
          reader.phase('initial-confirmed-marks')
          await reader.go(firstPassHref())
          await reader.guided(profile.count, 0)
          await reader.reveal()
          await reader.capture('revealed')
          reader.phase('resume-or-review')
          await clickText(reader.page, '[data-guided-path] button', profile.count === 4
            ? 'Review from the first question' : `Continue: ${TS_FIRST_PASS_STEPS[0].title}`)
          await reader.question(0, true)
          await reader.count(profile.count)
          if (profile.key === 'lesson-only') {
            reader.phase('lesson-self-report-is-not-a-core-mark')
            await clickText(reader.page, '[data-guided-path] a', 'Open the full lesson')
            await reader.page.waitForFunction(() => !document.querySelector('[data-guided-path]'))
            await reader.page.waitForFunction(() => [...document.querySelectorAll('button')].some(button =>
              button.textContent?.trim() === 'Yes' && button.classList.contains('bg-lime-500')))
            await reader.capture('lesson-mark-still-complete')
            await reader.page.goBack({ waitUntil: 'networkidle0' })
            await reader.guided(0, 0)
          }
          assert.equal(reader.marks.length, 0, 'Reading/reviewing must not write completion')
          assert.deepEqual(await snapshot(prisma, before.userIds), before)
        })
      }

      for (const width of [320, 768]) await runCase(`history-${width}`, width, ['empty-free'], async (reader, before) => {
        reader.phase('hash-only')
        await reader.go(`${firstPassHref()}#${TS_FIRST_PASS_STEPS[1].id}`)
        await reader.guided(0, 1)
        await reader.question(1, true)
        await reader.capture('hash-only')
        reader.phase('explicit-step-hash-conflict')
        await reader.go(`${firstPassHref(TS_FIRST_PASS_STEPS[2].id).split('#')[0]}#${TS_FIRST_PASS_STEPS[0].id}`)
        await reader.guided(0, 2)
        await reader.page.waitForFunction(() => document.body.innerText.includes('question link and step did not match'))
        await reader.capture('step-wins-conflict')
        reader.phase('next-back-forward')
        await clickText(reader.page, '[aria-label="Question navigation"] button', 'Next question')
        await reader.question(3, true)
        assert.equal(new URL(reader.page.url()).searchParams.get('step'), TS_FIRST_PASS_STEPS[3].id)
        await reader.page.goBack({ waitUntil: 'networkidle0' })
        await reader.question(2, true)
        assert.equal(new URL(reader.page.url()).hash, `#${TS_FIRST_PASS_STEPS[2].id}`)
        await reader.page.goForward({ waitUntil: 'networkidle0' })
        await reader.question(3, true)
        await reader.capture('forward')
        reader.phase('actual-reload')
        await reader.go(reader.page.url(), true)
        await reader.guided(0, 3)
        await reader.question(3, true)
        await reader.reveal()
        reader.phase('focus-refresh-external-confirmation')
        const userId = stateUserId('empty-free')
        await prisma.userProblemProgress.create({ data: {
          userId, problemId: fixture.problems[0].id, completed: true,
          completedAt: new Date('2026-08-02T00:00:00Z'),
        } })
        const response = reader.expectResponse('progress-read')
        await reader.page.evaluate(() => window.dispatchEvent(new Event('focus')))
        const read = await response()
        assert([200, 429].includes(read.status()), 'Actual focus progress read must succeed or honor Retry-After')
        await reader.count(1)
        await reader.question(3)
        assert((await reader.page.$eval('[data-guided-path]', element => (element as HTMLElement).innerText)).includes(feedback))
        assert.equal(reader.marks.length, 0)
        await assertChangedOnly(prisma, before, userId, fixture.problems[0].id, true)
        await reader.capture('focus-preserves-selection-answer')
      })

      await runCase('normal-library-navigation', 768, ['optional-only'], async (reader, before) => {
        reader.phase('full-lesson-link')
        await reader.go(firstPassHref())
        await reader.guided(0, 0)
        await clickText(reader.page, '[data-guided-path] a', 'Open the full lesson')
        await reader.page.waitForFunction(() => !document.querySelector('[data-guided-path]') && !location.search)
        await reader.page.waitForSelector(`#${TS_FIRST_PASS_OPTIONAL.id}`)
        assert(!(await reader.page.content()).includes(privateMarker))
        await reader.capture('normal-protected-reader')
        reader.phase('library-back-forward')
        await reader.page.goBack({ waitUntil: 'networkidle0' })
        await reader.guided(0, 0)
        await reader.page.goForward({ waitUntil: 'networkidle0' })
        await reader.page.waitForFunction(() => !document.querySelector('[data-guided-path]'))
        await reader.page.goBack({ waitUntil: 'networkidle0' })
        await reader.guided(0, 0)
        reader.phase('optional-free-question-link')
        await clickText(reader.page, '[data-guided-path] a', `${TS_FIRST_PASS_OPTIONAL.title} (free question)`)
        const optional = `#${TS_FIRST_PASS_OPTIONAL.id}`
        await reader.page.waitForFunction(hash => !document.querySelector('[data-guided-path]') && location.hash === hash, {}, optional)
        await reader.page.waitForSelector(`${optional} input`)
        await waitChecked(reader.page, `${optional} input`, true)
        await reader.reveal(optional)
        assert(!(await reader.page.content()).includes(privateMarker))
        await reader.capture('optional-mark-remains')
        assert.equal(reader.marks.length, 0)
        assert.deepEqual(await snapshot(prisma, before.userIds), before)
      })

      for (const width of [375, 1024]) await runCase(`problem-bank-${width}`, width, ['shared'], async (reader, before) => {
        const userId = stateUserId('shared')
        const problemId = fixture.problems[1].id
        const tableBox = tableCheckbox(TS_FIRST_PASS_STEPS[1].title)
        const dialogBox = '[role="dialog"] input[type="checkbox"]'
        reader.phase('guided-to-normal-bank')
        await reader.go(firstPassHref(TS_FIRST_PASS_STEPS[1].id))
        await reader.guided(1, 1)
        await reader.go('/problems')
        await waitChecked(reader.page, tableBox, false)
        await waitChecked(reader.page, tableCheckbox(TS_FIRST_PASS_OPTIONAL.title), true)
        await unrelatedBankMark(reader.page)
        reader.phase('table-mark')
        await save(reader, tableBox, tableBox, 'shared', 1, true)
        await assertChangedOnly(prisma, before, userId, problemId, true)
        await reader.capture('table-mark-confirmed')
        reader.phase('slide-over-shared-confirmation')
        await clickText(reader.page, 'table tbody button', TS_FIRST_PASS_STEPS[1].title)
        await reader.page.waitForSelector('[role="dialog"]')
        await waitChecked(reader.page, dialogBox, true)
        await reader.reveal('[role="dialog"]')
        reader.phase('slide-over-unmark')
        await save(reader, '[role="dialog"] label', dialogBox, 'shared', 1, false)
        await waitChecked(reader.page, tableBox, false)
        await unrelatedBankMark(reader.page)
        await assertChangedOnly(prisma, before, userId, problemId, false)
        await reader.capture('slide-unmark-confirmed')
        reader.phase('slide-over-mark')
        await save(reader, '[role="dialog"] label', dialogBox, 'shared', 1, true)
        await waitChecked(reader.page, tableBox, true)
        assert((await reader.page.$eval('[role="dialog"]', element => (element as HTMLElement).innerText)).includes(feedback))
        await reader.page.keyboard.press('Escape')
        await reader.page.waitForSelector('[role="dialog"]', { hidden: true })
        reader.phase('normal-bank-reload-persistence')
        await reader.go('/problems', true)
        await waitChecked(reader.page, tableBox, true)
        await unrelatedBankMark(reader.page)
        await reader.go(firstPassHref(TS_FIRST_PASS_STEPS[1].id))
        await reader.guided(2, 1)
        await reader.capture('guided-sees-bank-save')
        reader.phase('table-unmark')
        await reader.go('/problems')
        await waitChecked(reader.page, tableBox, true)
        await save(reader, tableBox, tableBox, 'shared', 1, false)
        await unrelatedBankMark(reader.page)
        await assertChangedOnly(prisma, before, userId, problemId, false)
        await reader.go(firstPassHref(TS_FIRST_PASS_STEPS[1].id))
        await reader.guided(1, 1)
        await waitChecked(reader.page, `#${TS_FIRST_PASS_STEPS[1].id} input`, false)
        assert.equal(reader.marks.length, 4)
      })

      for (const profile of [
        { key: 'filtered-bank-three', width: 375, incomplete: [0, 1, 2] },
        { key: 'filtered-bank-two', width: 1024, incomplete: [0, 1] },
      ] as const) await runCase(profile.key, profile.width, [profile.key], async (reader, before) => {
        const dialogBox = '[role="dialog"] input[type="checkbox"]'
        const nextButton = '[role="dialog"] button[title="Next problem (→)"]'
        const expectedTitles = profile.incomplete.map(index => TS_FIRST_PASS_STEPS[index].title)
        reader.phase('filter-real-bank-to-incomplete-ts-questions')
        await reader.go('/problems')
        await reader.page.select('select[aria-label="Filter by lesson"]', 'ts-basics')
        await reader.page.select('select[aria-label="Filter by status"]', 'incomplete')
        await reader.page.waitForFunction(titles => {
          const rows = [...document.querySelectorAll('table tbody tr button')].map(button => button.textContent?.trim())
          return rows.length === titles.length && titles.every(title => rows.includes(title))
        }, {}, expectedTitles)
        const sequence = await reader.page.$$eval('table tbody tr button', buttons =>
          buttons.map(button => button.textContent?.trim() ?? ''))
        const filteredUrl = reader.page.url()
        assert.equal(new URL(reader.page.url()).searchParams.get('status'), 'incomplete')
        await waitChecked(reader.page, tableCheckbox(sequence[0]), false)
        await clickText(reader.page, 'table tbody button', sequence[0])
        await reader.page.waitForSelector('[role="dialog"]')

        for (let index = 0; index < sequence.length - 1; index++) {
          const title = sequence[index]
          const problemIndex = fixture.problems.findIndex(problem => problem.title === title)
          assert(problemIndex >= 0 && problemIndex < 4)
          reader.phase(`filtered-question-${index + 1}-reveal-before-mark`)
          await drawerPosition(reader.page, title, index, sequence.length)
          await reader.reveal('[role="dialog"]')
          await reader.capture(`filtered-question-${index + 1}-revealed`)
          const dialog = await reader.page.$('[role="dialog"]')
          assert(dialog)
          const beforeSave = await snapshot(prisma, before.userIds)
          reader.phase(`filtered-question-${index + 1}-mark-with-drawer-open`)
          await save(reader, '[role="dialog"] label', dialogBox, profile.key, problemIndex, true)
          assert.equal(reader.page.url(), filteredUrl, 'A confirmed save must preserve the selected filter URL')
          await bankTitles(reader.page, sequence.slice(index + 1))
          assert.equal(await dialog.evaluate(element =>
            element.isConnected && document.querySelector('[role="dialog"]') === element), true,
          'Marking must retain the existing drawer, not close and reopen it')
          assert.equal(await reader.page.$eval('#slide-over-title', element => element.textContent), title)
          await drawerPosition(reader.page, title, index, sequence.length)
          assert((await reader.page.$eval('[role="dialog"]', element => (element as HTMLElement).innerText)).includes(feedback),
            'Reactive Incomplete filtering must not close the marked question’s revealed answer')
          await assertChangedOnly(prisma, beforeSave, stateUserId(profile.key), fixture.problems[problemIndex].id, true)
          assert.equal(await reader.page.$eval(nextButton, element => (element as HTMLButtonElement).disabled), false,
            'Next must remain available when the original next question is still incomplete')
          await reader.capture(`filtered-question-${index + 1}-marked-answer-retained`)
          reader.phase(`filtered-question-${index + 1}-next-without-closing`)
          await clickSelector(reader.page, nextButton)
          await drawerPosition(reader.page, sequence[index + 1], index + 1, sequence.length)
          await waitChecked(reader.page, dialogBox, false)
          await reader.page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"] button')].some(button =>
            button.textContent?.trim() === 'Reveal answer'))
          await reader.capture(`filtered-question-${index + 1}-exact-next`)
        }

        reader.phase('reopen-drawer-uses-current-filtered-sequence')
        await reader.page.keyboard.press('Escape')
        await reader.page.waitForSelector('[role="dialog"]', { hidden: true })
        await bankTitles(reader.page, sequence.slice(-1))
        await clickText(reader.page, 'table tbody button', sequence.at(-1)!)
        await drawerPosition(reader.page, sequence.at(-1)!, 0, 1)
        await waitChecked(reader.page, dialogBox, false)
        await reader.capture('reopened-current-single-question-sequence')
        reader.phase('filtered-bank-reload-confirms-persistence')
        assert.equal(reader.page.url(), filteredUrl)
        await reader.go(reader.page.url(), true)
        await bankTitles(reader.page, sequence.slice(-1))
        await waitChecked(reader.page, tableCheckbox(sequence.at(-1)!), false)
        assert.equal(reader.marks.length, sequence.length - 1, 'Next and filtering must not send any extra saves')
        const finalIndex = TS_FIRST_PASS_STEPS.findIndex(step => step.title === sequence.at(-1))
        assert(finalIndex >= 0)
        await reader.go(firstPassHref(TS_FIRST_PASS_STEPS[finalIndex].id))
        await reader.guided(3, finalIndex)
      })

      await runCase('same-owner-premium-expiration', 768, ['entitlement'], async (reader, before) => {
        reader.phase('active-read-only-marks')
        await reader.go(firstPassHref())
        await reader.guided(2, 1)
        await reader.reveal()
        await reader.capture('active-guided')
        await reader.go(TS_BASICS_HREF)
        await reader.page.waitForFunction(marker => document.body.innerText.includes(marker), {}, privateMarker)
        await reader.capture('active-normal-body')
        reader.phase('expire-exact-fixture-subscription')
        assert.equal(before.subscriptions.length, 1)
        assert.equal(before.subscriptions[0].status, 'ACTIVE')
        await prisma.subscription.update({ where: { id: before.subscriptions[0].id }, data: { status: 'EXPIRED' } })
        await reader.go(reader.page.url(), true)
        await reader.page.waitForSelector(`#${TS_FIRST_PASS_STEPS[0].id}`)
        assert.equal(await reader.page.$('[data-guided-path]'), null)
        assert(!(await reader.page.content()).includes(privateMarker), 'Expired entitlement must protect normal reader body and payload')
        await reader.reveal(`#${TS_FIRST_PASS_STEPS[0].id}`)
        await reader.capture('expired-normal-public-feedback')
        reader.phase('expired-identical-progress-history')
        await reader.go(firstPassHref())
        await reader.guided(2, 1)
        await reader.reveal()
        await reader.capture('expired-guided')
        const after = await snapshot(prisma, before.userIds)
        assert.deepEqual(after.problems, before.problems)
        assert.deepEqual(after.lessons, before.lessons)
        assert.equal(after.subscriptions[0].status, 'EXPIRED')
        assert.equal(reader.marks.length, 0, 'Entitlement reads must not rewrite any marks')
      })

      await runCase('late-success-after-account-switch', 375, ['race-old', 'race-new'], async (reader, before, evidence) => {
        const step = TS_FIRST_PASS_STEPS[2]
        const oldId = stateUserId('race-old')
        reader.phase('old-owner-write')
        await reader.go(firstPassHref(step.id))
        await reader.guided(1, 2)
        await reader.reveal()
        const oldResponse = reader.expectResponse('mark')
        reader.holdNextMark = true
        await clickSelector(reader.page, `#${step.id} label`)
        const deadline = Date.now() + 120_000
        while (!reader.held && !reader.errors.length && Date.now() < deadline) await pause(50)
        assert.deepEqual(reader.errors, [])
        assert(reader.held, 'The real save response must reach CDP response-stage interception')
        assert.equal(reader.held.responseStatusCode, 200)
        const committed = await assertChangedOnly(prisma, before, oldId, fixture.problems[2].id, true)
        evidence.states.push({ label: 'old-owner-commit-before-response', database: committed })
        await reader.count(1)
        assert.equal(await reader.page.$eval(`#${step.id} input`, element => (element as HTMLInputElement).disabled), true)
        await reader.capture('old-owner-pending-committed')
        reader.phase('switch-cookie-and-session-without-navigation')
        const urlBefore = reader.page.url()
        const sessionResponse = reader.expectResponse('session')
        await reader.signIn('race-new')
        await reader.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
        assert.equal((await sessionResponse()).status(), 200)
        // Next serializes server actions. The new owner's snapshot can remain
        // queued behind the held save, but must never show the old owner's marks.
        await reader.page.waitForFunction(id => {
          const count = document.querySelector('[data-path-count]')?.textContent?.trim()
          const input = document.querySelector<HTMLInputElement>(`#${id} input`)
          return (count === 'Loading saved marks...' && input?.disabled) ||
            (count === '3/4 marked complete' && input && !input.checked && !input.disabled)
        }, {}, step.id)
        assert.equal(reader.page.url(), urlBefore)
        await reader.question(2)
        await reader.capture('new-owner-before-old-response')
        await reader.page.evaluate(() => {
          const state = window as typeof window & { g4Counts: string[]; g4Observer: MutationObserver }
          state.g4Counts = [document.querySelector('[data-path-count]')?.textContent?.trim() ?? 'missing']
          state.g4Observer = new MutationObserver(() => {
            state.g4Counts.push(document.querySelector('[data-path-count]')?.textContent?.trim() ?? 'missing')
          })
          state.g4Observer.observe(document.querySelector('[data-path-count]')!, { childList: true, subtree: true, characterData: true })
        })
        reader.phase('release-late-real-success')
        await reader.release()
        const reply = await oldResponse()
        assert.equal(reply.status(), 200)
        reader.assertConfirmation(0)
        await reader.count(3)
        await waitChecked(reader.page, `#${step.id} input`, false)
        const refresh = reader.expectResponse('progress-read')
        await reader.page.evaluate(() => window.dispatchEvent(new Event('focus')))
        assert([200, 429].includes((await refresh()).status()))
        await reader.count(3)
        await waitChecked(reader.page, `#${step.id} input`, false)
        const counts = await reader.page.evaluate(() => {
          const state = window as typeof window & { g4Counts: string[]; g4Observer: MutationObserver }
          state.g4Observer.disconnect()
          return state.g4Counts
        })
        assert(counts.length >= 1 && counts.at(-1) === '3/4 marked complete' &&
          counts.every(count => ['Loading saved marks...', '3/4 marked complete'].includes(count)),
        'Old-owner success must never become the new owner’s confirmed count')
        evidence.states.push({ label: 'new-owner-count-trace-after-release', counts })
        assert.deepEqual(reader.marks, [{ problemId: fixture.problems[2].id, completed: true, expectedUserId: oldId }])
        await assertChangedOnly(prisma, before, oldId, fixture.problems[2].id, true)
        await reader.capture('new-owner-unmodified-old-mark-retained')

        reader.phase('change-original-owner-history-while-other-account-active')
        let authoritative = await snapshot(prisma, before.userIds)
        for (const index of [1, 3]) {
          await prisma.userProblemProgress.create({ data: {
            userId: oldId, problemId: fixture.problems[index].id, completed: true,
            completedAt: new Date('2026-08-03T00:00:00Z'),
          } })
          authoritative = await assertChangedOnly(prisma, authoritative, oldId, fixture.problems[index].id, true)
        }
        evidence.states.push({ label: 'original-owner-changed-while-other-owner-active', database: authoritative })
        await reader.count(3)
        await waitChecked(reader.page, `#${step.id} input`, false)
        await reader.capture('other-owner-still-unmodified-before-return')
        reader.phase('return-to-original-owner-requires-authoritative-read')
        const returningSession = reader.expectResponse('session')
        const returningProgress = reader.expectResponse('progress-read')
        await reader.signIn('race-old')
        await reader.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
        assert.equal((await returningSession()).status(), 200)
        assert([200, 429].includes((await returningProgress()).status()))
        await reader.count(4)
        await reader.question(2)
        await waitChecked(reader.page, `#${step.id} input`, true)
        assert.equal(reader.page.url(), urlBefore, 'A → B → A must refresh ownership without navigating or reloading')
        assert.deepEqual(await snapshot(prisma, before.userIds), authoritative, 'Returning to A must only read its current history')
        assert.deepEqual(reader.marks, [{ problemId: fixture.problems[2].id, completed: true, expectedUserId: oldId }])
        await reader.capture('original-owner-authoritative-four-not-bootstrap-one')
      })
    } else {
      await runCase('new-writer-old-reader', 1024, ['compat-free', 'compat-premium'], async (writer, before, evidence) => {
        const expected = new Map<StateProfile, number[]>([
          ['compat-free', [0, 1, 4]], ['compat-premium', [2, 4]],
        ])
        for (const profile of ['compat-free', 'compat-premium'] as const) {
          writer.phase(`new-writer-${profile}`)
          await writer.signIn(profile)
          const index = profile === 'compat-free' ? 1 : 0
          const selected = TS_FIRST_PASS_STEPS[index].id
          await writer.go(firstPassHref(selected))
          await writer.guided(profile === 'compat-free' ? 1 : 2, index)
          await save(writer, `#${selected} label`, `#${selected} input`, profile, index, profile === 'compat-free')
          await writer.count(profile === 'compat-free' ? 2 : 1)
          await writer.capture(`new-writer-${profile}`)
        }
        const written = await snapshot(prisma, before.userIds)
        assert.deepEqual(written.lessons, before.lessons)
        assert.deepEqual(written.subscriptions, before.subscriptions)
        for (const profile of ['compat-free', 'compat-premium'] as const) {
          assert.deepEqual(
            written.problems.filter(row => row.userId === stateUserId(profile) && row.completed).map(row => row.problemId).sort(),
            [...expected.get(profile)!.map(index => fixture.problems[index].id), unrelatedProblem.id].sort(),
          )
        }
        evidence.states.push({ label: 'actual-new-writer-database', database: written })
        for (const profile of ['compat-free', 'compat-premium', null] as const) {
          const old = await Reader.open(browser!, evidence, output, secret, publish, baselineOrigin)
          try {
            old.phase(`pinned-old-reader-${profile ?? 'anonymous'}`)
            if (profile) await old.signIn(profile)
            const selected = TS_FIRST_PASS_STEPS[1].id
            await old.go(firstPassHref(selected))
            if (oldGuidedEnabled) {
              if (profile) await old.guided(expected.get(profile)!.filter(index => index < 4).length, 1)
              else {
                await old.page.waitForSelector('[data-guided-path="typescript-first-pass"]')
                await old.page.waitForFunction(() =>
                  document.querySelector('[data-path-count]')?.textContent?.trim() === 'Sign in to save your marks')
                await old.question(1)
                assert(!(await old.page.content()).includes(privateMarker))
              }
              await old.reveal()
              await old.capture(`baseline-guided-${profile ?? 'anonymous'}`)
              assert.deepEqual(await snapshot(prisma, before.userIds), written)
              old.phase(`pinned-old-normal-reader-${profile ?? 'anonymous'}`)
              await old.go(`${TS_BASICS_HREF}#${selected}`)
            }
            await old.page.waitForSelector(`#${selected}`)
            assert.equal(await old.page.$('[data-guided-path]'), null, 'The exact old app must retain its normal reader')
            assert.equal(new URL(old.page.url()).hash, `#${selected}`)
            assert.equal((await old.page.content()).includes(privateMarker), profile === 'compat-premium')
            await old.reveal(`#${selected}`)
            if (profile) {
              for (let index = 0; index < 4; index++) {
                await waitChecked(old.page, `#${TS_FIRST_PASS_STEPS[index].id} input`, expected.get(profile)!.includes(index))
              }
            }
            await old.capture(`baseline-${oldGuidedEnabled ? 'normal' : 'fallback'}-${profile ?? 'anonymous'}`)
            if (profile) {
              old.phase(`pinned-old-bank-${profile}`)
              await old.go('/problems')
              await old.page.waitForSelector('table tbody input[type="checkbox"]')
              await old.page.waitForFunction((titles, values) => {
                const rows = [...document.querySelectorAll('table tbody tr')]
                return titles.every((title, index) => {
                  const row = rows.find(item => item.querySelector('button')?.textContent?.trim() === title)
                  return row?.querySelector<HTMLInputElement>('input')?.checked === values[index]
                })
              }, {}, [...TS_FIRST_PASS_STEPS, TS_FIRST_PASS_OPTIONAL].map(item => item.title),
              [0, 1, 2, 3, 4].map(index => expected.get(profile)!.includes(index)))
              await unrelatedBankMark(old.page)
              await old.capture(`baseline-bank-${profile}`)
            }
            assert.deepEqual(old.errors, [])
            assert.equal(old.marks.length, 0, 'Old-reader compatibility must not rewrite new-writer history')
            assert.deepEqual(await snapshot(prisma, before.userIds), written)
          } catch (error) {
            try { await old.capture(`baseline-failed-${profile ?? 'anonymous'}`) }
            catch (failure) { throw new AggregateError([error, failure], 'Old-reader check and failure capture failed') }
            throw error
          } finally { await old.close() }
        }
        assert.equal(writer.marks.length, 2)
      })
    }
    assert.equal(report.cases.length, report.expectedCases)
    assert(report.cases.every(evidence => evidence.successful), 'Hosted state coverage has failed; inspect phase/DOM/database evidence')
    assert.deepEqual(report.failures, [], 'Evidence persistence is required for acceptance')
    suitePassed = true
  } catch (error) {
    report.failures.push(diagnostic(error))
    process.exitCode = 1
  } finally {
    publish(undefined, 'close-browser')
    try { if (browser) await browser.close() }
    catch (error) { report.failures.push(diagnostic(error)); report.complete = false; process.exitCode = 1 }
    try { await prisma.$disconnect() }
    catch (error) { report.failures.push(diagnostic(error)); report.complete = false; process.exitCode = 1 }
    clearInterval(heartbeat)
    report.complete = suitePassed && report.failures.length === 0
    publish(undefined, report.complete ? 'complete' : 'incomplete')
  }
  console.log(`Guided state ${mode}: ${report.cases.filter(evidence => evidence.successful).length}/${report.expectedCases}; complete=${report.complete}`)
}

main().catch(error => {
  console.error(diagnostic(error))
  process.exitCode = 1
})
