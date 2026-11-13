import { test, type Page, type Locator } from '@playwright/test'
import { EL, LK, activeInfo, hydrateLK, lastStep, liveText, open, save, walkEL } from './common'

/** R1-C: focus after every action, live text after every action, press and hover, touch. */

async function act(page: Page, root: string, name: string, fn: () => Promise<unknown>, log: unknown[]) {
  const t0 = Date.now()
  const before = await liveText(page, root)
  await fn()
  const early = await liveText(page, root)
  await page.waitForTimeout(150)
  const mid = await liveText(page, root)
  await page.waitForTimeout(500)
  const live = await liveText(page, root)
  log.push({ name, focus: await activeInfo(page), liveChangedAt0: early !== before, liveAt150: mid !== before, live: live === before ? '(unchanged)' : live, ms: Date.now() - t0 })
}

test('event-loop focus and live after every action @1440', async ({ page }) => {
  test.setTimeout(200_000)
  await open(page, { width: 1440 })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  const log: unknown[] = []
  const slider = f.getByRole('slider')
  await slider.focus()
  await act(page, EL, 'ArrowRight', () => page.keyboard.press('ArrowRight'), log)
  await act(page, EL, 'ArrowLeft', () => page.keyboard.press('ArrowLeft'), log)
  await act(page, EL, 'End', () => page.keyboard.press('End'), log)
  await act(page, EL, 'Home', () => page.keyboard.press('Home'), log)
  // Mouse: Next button click, then keyboard continues?
  await act(page, EL, 'click Next', () => f.locator('[data-viz-part="viz-next"]').click(), log)
  await act(page, EL, 'click Back', () => f.getByRole('button', { name: 'Back' }).click(), log)
  await act(page, EL, 'click Play', () => f.locator('[data-viz-part="viz-play"]').click(), log)
  await act(page, EL, 'Esc while playing', () => page.keyboard.press('Escape'), log)
  // Through the checkpoint by keyboard.
  await slider.focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  log.push({ name: 'at checkpoint', focus: await activeInfo(page), live: await liveText(page, EL) })
  // Tab order at the checkpoint.
  const order: unknown[] = []
  await f.getByRole('radiogroup').first().focus().catch(() => {})
  for (let i = 0; i < 9; i++) {
    order.push(await activeInfo(page))
    await page.keyboard.press('Tab')
  }
  log.push({ name: 'tab order at checkpoint', order })
  await slider.focus()
  await act(page, EL, 'answer 2', () => page.keyboard.press('2'), log)
  const last = await lastStep(page)
  await walkEL(page, last - 1, '2')
  await act(page, EL, 'ArrowRight onto last (reveal)', () => page.keyboard.press('ArrowRight'), log)
  // Tab order at the end.
  const endOrder: unknown[] = []
  await slider.focus()
  for (let i = 0; i < 4; i++) {
    endOrder.push(await activeInfo(page))
    await page.keyboard.press('Tab')
  }
  log.push({ name: 'tab order at end', endOrder })
  await act(page, EL, 'click Replay', () => f.locator('[data-viz-part="viz-next"]').click(), log)
  await walkEL(page, last, '2')
  await act(page, EL, 'Home at end (Replay shortcut)', () => page.keyboard.press('Home'), log)
  await act(page, EL, 'preset switch by click', () => f.getByRole('radio', { name: 'Drain' }).click(), log)
  // Skip at the checkpoint by mouse.
  await walkEL(page, 0)
  await slider.focus()
  for (let g = 0; g < 10 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  await act(page, EL, 'click Skip', () => f.getByRole('button', { name: /Skip/ }).click(), log)
  save('interaction-el.json', log)
})

test('list-keys focus and live after every action @1440', async ({ page }) => {
  test.setTimeout(200_000)
  await open(page, { width: 1440 })
  await hydrateLK(page)
  const f = page.locator(LK)
  const log: unknown[] = []
  const cb = f.locator('input[type="checkbox"]').first()
  if (!(await cb.isChecked())) await act(page, LK, 'check row 1 (click)', () => cb.click(), log)
  else { await act(page, LK, 'uncheck row 1 (click)', () => cb.click(), log); await act(page, LK, 'check row 1 (click)', () => cb.click(), log) }
  await act(page, LK, 'key Id (click)', () => f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: 'Id' }).click(), log)
  await act(page, LK, 'action Insert at top (click)', () => f.locator('[data-viz-focus=\"action-insert-top\"]').click(), log)
  await act(page, LK, 'answer by click', () => f.locator('[data-choice-index="0"]').click(), log)
  await act(page, LK, 'Try another action (click)', () => f.locator('[data-viz-part="viz-again"]').click(), log)
  await act(page, LK, 'action Reverse (keyboard Enter)', async () => {
    await f.locator('[data-viz-focus=\"action-reverse\"]').focus()
    await page.keyboard.press('Enter')
  }, log)
  await act(page, LK, 'answer by digit 1 (focus in dock)', () => page.keyboard.press('1'), log)
  await act(page, LK, 'Again (keyboard Enter)', () => page.keyboard.press('Enter'), log)
  await act(page, LK, 'action Delete first (keyboard)', async () => {
    await f.locator('[data-viz-focus=\"action-delete-first\"]').focus()
    await page.keyboard.press('Enter')
  }, log)
  await act(page, LK, 'Esc in ask', () => page.keyboard.press('Escape'), log)
  await act(page, LK, 'Skip (keyboard)', async () => {
    await f.getByRole('button', { name: /Skip/ }).focus()
    await page.keyboard.press('Enter')
  }, log)
  // Tab order in reveal.
  const order: unknown[] = []
  await f.getByRole('radiogroup').first().locator('[tabindex="0"]').focus()
  for (let i = 0; i < 10; i++) {
    order.push(await activeInfo(page))
    await page.keyboard.press('Tab')
  }
  log.push({ name: 'tab order in reveal', order })
  save('interaction-lk.json', log)
})

const FEEDBACK = `(el) => { const cs = getComputedStyle(el); return { bg: cs.backgroundColor, color: cs.color, filter: cs.filter, border: cs.borderColor, op: cs.opacity, transition: cs.transitionDuration + ' ' + cs.transitionProperty.slice(0, 60) } }`

async function feedback(page: Page, loc: Locator) {
  const rd = (l: Locator) => l.evaluate(new Function('el', `return (${FEEDBACK})(el)`) as never)
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  const rest = await rd(loc)
  await loc.hover()
  await page.waitForTimeout(250)
  const hover = await rd(loc)
  await page.mouse.down()
  await page.waitForTimeout(200)
  const press = await rd(loc)
  await page.mouse.up()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  return { rest, hover, press }
}

test('press and hover feedback across controls @1440', async ({ page }) => {
  test.setTimeout(200_000)
  await open(page, { width: 1440 })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  const res: Record<string, unknown> = {}
  res['el next'] = await feedback(page, f.locator('[data-viz-part="viz-next"]'))
  await page.keyboard.press('Home')
  res['el back (secondary)'] = await feedback(page, f.getByRole('button', { name: 'Back' }))
  res['el preset segment'] = await feedback(page, f.getByRole('radio', { name: 'Drain' }))
  res['el summary'] = await feedback(page, f.locator('summary').first())
  res['el slider thumb'] = await feedback(page, f.getByRole('slider'))
  const last = await lastStep(page)
  await walkEL(page, last, '2')
  res['el replay'] = await feedback(page, f.locator('[data-viz-part="viz-next"]'))
  await hydrateLK(page)
  const l = page.locator(LK)
  await page.waitForTimeout(300)
  res['lk key segment'] = await feedback(page, l.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: 'Index' }))
  res['lk before card'] = await feedback(page, l.locator('[data-row="before-1"] label'))
  res['lk action button'] = await feedback(page, l.locator('[data-viz-focus=\"action-reverse\"]'))
  res['lk summary'] = await feedback(page, l.locator('summary').first())
  const env = page.locator('[data-viz="environment-records"]').first()
  await env.scrollIntoViewIfNeeded()
  res['env summary'] = await feedback(page, env.locator('summary:visible').first())
  res['env function'] = await feedback(page, env.locator('.vz-s [tabindex]:visible').first())
  save('feedback.json', res)
})

test('touch @375: taps, sticky hover, scrubber vs scroll on reveal controls', async ({ browser }) => {
  test.setTimeout(200_000)
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, colorScheme: 'dark', baseURL: 'http://localhost:3100' })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations')
  const f = page.locator(EL)
  await page.locator(`${EL}[data-viz-interactive="true"]`).waitFor({ timeout: 30_000 })
  await f.evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await page.waitForTimeout(400)
  const res: Record<string, unknown> = {}
  const next = f.locator('[data-viz-part="viz-next"]')
  const bg = (l: Locator) => l.evaluate((el) => getComputedStyle(el).backgroundColor + ' ' + getComputedStyle(el).filter)
  res.nextRest = await bg(next)
  await next.tap()
  await page.waitForTimeout(400)
  res.nextAfterTap = await bg(next)
  res.focusAfterTap = await activeInfo(page)
  // Tap through to the end (answering 1), then Replay.
  for (let g = 0; g < 20; g++) {
    const mode = await f.getAttribute('data-viz-mode')
    if (mode === 'ask') await f.locator('[data-choice]').first().tap({ timeout: 5000 })
    else if ((await next.getAttribute('aria-label')) === 'Replay') break
    else await next.tap()
    await page.waitForTimeout(450)
  }
  res.atEnd = { step: await f.getAttribute('data-viz-step'), label: await next.getAttribute('aria-label') }
  res.replayAfterTap = await bg(next)
  // Vertical swipe starting on the scrubber.
  const s = (await f.getByRole('slider').boundingBox())!
  const y0 = await page.evaluate(() => window.scrollY)
  const step0 = await f.getAttribute('data-viz-step')
  const cdp = await ctx.newCDPSession(page)
  const x = s.x + s.width * 0.3
  const y = s.y + s.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 0.5, y: y - i * 15 }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
  res.swipeOnScrubber = { scrolled: (await page.evaluate(() => window.scrollY)) - y0, stepBefore: step0, stepAfter: await f.getAttribute('data-viz-step') }
  // Horizontal drag on the scrubber.
  const y1 = await page.evaluate(() => window.scrollY)
  const s2 = (await f.getByRole('slider').boundingBox())!
  const yy = s2.y + s2.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s2.x + s2.width - 10, y: yy }] })
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s2.x + s2.width - 10 - i * 20, y: yy + 1 }] })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(400)
  res.dragScrubber = { scrolled: (await page.evaluate(() => window.scrollY)) - y1, stepAfter: await f.getAttribute('data-viz-step') }
  // List keys touch: tap a Before card checkbox, then sticky hover on the action button.
  const l = page.locator(LK)
  await l.scrollIntoViewIfNeeded()
  await page.locator(`${LK}[data-viz-interactive="true"]`).waitFor({ timeout: 30_000 })
  await page.waitForTimeout(300)
  // At 375 the four action segments do not fit (the action is a native
  // select, H3 R8), so sticky hover is probed on a key segment instead.
  const btn = l.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { name: 'id', exact: true })
  const card = l.locator('[data-row="before-1"] label')
  res.cardRest = await card.evaluate((el) => getComputedStyle(el).borderColor + ' ' + getComputedStyle(el).backgroundColor)
  await card.tap()
  await page.waitForTimeout(400)
  res.cardAfterTap = await card.evaluate((el) => getComputedStyle(el).borderColor + ' ' + getComputedStyle(el).backgroundColor)
  res.btnRest = await bg(btn)
  await btn.tap()
  await page.waitForTimeout(400)
  const again = l.locator('[data-viz-part="viz-again"]')
  res.focusAfterActionTap = await activeInfo(page)
  res.backRest = (await again.count()) ? await bg(again) : null
  save('touch-375.json', res)
  await ctx.close()
})
