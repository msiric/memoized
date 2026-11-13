import { test, type Locator, type Page } from '@playwright/test'
import { EL, LK, activeInfo, answerStart, hydrateListKeys, openGallery, save } from './helpers'

/**
 * H0-C task 3: interaction and behaviour consistency. Facts only (no
 * assertions), written to interaction.json, so the findings table can quote
 * exact values: tab order, keyboard map, focus after every action, focus-ring
 * and hover/press styles of equivalent controls, segmented switchers,
 * checkpoint flow and live-region announcements.
 */

const out: Record<string, unknown> = {}
test.afterAll(() => save('interaction.json', out))
test.describe.configure({ mode: 'serial' })

/** Counts live-region text changes and keeps their texts. */
async function watchLive(page: Page) {
  await page.evaluate(() => {
    const w = window as any
    w.__live = []
    w.__liveObs?.disconnect()
    w.__liveObs = new MutationObserver(() => {
      for (const el of document.querySelectorAll('[role="status"]')) {
        const viz = el.closest('[data-viz]')?.getAttribute('data-viz')
        const text = el.textContent ?? ''
        const last = w.__live.filter((l: any) => l.viz === viz).pop()
        if (!last || last.text !== text) w.__live.push({ viz, text: text.slice(0, 120), t: Math.round(performance.now()) })
      }
    })
    for (const el of document.querySelectorAll('[role="status"]'))
      w.__liveObs.observe(el, { childList: true, characterData: true, subtree: true })
  })
}
const takeLive = (page: Page) =>
  page.evaluate(() => {
    const w = window as any
    const all = w.__live as { viz: string; text: string }[]
    w.__seen = w.__seen ?? {}
    const fresh = all.filter((l) => w.__seen[l.viz] !== l.text || all.indexOf(l) > 0)
    for (const l of all) w.__seen[l.viz] = l.text
    all.splice(0)
    return fresh
  })

async function ring(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement
    if (!a) return null
    // The ring may be drawn on the element, a descendant (scrubber thumb, segment) or an ancestor (card label).
    const cands = [a, ...a.querySelectorAll('*'), a.parentElement, a.closest('label')].filter(Boolean) as Element[]
    for (const el of cands) {
      const cs = getComputedStyle(el)
      const transparent = /rgba\([^)]*,\s*0\)$/.test(cs.outlineColor) || cs.outlineColor === 'transparent'
      if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !transparent)
        return {
          on: el === a ? 'self' : el.tagName.toLowerCase() + '.' + (el.getAttribute('class') ?? '').split(' ')[0],
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          color: cs.outlineColor,
          offset: cs.outlineOffset,
          radius: cs.borderRadius,
        }
    }
    return { on: 'none' }
  })
}

async function styleOf(l: Locator, inner?: string) {
  return l.evaluate((el, sel) => {
    const t = (sel ? el.querySelector(sel) : el) as HTMLElement
    const cs = getComputedStyle(t)
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      border: cs.borderTopColor,
      deco: cs.textDecorationColor,
      transform: cs.transform,
      opacity: cs.opacity,
      transition: `${cs.transitionProperty} ${cs.transitionDuration} ${cs.transitionTimingFunction}`.slice(0, 120),
    }
  }, inner)
}

async function feedback(page: Page, l: Locator, inner?: string) {
  await page.mouse.move(0, 0)
  await page.waitForTimeout(150)
  const rest = await styleOf(l, inner)
  await l.hover()
  await page.waitForTimeout(150)
  const hover = await styleOf(l, inner)
  await page.mouse.down()
  await page.waitForTimeout(80)
  const press = await styleOf(l, inner)
  // Release outside so nothing activates.
  await page.mouse.move(0, 0)
  await page.mouse.up()
  const diff = (a: Record<string, string>, b: Record<string, string>) =>
    Object.fromEntries(Object.entries(b).filter(([k, v]) => a[k] !== v && k !== 'transition'))
  return { rest, hoverDelta: diff(rest, hover), pressDelta: diff(hover, press) }
}

test('tab order and focus ring', async ({ page }) => {
  test.setTimeout(120_000)
  await openGallery(page)
  await hydrateListKeys(page)
  const order = async (start: string, n: number) => {
    await page.locator(start).focus()
    const seq: unknown[] = []
    for (let i = 0; i < n; i++) {
      await page.keyboard.press('Tab')
      seq.push({ el: await activeInfo(page), ring: await ring(page) })
    }
    return seq
  }
  // Start from the paragraph links before each visual: focus the title's previous focusable via body.
  await page.evaluate(() => {
    const p = document.querySelector('[data-viz="event-loop"]')!.previousElementSibling as HTMLElement
    p.setAttribute('tabindex', '-1')
    p.id = 'before-el'
    const q = document.querySelector('[data-viz="list-keys"]')!.previousElementSibling as HTMLElement
    q.setAttribute('tabindex', '-1')
    q.id = 'before-lk'
  })
  out.tabOrderEventLoop = await order('#before-el', 5)
  out.tabOrderListKeys = await order('#before-lk', 14)
  // Event loop at an open checkpoint.
  await page.locator(EL).getByRole('slider').focus()
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  out.checkpointMode = await page.locator(EL).getAttribute('data-viz-mode')
  out.tabOrderEventLoopAtCheckpoint = await order('#before-el', 6)
})

test('event-loop keyboard map and focus', async ({ page }) => {
  test.setTimeout(180_000)
  await openGallery(page, { query: '?preset=basic-ordering' })
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  await watchLive(page)
  const slider = f.getByRole('slider')
  const st = async () => ({
    step: await f.getAttribute('data-viz-step'),
    mode: await f.getAttribute('data-viz-mode'),
    play: await f.locator('button[aria-keyshortcuts="Space K"]').getAttribute('aria-label'),
    focus: await activeInfo(page),
    scrollY: await page.evaluate(() => window.scrollY),
  })
  const keys: Record<string, unknown> = {}
  await slider.focus()
  for (const k of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'End', 'Home', 'k', 'Escape', ' ', 'Escape']) {
    const before = await st()
    await page.keyboard.press(k)
    await page.waitForTimeout(400)
    keys[`slider:${k}`] = { before, after: await st(), live: await takeLive(page) }
  }
  // Shortcuts after clicking a button (focus on a tabindex=-1 button).
  await slider.focus()
  await answerStart(page)
  await f.getByRole('button', { name: 'Next' }).click()
  await page.waitForTimeout(400)
  keys['afterClickNext'] = await st()
  await takeLive(page)
  {
    const before = await st()
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(400)
    keys['nextButtonFocused:ArrowRight'] = { before, after: await st(), live: await takeLive(page) }
  }
  {
    const before = await st()
    await page.keyboard.press(' ')
    await page.waitForTimeout(300)
    const mid = await st()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    keys['nextButtonFocused:Space'] = { before, after: mid, afterEsc: await st(), live: await takeLive(page) }
  }
  {
    const before = await st()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(400)
    keys['nextButtonFocused:Enter'] = { before, after: await st(), live: await takeLive(page) }
  }
  out.eventLoopKeys = keys

  // Checkpoint flow.
  const flow: Record<string, unknown> = {}
  await slider.focus()
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  await answerStart(page)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  await takeLive(page)
  flow.atAsk = await st()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  flow.arrowRightAtAsk = { ...(await st()), live: await takeLive(page) }
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(200)
  flow.arrowDownInChoices = await st()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  flow.enterOnChoice = { ...(await st()), feedback: await f.locator('[data-viz-part="viz-feedback"]').textContent(), live: await takeLive(page) }
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(400)
  flow.backFromReveal = { ...(await st()), live: await takeLive(page) }
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(400)
  flow.nextAgainAfterAnswered = { ...(await st()), live: await takeLive(page) }
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  await answerStart(page)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  flow.afterRestartAsk = {
    ...(await st()),
    badges: await f.locator('[role="radiogroup"] [role="radio"]').evaluateAll((els) => els.map((e) => e.textContent)),
  }
  // Click Next to reach the checkpoint: focus must hand over to the first choice.
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(400)
  await f.getByRole('button', { name: 'Next' }).click()
  await page.waitForTimeout(400)
  flow.clickNextIntoAsk = await st()
  await f.locator('[data-viz-part="viz-skip"]').click()
  await page.waitForTimeout(400)
  flow.skip = { ...(await st()), feedback: await f.locator('[data-viz-part="viz-feedback"]').textContent(), live: await takeLive(page) }
  // Back from ask with the Back button.
  await page.keyboard.press('Home')
  await page.waitForTimeout(300)
  await answerStart(page)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(350)
  }
  await page.keyboard.press('ArrowRight') // focus to choice
  await page.waitForTimeout(200)
  await page.keyboard.press('ArrowLeft') // inside choices: own keys
  await page.waitForTimeout(200)
  flow.arrowLeftInsideChoices = await st()
  await f.getByRole('button', { name: 'Back' }).click()
  await page.waitForTimeout(400)
  flow.backButtonFromAsk = await st()
  // Number key from the slider at the checkpoint.
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(400)
  await page.keyboard.press('1')
  await page.waitForTimeout(400)
  flow.digitAnswer = { ...(await st()), live: await takeLive(page) }
  out.eventLoopCheckpointFlow = flow

  // Burst narration: how many live updates for 5 quick presses.
  await page.keyboard.press('Home')
  await page.waitForTimeout(400)
  await takeLive(page)
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(40)
  }
  await page.waitForTimeout(500)
  out.burstLive = await takeLive(page)

  // Preset switcher: keyboard and focus.
  const radios = f.getByRole('radiogroup', { name: 'Example' }).getByRole('radio')
  await radios.first().focus()
  const presetKeys: Record<string, unknown> = {}
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'Home', 'End', ' ']) {
    await page.keyboard.press(k)
    await page.waitForTimeout(250)
    presetKeys[`${Object.keys(presetKeys).length}:${k}`] = {
      preset: await f.getAttribute('data-viz-preset'),
      step: await f.getAttribute('data-viz-step'),
      focus: await activeInfo(page),
      tabindex: await radios.evaluateAll((els) => els.map((e) => e.getAttribute('tabindex'))),
    }
  }
  out.eventLoopPresetKeys = presetKeys
})

test('list-keys keyboard, focus and checkpoint flow', async ({ page }) => {
  test.setTimeout(180_000)
  await openGallery(page)
  await hydrateListKeys(page)
  const f = page.locator(LK)
  await watchLive(page)
  const st = async () => ({
    mode: await f.getAttribute('data-viz-mode'),
    key: await f.getAttribute('data-viz-key'),
    scene: await f.getAttribute('data-viz-scene'),
    focus: await activeInfo(page),
  })
  const flow: Record<string, unknown> = {}
  flow.initial = await st()
  await f.locator('[data-choice-index="0"]').focus()
  await page.keyboard.press('ArrowRight')
  flow.arrowInChoices = await st()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  flow.enterAnswer = { ...(await st()), live: await takeLive(page) }
  for (const k of ['ArrowRight', 'ArrowLeft', ' ', 'Home', 'Escape']) {
    await page.keyboard.press(k)
    await page.waitForTimeout(200)
    flow[`reveal:${k}`] = await st()
  }
  await page.keyboard.press('Enter') // Try another action
  await page.waitForTimeout(400)
  flow.again = { ...(await st()), live: await takeLive(page) }
  await page.keyboard.press('Enter') // the focused action
  await page.waitForTimeout(400)
  flow.applyByEnter = { ...(await st()), live: await takeLive(page) }
  flow.lastTimeBadge = await f.locator('[data-viz-part="choices"] [role="radio"]').evaluateAll((els) => els.map((e) => e.textContent))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  flow.escapeInAsk = { ...(await st()), live: await takeLive(page) }
  // Digit answer while focus is on the key switcher (not replaced): does focus move?
  const toPick = async () => {
    const mode = await f.getAttribute('data-viz-mode')
    if (mode === 'reveal') await f.locator('[data-viz-part="viz-again"]').click()
    await page.waitForTimeout(300)
  }
  await toPick()
  await f.locator('[data-viz-focus=\"action-insert-top\"]').click()
  await page.waitForTimeout(300)
  await f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { checked: true }).focus()
  await page.keyboard.press('1')
  await page.waitForTimeout(400)
  flow.digitWhileOnKeySwitcher = await st()
  // Key switch in reveal re-asks.
  await f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { checked: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  flow.keyArrowInReveal = { ...(await st()), live: await takeLive(page) }
  const keyRadios = f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio')
  flow.keyTabindex = await keyRadios.evaluateAll((els) => els.map((e) => e.getAttribute('tabindex')))
  // No checks: apply goes to "Show me".
  await f.locator('input[type="checkbox"]').first().uncheck()
  await page.waitForTimeout(300)
  await toPick()
  await f.locator('[data-viz-focus=\"action-append\"]').click()
  await page.waitForTimeout(300)
  flow.noCheckApply = { ...(await st()), live: await takeLive(page) }
  // Key strategy switch by keyboard (the wrapper scene is its own preset, D17).
  await toPick()
  await f.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { checked: true }).focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  flow.keyArrow = { ...(await st()), live: await takeLive(page) }
  await page.keyboard.press('End')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(300)
  flow.keyArrowWrap = await st()
  out.listKeysFlow = flow
})

test('hover, press and focus styles of equivalent controls', async ({ page }) => {
  test.setTimeout(180_000)
  await openGallery(page)
  await hydrateListKeys(page)
  const el = page.locator(EL)
  const lk = page.locator(LK)
  await el.scrollIntoViewIfNeeded()
  const r: Record<string, unknown> = {}
  r['el:Back(secondary)'] = await (async () => {
    await el.getByRole('slider').focus()
    await answerStart(page)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    return feedback(page, el.getByRole('button', { name: 'Back' }))
  })()
  r['el:Next(primary)'] = await feedback(page, el.getByRole('button', { name: 'Next' }))
  r['el:preset segment (unselected)'] = await feedback(page, el.getByRole('radio', { name: 'Drain' }), 'span')
  r['el:Steps as text'] = await feedback(page, el.locator('summary'))
  await lk.scrollIntoViewIfNeeded()
  r['lk:key segment (unselected)'] = await feedback(page, lk.getByRole('radio', { name: 'Id' }), 'span')
  r['lk:choice row'] = await feedback(page, lk.locator('[data-choice-index="0"]'))
  r['lk:Skip (quiet)'] = await feedback(page, lk.locator('[data-viz-part="viz-skip"]'))
  r['lk:Outcomes as text'] = await feedback(page, lk.locator('summary'))
  await page.waitForTimeout(300)
  r['lk:action (secondary)'] = await feedback(page, lk.locator('[data-viz-focus=\"action-append\"]'))
  r['lk:Before card'] = await feedback(page, lk.locator('[data-row="before-0"] label'))
  // Event-loop checkpoint choice row.
  await el.scrollIntoViewIfNeeded()
  await el.getByRole('slider').focus()
  await page.keyboard.press('Home')
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
  }
  r['el:choice row'] = await feedback(page, el.locator('[data-choice]').first())
  r['el:Skip (quiet)'] = await feedback(page, el.locator('[data-viz-part="viz-skip"]'))
  out.feedback = r

  // Keyboard focus rings on equivalent controls.
  const rings: Record<string, unknown> = {}
  const focusRing = async (name: string, l: Locator) => {
    await l.focus()
    // Focus by keyboard so :focus-visible applies.
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    rings[name] = { el: await activeInfo(page), ring: await ring(page) }
  }
  await focusRing('el:slider', el.getByRole('slider'))
  await focusRing('el:preset', el.getByRole('radio', { checked: true }))
  await focusRing('el:choice', el.locator('[data-choice]').first())
  await focusRing('el:summary', el.locator('summary'))
  await focusRing('lk:key', lk.getByRole('radiogroup', { name: 'Key strategy' }).getByRole('radio', { checked: true }))
  await focusRing('lk:checkbox', lk.locator('input[type="checkbox"]').first())
  await focusRing('lk:action', lk.locator('[data-viz-focus=\"action-append\"]'))
  await focusRing('lk:summary', lk.locator('summary'))
  out.rings = rings
})

test('touch at 375', async ({ browser }) => {
  test.setTimeout(180_000)
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, baseURL: 'http://localhost:3100' })
  const page = await ctx.newPage()
  await page.goto('/dev/visualizations')
  const f = page.locator(EL)
  await f.scrollIntoViewIfNeeded()
  await page.locator(`${EL}[data-viz-interactive="true"]`).waitFor()
  const t: Record<string, unknown> = {}
  const slider = f.getByRole('slider')
  t.sliderTouchAction = await slider.evaluate((e) => getComputedStyle(e).touchAction)
  t.sliderBox = await slider.boundingBox()
  t.barSticky = await f.locator('[data-viz-region="bar"]').evaluate((e) => getComputedStyle(e).position)
  // A vertical swipe that starts on the scrubber: does the page scroll, does the step change?
  const cdp = await ctx.newCDPSession(page)
  const swipe = async (x: number, y0: number, y1: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] })
    for (let i = 1; i <= 8; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 8 }] })
      await page.waitForTimeout(16)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(500)
  }
  // Bring the frame's bar on screen.
  await slider.scrollIntoViewIfNeeded()
  const b = (await slider.boundingBox())!
  const before = { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') }
  await swipe(b.x + b.width * 0.7, b.y + b.height / 2, b.y + b.height / 2 - 200)
  t.swipeUpFromScrubber = { before, after: { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') } }
  // Same swipe starting on the stage.
  const stage = (await f.locator('[data-viz-region="stage"]').boundingBox())!
  const b2 = { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') }
  await swipe(stage.x + stage.width / 2, Math.min(stage.y + stage.height / 2, 600), Math.min(stage.y + stage.height / 2, 600) - 200)
  t.swipeUpFromStage = { before: b2, after: { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') } }
  // Real touch scroll gestures (compositor-driven): from the scrubber and from the stage.
  const gesture = async (x: number, y: number) => {
    const before = { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') }
    await cdp.send('Input.synthesizeScrollGesture', { x, y, yDistance: -150, gestureSourceType: 'touch', speed: 600 })
    await page.waitForTimeout(500)
    return { before, after: { scrollY: await page.evaluate(() => window.scrollY), step: await f.getAttribute('data-viz-step') } }
  }
  await slider.scrollIntoViewIfNeeded()
  const sb = (await slider.boundingBox())!
  t.scrollGestureOnScrubber = await gesture(sb.x + sb.width * 0.3, sb.y + sb.height / 2)
  const st2 = (await f.locator('[data-viz-region="stage"]').boundingBox())!
  t.scrollGestureOnStage = await gesture(st2.x + st2.width / 2, Math.max(50, Math.min(st2.y + 100, 500)))
  // Tap Next: hover style stuck after tap?
  await answerStart(page)
  const next = f.getByRole('button', { name: 'Next' })
  await next.scrollIntoViewIfNeeded()
  const restBg = await next.evaluate((e) => getComputedStyle(e).backgroundColor)
  await next.tap()
  await page.waitForTimeout(400)
  t.nextAfterTap = { restBg, afterTapBg: await next.evaluate((e) => getComputedStyle(e).backgroundColor), focus: await activeInfo(page), step: await f.getAttribute('data-viz-step') }
  // Targets in the dock and header.
  t.targets = await f.evaluate((frame) =>
    [...frame.querySelectorAll('button, [role="slider"], summary, input')]
      .filter((e) => (e as HTMLElement).offsetParent !== null && getComputedStyle(e).visibility !== 'hidden')
      .map((e) => {
        const r = e.getBoundingClientRect()
        return { el: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }
      }),
  )
  out.touch = t
  await ctx.close()
})
