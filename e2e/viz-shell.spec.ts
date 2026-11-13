import { expect, test, type CDPSession, type Page } from '@playwright/test'

/**
 * The StepThrough shell (VIZ-H WS2), through the event-loop specimen: the
 * scrubber (F1, D12), instant paths (D7), mirrored Back (D8), the lift (D6),
 * the control row (D9), Play (D10), narration, focus, the measured dock (D15),
 * text zoom (D19) and the code window (F6). Run with `yarn test:e2e`.
 */

const GALLERY = '/dev/visualizations'
const mount = (page: Page) => page.locator('[data-viz="event-loop"]')
const frame = (page: Page) => mount(page).locator('section')
const slider = (page: Page) => frame(page).getByRole('slider')

async function open(page: Page, width: number, query = '', height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto(GALLERY + query)
  await expect(mount(page).locator('[data-viz-interactive="true"]')).toBeVisible()
}

const state = async (page: Page) => ({
  step: Number(await frame(page).getAttribute('data-viz-step')),
  mode: await frame(page).getAttribute('data-viz-mode'),
})

/** Walks with the keyboard (answering checkpoints with `answer`), waiting `ms` between steps. */
async function walkTo(page: Page, n: number, ms = 40, answer = '2') {
  await slider(page).focus()
  await page.keyboard.press('Home')
  for (let guard = 0; guard < 30; guard++) {
    const s = await state(page)
    if (s.step >= n) break
    await page.keyboard.press(s.mode === 'ask' ? answer : 'ArrowRight')
    await page.waitForTimeout(ms)
  }
}

/** Page x of step `n` on the scrubber, and its centre line. */
async function stepPoint(page: Page, n: number) {
  const rail = (await frame(page).locator('[data-viz-part="scrubber-rail"]').boundingBox())!
  const last = Number(await slider(page).getAttribute('aria-valuemax'))
  return { x: rail.x + (rail.width * n) / last, y: rail.y + rail.height / 2 }
}

/** Anything on the stage, dock or thumb still animating, and anything half-faded on the stage. */
async function residue(page: Page) {
  return page.evaluate(() => {
    const f = document.querySelector('[data-viz="event-loop"] section')!
    const watched = (el: Element | null) =>
      Boolean(
        el &&
          (el.closest('[data-viz-region="stage"], [data-viz-region="dock"]') ||
            el.closest('[data-viz-part="scrubber-thumb"]')),
      )
    const running = document
      .getAnimations()
      .filter((a) => a.playState === 'running' && watched((a.effect as KeyframeEffect | null)?.target ?? null))
      .map(
        (a) =>
          `${a.id || (a as CSSTransition).transitionProperty} on ${((a.effect as KeyframeEffect).target as Element).outerHTML.slice(0, 60)}`,
      )
    const partial = [...f.querySelectorAll('[data-viz-region="stage"] *, [data-viz-part="viz-caption"]')]
      .filter((el) => {
        const o = parseFloat(getComputedStyle(el).opacity)
        return o > 0.001 && o < 0.999
      })
      .map((el) => el.outerHTML.slice(0, 60))
    return { running, partial }
  })
}

const nextFrame = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))

let errors: string[] = []
test.beforeEach(({ page }) => {
  errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
})
test.afterEach(() => {
  expect(errors, 'no console errors or hydration warnings').toEqual([])
})

test.describe('scrubber on touch (D12, M18)', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } })

  async function touch(cdp: CDPSession, points: { x: number; y: number }[]) {
    const [first, ...rest] = points
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] })
    for (const p of rest) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const path = (from: { x: number; y: number }, dx: number, dy: number, n = 12) =>
    Array.from({ length: n + 1 }, (_, i) => ({ x: from.x + (dx * i) / n, y: from.y + (dy * i) / n }))

  test('a vertical swipe on the scrubber scrolls the page and never changes the step; a tap and a horizontal drag seek', async ({
    page,
  }) => {
    await page.goto(GALLERY)
    await expect(mount(page).locator('[data-viz-interactive="true"]')).toBeVisible()
    await walkTo(page, 2)
    // Put the scrubber in the middle of the viewport, with room to scroll both ways.
    await slider(page).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    const cdp = await page.context().newCDPSession(page)

    // Swipe up starting on a far tick (step 6): a tap there would seek.
    for (const dy of [-160, 160]) {
      const before = await page.evaluate(() => window.scrollY)
      const at = await stepPoint(page, 6)
      await touch(cdp, path(at, 3, dy))
      await page.waitForTimeout(400)
      expect((await state(page)).step, `swipe ${dy}: step unchanged`).toBe(2)
      expect(
        Math.abs((await page.evaluate(() => window.scrollY)) - before),
        `swipe ${dy}: page scrolled`,
      ).toBeGreaterThan(40)
      await slider(page).evaluate((el) => el.scrollIntoView({ block: 'center' }))
      await page.waitForTimeout(300)
    }

    // A tap seeks to the tapped step.
    const tap = await stepPoint(page, 4)
    await touch(cdp, [tap])
    await expect(frame(page)).toHaveAttribute('data-viz-step', '4')

    // A horizontal drag from the thumb seeks along.
    const from = await stepPoint(page, 4)
    const to = await stepPoint(page, 1)
    await touch(cdp, path(from, to.x - from.x, 4))
    await expect(frame(page)).toHaveAttribute('data-viz-step', '1')

    // No hover color stuck on a control after a tap (D11): Next returns to rest.
    const next = frame(page).getByTestId('viz-next')
    // Read rest once any press from the drag above has settled (R13: press is a 150 ms step).
    await page.waitForTimeout(300)
    const rest = await next.evaluate((el) => getComputedStyle(el).backgroundColor)
    const box = (await next.boundingBox())!
    await touch(cdp, [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }])
    await expect(frame(page)).toHaveAttribute('data-viz-step', '2')
    await page.waitForTimeout(400)
    expect(await next.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(rest)
  })
})

test('the scrubber never widens the page, at any width or step (F1)', async ({ page }) => {
  test.setTimeout(120_000)
  for (const width of [320, 375, 768, 1280]) {
    await open(page, width)
    for (const preset of ['Basics', 'Drain']) {
      await frame(page).getByRole('radio', { name: preset }).click()
      await slider(page).focus()
      await page.keyboard.press('Home')
      for (let guard = 0; guard < 12; guard++) {
        const where = `${preset} step ${(await state(page)).step} at ${width}`
        // Nothing in the controls bar reaches past the frame (the thumb's old
        // wrapper ran 530 px past it).
        const past = await frame(page).evaluate((el) => {
          const f = el.getBoundingClientRect()
          return [...el.querySelectorAll('[data-viz-region="bar"] *')]
            .map((n) => n.getBoundingClientRect())
            .filter((r) => r.width > 0 && (r.right > f.right + 0.5 || r.left < f.left - 0.5))
            .map((r) => `${Math.round(r.left)}..${Math.round(r.right)}`)
        })
        expect(past, where).toEqual([])
        // The page itself: Basics has no wide glyph (Drain's host chip at
        // narrow widths is engine finding F5, WS3).
        if (preset === 'Basics') {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
          expect(overflow, where).toBeLessThanOrEqual(0)
        }
        const s = await state(page)
        await page.keyboard.press(s.mode === 'ask' ? '1' : 'ArrowRight')
        if ((await state(page)).step === s.step && s.mode !== 'ask') break
      }
    }
  }
})

test('checkpoint diamonds sit on the step they gate; the thumb carries one; the tooltip names the step inside the slider (D12)', async ({
  page,
}) => {
  await open(page, 320)
  // Two, each on the step where its question is asked (R2 F-EL-04): the Start
  // prediction (judged at the end, R7) on Start, and the mid-run one on step 5.
  await expect(frame(page).locator('[data-checkpoint-step]')).toHaveCount(2)
  await expect(frame(page).locator('[data-checkpoint-step="0"]')).toHaveCount(1)
  const diamond = frame(page).locator('[data-checkpoint-step="5"]')
  const d = (await diamond.boundingBox())!
  const five = await stepPoint(page, 5)
  expect(Math.abs(d.x + d.width / 2 - five.x)).toBeLessThan(1)

  // Hovering the last step: the tooltip names it and stays inside the slider.
  await slider(page).evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const end = await stepPoint(page, 8)
  await page.mouse.move(end.x, end.y)
  const tip = frame(page).locator('[data-viz-part="scrubber-tip"]')
  await expect(tip).toHaveText('Step 8: Done')
  const t = (await tip.boundingBox())!
  const s = (await slider(page).boundingBox())!
  expect(t.x).toBeGreaterThanOrEqual(s.x - 0.5)
  expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width + 0.5)
  await page.mouse.move(0, 0)
  await expect(tip).toHaveCount(0)

  // On the checkpoint's step the thumb carries the diamond in its state.
  await walkTo(page, 6, 300, '1')
  await expect(frame(page)).toHaveAttribute('data-viz-step', '6')
  await page.keyboard.press('ArrowLeft')
  await expect(frame(page)).toHaveAttribute('data-viz-step', '5')
  await expect(frame(page).locator('[data-viz-part="scrubber-thumb"] [data-diamond="answered"]')).toHaveCount(1)
})

test('instant paths land everything in one frame, exits included (D7)', async ({ page }) => {
  test.setTimeout(120_000)
  await open(page, 1024, '?preset=basic-ordering')
  const paths: [string, () => Promise<unknown>][] = [
    ['scrub to 2', async () => page.mouse.click((await stepPoint(page, 2)).x, (await stepPoint(page, 2)).y)],
    ['Home', () => page.keyboard.press('Home')],
    ['End', () => page.keyboard.press('End')],
    ['Restart', () => frame(page).getByRole('button', { name: 'Restart' }).click()],
    ['preset switch', () => frame(page).getByRole('radio', { name: 'Drain' }).click()],
  ]
  for (const [name, act] of paths) {
    await frame(page).getByRole('radio', { name: 'Basics' }).click()
    await walkTo(page, 7, 450)
    // Start a transition (7 -> 6 removes a console line and moves the timer back), then cut it.
    await slider(page).focus()
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(260)
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(300)
    await page.keyboard.press('ArrowLeft')
    await slider(page).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(60)
    await act()
    await nextFrame(page)
    expect(await residue(page), name).toEqual({ running: [], partial: [] })
  }
})

test('Back is the mirror of Next: a console line rises in and sinks out (D8)', async ({ page }) => {
  await open(page, 1024, '?preset=basic-ordering')
  await walkTo(page, 3, 400)
  await page.waitForTimeout(400)
  const line = frame(page).locator('li[data-out="1"]')
  const sample = () =>
    line.evaluate((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
      return { y: m.m42, opacity: parseFloat(getComputedStyle(el).opacity) }
    })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(50)
  const entering = await sample()
  expect(entering.y, 'enters from below').toBeGreaterThan(0)
  expect(entering.opacity).toBeLessThan(1)
  await page.waitForTimeout(500)
  await page.keyboard.press('ArrowLeft')
  await page.waitForTimeout(50)
  const leaving = await sample()
  expect(leaving.y, 'leaves downward, the way it came').toBeGreaterThan(0)
  expect(leaving.opacity).toBeLessThan(1)
  await page.waitForTimeout(400)
  await expect(line).toHaveCount(0)
})

test('a glyph moving between regions renders above every lane, lifted, and lands flat (D6, M04)', async ({ page }) => {
  await open(page, 1024, '?preset=basic-ordering')
  await walkTo(page, 6, 400, '2')
  await page.waitForTimeout(400)
  // 6 -> 7: the timer leaves Tasks for the stack, upward across Microtasks and Host.
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(90)
  const mid = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('[data-viz="event-loop"] [data-flip-id="timer"]')!
    const r = node.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return { onTop: node.contains(hit), shadow: getComputedStyle(node).boxShadow, y: r.y }
  })
  expect(mid.onTop, 'the moving glyph is the topmost element at its centre').toBe(true)
  expect(mid.shadow).not.toBe('none')
  await page.waitForTimeout(400)
  const end = await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('[data-viz="event-loop"] [data-flip-id="timer"]')!
    const region = node.closest<HTMLElement>('[data-viz-region]')!
    return {
      shadow: getComputedStyle(node).boxShadow,
      z: node.style.zIndex,
      regionZ: region.style.zIndex,
      lane: region.dataset.vizRegion,
    }
  })
  expect(end).toEqual({ shadow: 'none', z: '', regionZ: '', lane: 'stack' })
})

test('the control row keeps its shape at a checkpoint and after it (D9); Play advances at once (D10)', async ({
  page,
}) => {
  await open(page, 375)
  const row = async () =>
    frame(page)
      .locator('[data-viz-region="bar"] button')
      .evaluateAll((bs) =>
        bs.map((b) => {
          const r = b.getBoundingClientRect()
          const cs = getComputedStyle(b)
          const y = Math.round(r.y + window.scrollY)
          return [
            b.getAttribute('aria-label'),
            Math.round(r.x),
            y,
            Math.round(r.width),
            cs.visibility,
            cs.display,
          ].join(' ')
        }),
      )
  const atStart = await row()
  await walkTo(page, 5, 40)
  expect((await state(page)).mode).toBe('ask')
  expect(await row()).toEqual(atStart)
  await expect(frame(page).getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true')
  await expect(frame(page).getByRole('button', { name: 'Play' })).toHaveAttribute('aria-disabled', 'true')
  await expect(
    frame(page).locator('[data-viz-region="dock"]').getByRole('button', { name: 'Skip, show me' }),
  ).toBeVisible()
  await page.keyboard.press('2')
  expect(await row()).toEqual(atStart)
  // The number slots became the marks.
  await expect(frame(page).locator('[data-choice="c"] [data-choice-slot="right"]')).toHaveText('✓')

  await page.keyboard.press('Home')
  // Start asks again (R7): lock a prediction in, then Play.
  await page.keyboard.press('2')
  await frame(page).getByRole('button', { name: 'Play' }).click()
  await expect(frame(page)).toHaveAttribute('data-viz-step', '1', { timeout: 300 })
  await page.keyboard.press('Escape')
})

test('focus: Next into a checkpoint hands it to the first choice, answering and Skip return it to the stepper', async ({
  page,
}) => {
  await open(page, 1024)
  await walkTo(page, 4, 40)
  await frame(page).getByRole('button', { name: 'Next' }).click()
  await expect(frame(page).locator('[data-choice]').first()).toBeFocused()
  await frame(page).locator('[data-choice]').nth(1).click()
  await expect(slider(page)).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('Home')
  await walkTo(page, 5, 40)
  await frame(page).getByRole('button', { name: 'Skip, show me' }).click()
  await expect(slider(page)).toBeFocused()
  expect(await frame(page).getAttribute('data-viz-mode')).toBe('reveal')
})

test('narration: one announcement once input settles, for the step it settles on', async ({ page }) => {
  await open(page, 1024)
  await slider(page).focus()
  const live = frame(page).getByTestId('viz-live')
  // Lock the Start prediction in (R7), and let its own announcement land first.
  await page.keyboard.press('2')
  await expect(live).toHaveText(/^Locked in: B\./)
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight', { delay: 0 })
  await expect(live).toHaveText(/^Locked in: B\./)
  await expect(live).toHaveText(/^Step 4 of 8\./)
})

test('the dock is exactly as tall as its tallest state at each width: no shift, no spare reserve (D15)', async ({
  page,
}) => {
  test.setTimeout(120_000)
  for (const width of [320, 375, 768, 1280]) {
    await open(page, width)
    const measure = () =>
      frame(page).evaluate((el) => {
        const h = (q: string) => el.querySelector(q)?.getBoundingClientRect().height ?? 0
        return {
          frame: Math.round(el.getBoundingClientRect().height),
          dock: Math.round(h('[data-viz-region="dock"]')),
          live: Math.round(Math.max(h('[data-viz-part="viz-caption"]'), h('[data-viz-part="viz-checkpoint"]'))),
        }
      })
    for (const preset of ['Basics', 'Drain']) {
      await frame(page).getByRole('radio', { name: preset }).click()
      await page.waitForTimeout(200)
      // Per preset (R2): the reserve is this preset's tallest state.
      const base = await measure()
      let tallest = 0
      await slider(page).focus()
      await page.keyboard.press('Home')
      for (const answer of ['1', '2']) {
        await page.keyboard.press('Home')
        for (let guard = 0; guard < 12; guard++) {
          const m = await measure()
          expect(m.frame, `${preset} at ${width}`).toBe(base.frame)
          expect(m.dock, `${preset} at ${width}`).toBe(base.dock)
          tallest = Math.max(tallest, m.live)
          const s = await state(page)
          await page.keyboard.press(s.mode === 'ask' ? answer : 'ArrowRight')
          if ((await state(page)).step === s.step && s.mode !== 'ask') break
        }
      }
      // Skipped feedback too.
      await page.keyboard.press('Home')
      await walkTo(page, preset === 'Basics' ? 5 : 6)
      await frame(page).getByRole('button', { name: 'Skip, show me' }).click()
      tallest = Math.max(tallest, (await measure()).live)
      expect(tallest, `the reserve for ${preset} at ${width} is its tallest state`).toBe(base.dock)
    }
  }
})

test('text zoom 150 % and 200 %: shell geometry scales with the root font size (D19)', async ({ page }) => {
  for (const zoom of [1, 1.5, 2]) {
    await open(page, 1280)
    await page.addStyleTag({ content: `html { font-size: ${zoom * 100}% !important }` })
    await page.waitForTimeout(200)
    const g = await frame(page).evaluate((el) => {
      const h = (q: string) => el.querySelector(q)!.getBoundingClientRect().height
      return {
        slider: h('[role="slider"]'),
        stepbar: h('[data-viz-region="stepbar"]'),
        thumb: h('[data-viz-part="scrubber-thumb"]'),
      }
    })
    // The button row may wrap to a second row under large text; the targets keep their size.
    expect(g.slider).toBeCloseTo(44 * zoom, 0)
    // The step's name, 14/24 (R3).
    expect(g.stepbar).toBeCloseTo(24 * zoom, 0)
    expect(g.thumb).toBeCloseTo(28 * zoom, 0)
    // The shell's own regions stay inside the frame (the stage's content at
    // 200 % is the engines' part of D19, WS3).
    const past = await frame(page).evaluate((el) => {
      const f = el.getBoundingClientRect()
      const shell =
        '[data-viz-region="stepbar"] *, [data-viz-region="dock"] *, [data-viz-region="bar"] *, header *, footer summary, footer summary *, footer > p'
      return [...el.querySelectorAll(shell)]
        .filter((n) => getComputedStyle(n).visibility !== 'hidden')
        .map((n) => [n, n.getBoundingClientRect()] as const)
        .filter(
          ([, r]) => r.width > 0 && (r.right > f.right + 0.5 || r.left < f.left - 0.5 || r.bottom > f.bottom + 0.5),
        )
        .map(([n, r]) => `${n.tagName} ${Math.round(r.left)}..${Math.round(r.right)}`)
    })
    expect(past, `shell regions inside the frame at ${zoom * 100} %`).toEqual([])
  }
})

test('a windowed code pane shows whole rows only, never a sliver of the previous line (F6)', async ({ page }) => {
  await open(page, 375, '?preset=microtask-queued-during-drain')
  await frame(page).getByRole('radio', { name: 'Drain' }).click()
  for (let n = 0; n <= 7; n++) {
    await walkTo(page, n, 40, '1')
    await page.waitForTimeout(250)
    const slivers = await frame(page).evaluate((el) => {
      const win = el.querySelector('[data-viz-part="code-window"]')!.getBoundingClientRect()
      return [...el.querySelectorAll('[data-viz-region="code"] li')]
        .map((li) => li.getBoundingClientRect())
        .filter((r) => r.bottom > win.top + 0.5 && r.top < win.bottom - 0.5)
        .filter((r) => r.top < win.top - 0.5 || r.bottom > win.bottom + 0.5)
        .map(
          (r) => `${Math.round(r.top)}..${Math.round(r.bottom)} vs ${Math.round(win.top)}..${Math.round(win.bottom)}`,
        )
    })
    expect(slivers, `step ${n}`).toEqual([])
  }
})
