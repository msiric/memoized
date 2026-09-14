import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { setTimeout as pause } from 'node:timers/promises'
import puppeteer, { type Page } from 'puppeteer'
import { encode } from 'next-auth/jwt'
import { TS_BASICS_HREF, TS_FIRST_PASS_STEPS, firstPassHref } from '../lib/typescript-first-pass'

async function clickButton(page: Page, text: string, scope = '') {
  for (const button of await page.$$(`${scope} button`.trim())) {
    if (await button.evaluate((element, label) => element.textContent?.trim() === label, text)) {
      await button.click()
      return
    }
  }
  throw new Error(`Button not found: ${text}`)
}

async function navigate(page: Page, url: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await page.goto(url, { waitUntil: 'networkidle0' })
    assert(response)
    if (response.status() !== 429) {
      assert.equal(response.status(), 200)
      return
    }
    const retry = response.headers()['retry-after']
    assert(/^\d+$/.test(retry ?? '') && Number(retry) <= 120)
    await pause((Number(retry) + 1) * 1000)
  }
  throw new Error('Repeated rate limiting after honoring Retry-After')
}

async function main() {
  const mode = process.argv[2]
  assert(mode === 'on' || mode === 'off')
  assert.equal(process.env.READER_LAYOUT_FIXTURE, '1')
  const database = new URL(process.env.DATABASE_URL ?? '')
  assert(['localhost', '127.0.0.1'].includes(database.hostname))
  assert.equal(database.pathname, '/memoized_ci')
  const output = process.env.READER_LAYOUT_REPORT_DIR
  const secret = process.env.NEXTAUTH_SECRET
  assert(output && secret)
  const origin = 'http://127.0.0.1:3014'
  const report = { mode, complete: false, cases: [] as object[], failures: [] as object[], responses: [] as object[] }
  const requestTimes: number[] = []
  const pace = async (url: URL) => {
    if (url.origin !== origin || url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api/auth') ||
        /\.(png|jpg|svg|css|js|woff2?|ico)$/i.test(url.pathname)) return
    while (true) {
      const now = Date.now()
      while (requestTimes.length && requestTimes[0] <= now - 60_000) requestTimes.shift()
      if (requestTimes.length < 75) {
        requestTimes.push(now)
        return
      }
      await pause(requestTimes[0] + 60_100 - now)
    }
  }
  const browser = await puppeteer.launch({ headless: true, ...(process.env.CI ? { args: ['--no-sandbox'] } : {}) })
  const profiles = [
    { id: null, count: null, first: 0 },
    { id: 'g4-ci-free', count: 2, first: 1 },
    { id: 'g4-ci-premium', count: 4, first: 0 },
    { id: 'g4-ci-revoked', count: 1, first: 0 },
  ]
  try {
    // The preceding reader check used the same local IP. Respect that window
    // before beginning a separate interaction-heavy batch.
    await pause(61_000)
    for (const width of [320, 375, 768, 1024, 1440, 2560, 3840]) for (const profile of profiles) {
      const context = await browser.createBrowserContext()
      const page = await context.newPage()
      const errors: string[] = []
      let markMode: 'normal' | 'fail' | 'delay' = 'normal'
      let markRequests = 0
      let failProgressRead = false
      let phase = 'load'
      page.on('pageerror', error => errors.push(String(error)))
      page.on('response', response => {
        if (response.request().method() === 'POST') report.responses.push({
          width, profile: profile.id, phase, status: response.status(),
          kind: response.request().postData()?.includes('"problemId"') ? 'mark' : 'progress-read',
          retryAfter: response.headers()['retry-after'] ?? null,
        })
      })
      try {
        page.setDefaultTimeout(120_000)
        page.setDefaultNavigationTimeout(120_000)
        await page.setViewport({ width, height: 1000 })
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
        if (profile.id) {
          const token = await encode({ secret, maxAge: 3600,
            token: { sub: profile.id, userId: profile.id, name: profile.id, email: `${profile.id}@example.invalid` } })
          await context.setCookie({ name: 'next-auth.session-token', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' })
        }
        await page.setRequestInterception(true)
        page.on('request', async request => {
          const target = new URL(request.url())
          await pace(target)
          if (target.origin === origin && request.method() === 'POST' && request.postData()?.includes('"problemId"')) {
            markRequests++
            if (markMode === 'fail') {
              await request.respond({ status: 503, contentType: 'text/plain', body: 'Simulated fixture save failure' })
              return
            }
            if (markMode === 'delay') await pause(350)
          }
          if (target.origin === origin && request.method() === 'POST' &&
              !request.postData()?.includes('"problemId"') && failProgressRead) {
            await request.respond({ status: 503, contentType: 'text/plain', body: 'Simulated fixture progress failure' })
            return
          }
          if (target.origin === origin || target.protocol === 'data:') await request.continue()
          else void request.abort()
        })
        const selected = mode === 'off' ? TS_FIRST_PASS_STEPS[2].id : undefined
        await navigate(page, new URL(firstPassHref(selected), origin).href)
        if (mode === 'off') {
          assert.equal(await page.$('[data-guided-path]'), null)
          await page.waitForSelector(`#${TS_FIRST_PASS_STEPS[2].id}`)
          const text = await page.$eval('body', element => element.innerText)
          assert.equal(text.includes('G4_PRIVATE_LESSON_BODY'), profile.id === 'g4-ci-premium')
          await clickButton(page, 'Reveal answer', `#${TS_FIRST_PASS_STEPS[2].id}`)
          await page.waitForFunction(() => document.body.innerText.includes('Synthetic fixture feedback.'))
        } else {
          await page.waitForSelector('[data-guided-path="typescript-first-pass"]')
          const expected = profile.id ? `${profile.count}/4 marked complete` : 'Sign in to save your marks'
          await page.waitForFunction(value => document.querySelector('[data-path-count]')?.textContent?.trim() === value, {}, expected)
          assert.equal(await page.$eval('#guided-question-title', element => element.textContent), TS_FIRST_PASS_STEPS[profile.first].title)
          assert(!(await page.content()).includes('G4_PRIVATE_LESSON_BODY'), 'Guided response must not project the paid body')
          await clickButton(page, 'Reveal answer')
          await page.waitForFunction(() => document.body.innerText.includes('Synthetic fixture feedback.'))
          phase = 'revealed'
          if (width === 320) {
            phase = 'failed-save'
            let collapseFocused = false
            for (const button of await page.$$('[data-guided-path] button')) {
              if (await button.evaluate(element => element.textContent?.trim() === 'Collapse')) {
                await button.focus()
                collapseFocused = true
                break
              }
            }
            assert(collapseFocused, 'Expected the active question collapse control')
            let codeFocused = false
            for (let step = 0; step < 15; step++) {
              await page.keyboard.press('Tab')
              codeFocused = await page.evaluate(() => document.activeElement?.tagName === 'PRE')
              if (codeFocused) break
            }
            assert(codeFocused, 'Code must be reachable with native Tab')
            await page.keyboard.press('ArrowRight')
            await page.waitForFunction(() => {
              let element = document.activeElement
              while (element && element !== document.body) {
                if (element.scrollLeft > 0) return true
                element = element.parentElement
              }
              return false
            })
          }
          if (!profile.id && width === 320) {
            const label = await page.$(`#${TS_FIRST_PASS_STEPS[0].id} label`)
            assert(label)
            await label.click()
            await page.waitForFunction(() => document.body.innerText.includes('Sign in to save your learning progress'))
            assert.equal(markRequests, 0, 'Anonymous persistence must not send a mark action')
            await navigate(page, new URL(firstPassHref(), origin).href)
          }
          if (profile.id === 'g4-ci-free') {
            const step = TS_FIRST_PASS_STEPS[1]
            const label = await page.$(`#${step.id} label`)
            assert(label)
            if (width === 320) {
              markMode = 'fail'
              await label.click()
              await page.waitForSelector(`#${step.id} [role="alert"]`)
              assert.equal(await page.$eval('[data-path-count]', element => element.textContent?.trim()), '2/4 marked complete')
              assert((await page.$eval('body', element => element.innerText)).includes('Synthetic fixture feedback.'), 'Failed save must preserve the revealed feedback')
            }
            phase = 'duplicate-save'
            markMode = 'delay'
            const beforeRequests = markRequests
            await label.click({ clickCount: 2, delay: 20 })
            await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === '3/4 marked complete')
            assert.equal(markRequests - beforeRequests, 1, 'Duplicate clicks must send one explicit-value save')
            markMode = 'normal'
            assert.equal(await page.$eval('#guided-question-title', element => element.textContent), step.title)
            assert((await page.$eval('body', element => element.innerText)).includes('Synthetic fixture feedback.'), 'Successful save must preserve the revealed feedback')
            phase = 'reload-saved-mark'
            await navigate(page, new URL(firstPassHref(step.id), origin).href)
            await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === '3/4 marked complete')
            const savedLabel = await page.$(`#${step.id} label`)
            assert(savedLabel)
            await savedLabel.click()
            await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === '2/4 marked complete')
            if (width === 320) {
              phase = 'failed-progress-read'
              await clickButton(page, 'Reveal answer')
              await page.waitForFunction(() => document.body.innerText.includes('Synthetic fixture feedback.'))
              failProgressRead = true
              await page.evaluate(() => window.dispatchEvent(new Event('focus')))
              await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === 'Saved marks unavailable')
              assert((await page.$eval('body', element => element.innerText)).includes('Synthetic fixture feedback.'), 'Progress read failure must preserve the revealed feedback')
              phase = 'retry-progress-read'
              failProgressRead = false
              await clickButton(page, 'Retry saved marks')
              await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === '2/4 marked complete')
              const other = 'g4-ci-premium'
              phase = 'account-change'
              const token = await encode({ secret, maxAge: 3600,
                token: { sub: other, userId: other, name: other, email: `${other}@example.invalid` } })
              await context.setCookie({ name: 'next-auth.session-token', value: token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax' })
              await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
              await page.waitForFunction(() => document.querySelector('[data-path-count]')?.textContent?.trim() === '4/4 marked complete')
            }
            phase = 'invalid-query'
          }
          await navigate(page, `${origin}${firstPassHref()}&step=not-a-step`)
          await page.waitForFunction(() => document.body.innerText.includes('not in this first pass'))
          assert.equal(await page.$$eval('[aria-current="step"]', items => items.length), 1)
        }
        const canonical = await page.$eval('link[rel="canonical"]', element => element.getAttribute('href'))
        assert.equal(canonical, `${process.env.NEXT_PUBLIC_SITE_URL}${TS_BASICS_HREF}`)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
        assert.deepEqual(errors, [])
        await page.screenshot({ path: path.join(output, `guided-${mode}-${profile.id ?? 'anonymous'}-${width}.png`) })
        report.cases.push({ width, profile: profile.id ?? 'anonymous', successful: true })
      } catch (error) {
        report.failures.push({ width, profile: profile.id, phase,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined })
        await page.screenshot({ path: path.join(output, `guided-${mode}-failure-${width}-${profile.id ?? 'anonymous'}.png`) })
      } finally { await context.close() }
    }
    report.complete = report.failures.length === 0
    if (!report.complete) process.exitCode = 1
  } finally {
    await browser.close()
    fs.writeFileSync(path.join(output, `guided-${mode}.json`), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify(report))
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
