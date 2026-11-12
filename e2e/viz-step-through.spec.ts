import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * The event-loop specimen on /dev/visualizations, through the real `<Viz>`
 * mount (VIZ-01 spec §7: interaction, layout stability, accessibility,
 * reduced motion, visual review). Run with `yarn test:e2e`.
 */

const GALLERY = '/dev/visualizations'
const WIDTHS = [320, 375, 768, 1024, 1440] as const
// entry-table.ts: the client-only placeholder's estimate, an upper bound. The
// live dock is measured (a ghost stack, D15), so the frame is at most this tall.
const FOOTPRINT = { narrow: 900, wide: 732 }

const mount = (page: Page) => page.locator('[data-viz="event-loop"]')
const frame = (page: Page) => mount(page).locator('section')
const slider = (page: Page) => frame(page).getByRole('slider')

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

async function open(page: Page, width: number, query = '', height = 900) {
  await page.setViewportSize({ width, height })
  await page.goto(GALLERY + query)
  await expect(
    mount(page).locator('[data-viz-interactive="true"]'),
  ).toBeVisible()
}

async function state(page: Page) {
  const f = frame(page)
  return {
    step: await f.getAttribute('data-viz-step'),
    mode: await f.getAttribute('data-viz-mode'),
  }
}

async function focusIsInFrame(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement
    return Boolean(
      a && a !== document.body && a.closest('[data-viz="event-loop"]'),
    )
  })
}

/** Page-relative boxes of the frame, its regions and the paragraph after it. */
async function layoutSnapshot(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-viz="event-loop"]')!
    const els: [string, Element | null][] = [
      ['frame', root.querySelector('section')],
      ...[
        'stage',
        'stepbar',
        'dock',
        'bar',
        'code',
        'stack',
        'host',
        'micro',
        'tasks',
        'console',
      ].map(
        (r) =>
          [r, root.querySelector(`[data-viz-region="${r}"]`)] as [
            string,
            Element | null,
          ],
      ),
      ['after', root.nextElementSibling],
    ]
    return Object.fromEntries(
      els.map(([k, el]) => {
        const r = el!.getBoundingClientRect()
        const y = Math.round(r.y + window.scrollY)
        // The code pane hugs each preset's code inside the fixed stage; only
        // its position and width must hold. From 768 the console fills the
        // left column under it (D16), so it holds its column and its bottom.
        if (k === 'console')
          return [
            k,
            [
              Math.round(r.x),
              Math.round(r.bottom + window.scrollY),
              Math.round(r.width),
              0,
            ],
          ]
        const h = k === 'code' ? 0 : Math.round(r.height)
        return [k, [Math.round(r.x), y, Math.round(r.width), h]]
      }),
    )
  })
}

async function stepTo(page: Page, n: number) {
  await slider(page).focus()
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(40)
  }
}

test('loads paused at Start and stays paused (no autoplay, A1)', async ({
  page,
}) => {
  await page.clock.install()
  await open(page, 1024)
  await page.clock.fastForward(10_000)
  expect(await state(page)).toEqual({ step: '0', mode: 'controls' })
  await expect(frame(page).getByRole('button', { name: 'Play' })).toBeVisible()
})

test('keyboard-only walkthrough (tab order, every key, focus never lost)', async ({
  page,
}) => {
  await open(page, 1024)
  const f = frame(page)

  // Tab stops: preset, stepper, steps-as-text. Buttons are not stops.
  await page.locator('h1').first().click()
  await page.keyboard.press('Tab')
  await expect(f.getByRole('radio', { name: 'Basics' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(slider(page)).toBeFocused()
  // The floating key hint is cut (VIZ-H D22): the shortcuts live in aria-keyshortcuts.
  await expect(f.getByText('← → to step')).toHaveCount(0)
  // Focus shows on the thumb (2 px ring, offset 2), not as a box around the track.
  const ring = await slider(page).evaluate((el) => ({
    track: getComputedStyle(el).outlineColor,
    thumb: getComputedStyle(el.querySelector('.rounded-full')!).outlineWidth,
  }))
  expect(ring).toEqual({ track: 'rgba(0, 0, 0, 0)', thumb: '2px' })
  await page.keyboard.press('Tab')
  await expect(f.locator('summary')).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(slider(page)).toBeFocused()

  // → and ↑ advance, ← and ↓ go back.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  expect((await state(page)).step).toBe('2')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowLeft')
  expect((await state(page)).step).toBe('0')

  // Reach the checkpoint: the question is asked, focus stays on the stepper.
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  expect(await state(page)).toEqual({ step: '5', mode: 'ask' })
  await expect(slider(page)).toBeFocused()
  await expect(f.getByTestId('viz-live')).toContainText(
    'Checkpoint: D has logged. What logs next?',
  )

  // → moves focus to the first choice; arrows move between choices; Enter commits.
  await page.keyboard.press('ArrowRight')
  const choices = f
    .getByRole('radiogroup', { name: 'D has logged. What logs next?' })
    .getByRole('radio')
  await expect(choices.first()).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(choices.nth(1)).toBeFocused()
  await page.keyboard.press('Enter')
  expect(await state(page)).toEqual({ step: '6', mode: 'reveal' })
  await expect(f.getByTestId('viz-feedback')).toContainText('Right.')
  await expect(slider(page)).toBeFocused()

  // Finish: the console holds the verified order.
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight')
  await expect(f.getByTestId('viz-counter')).toHaveText('8 / 8')
  await expect(f.locator('[data-viz-region="console"] li')).toHaveText([
    // One left-to-right strip in log order: the position is the order (D16).
    '›A',
    '›D',
    '›C',
    '›B',
  ])

  // Home restarts and re-asks with memory; End skips the open checkpoint.
  await page.keyboard.press('Home')
  expect((await state(page)).step).toBe('0')
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(f.locator('[data-choice="c"]')).toContainText('last time')
  await page.keyboard.press('Home')
  await page.keyboard.press('End')
  expect((await state(page)).step).toBe('8')
  await expect(f.locator('[data-checkpoint]')).toHaveAttribute(
    'data-checkpoint',
    'skipped',
  )

  // Space and K toggle play; Escape pauses without resetting.
  await page.keyboard.press('Home')
  await page.keyboard.press('Space')
  await expect(f.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(f.getByRole('button', { name: 'Play' })).toBeVisible()
  await page.keyboard.press('k')
  await expect(f.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.keyboard.press('k')

  // Digits answer an open checkpoint.
  await page.keyboard.press('Home')
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('1')
  await expect(f.getByTestId('viz-feedback')).toContainText('Not quite.')
  expect(await focusIsInFrame(page)).toBe(true)

  // Shortcuts keep working after a button is clicked.
  await f.getByRole('button', { name: 'Next' }).click()
  await page.keyboard.press('ArrowRight')
  expect((await state(page)).step).toBe('8')
  expect(await focusIsInFrame(page)).toBe(true)
})

/** The segmented control a target belongs to, if it is a segment. */
const segmentGroup = (t: Locator) =>
  t.evaluate((el) =>
    el.hasAttribute('data-segment')
      ? (el.closest('[role="radiogroup"]')?.getAttribute('aria-label') ?? null)
      : null,
  )

test('touch targets are at least 44×44 with 8 px between them (A5)', async ({
  page,
}) => {
  for (const width of [320, 375, 1024]) {
    await open(page, width, '', 1200)
    const check = async (where: string) => {
      const targets = frame(page).locator('button, [role="slider"], summary')
      const boxes: {
        name: string
        x: number
        y: number
        w: number
        h: number
        seg: string | null
      }[] = []
      for (const t of await targets.all()) {
        if (!(await t.isVisible())) continue
        const b = (await t.boundingBox())!
        const name =
          (await t.getAttribute('aria-label')) ?? (await t.innerText())
        expect(
          b.width,
          `${where} ${width}: ${name} width`,
        ).toBeGreaterThanOrEqual(44)
        expect(
          b.height,
          `${where} ${width}: ${name} height`,
        ).toBeGreaterThanOrEqual(44)
        boxes.push({
          name,
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          seg: await segmentGroup(t),
        })
      }
      for (const a of boxes)
        for (const b of boxes) {
          // Segments of one segmented control touch, as in the platform's
          // LessonStatus control (VIZ-H D2); each is still a 44 px target.
          if (a === b || (a.seg && a.seg === b.seg)) continue
          const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
          const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
          expect(
            Math.max(dx, dy),
            `${where} ${width}: ${a.name} / ${b.name} spacing`,
          ).toBeGreaterThanOrEqual(7.5)
        }
    }
    await check('start')
    await stepTo(page, 5)
    await check('checkpoint')
  }
})

test('reduced motion: no translation, information unchanged (A4)', async ({
  page,
}) => {
  const sample = async () => {
    await stepTo(page, 0)
    await slider(page).press('ArrowRight')
    await page.waitForTimeout(40)
    return page.evaluate(() => {
      const chip = document.querySelector<HTMLElement>(
        '[data-viz="event-loop"] [data-glyph="script"]',
      )!
      return {
        transform: getComputedStyle(chip).transform,
        focused: chip.querySelector('[data-focus]') !== null,
      }
    })
  }
  await open(page, 1024)
  const full = await sample()
  expect(
    full.transform,
    'full motion translates the entering frame',
  ).not.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 1024)
  const reduced = await sample()
  expect(reduced.transform).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
  expect(reduced.focused, 'the `now` highlight still shows').toBe(true)
  const codeTransition = await frame(page)
    .locator('[data-viz-region="code"] li')
    .first()
    .evaluate((el) =>
      getComputedStyle(el)
        .transitionDuration.split(',')
        .every((d) => parseFloat(d) === 0),
    )
  expect(codeTransition, 'code-line highlight is instant').toBe(true)
})

test('a callback that changes region slides there with the move spring (none under reduced motion)', async ({
  page,
}) => {
  const moveAfterStep5 = async () => {
    await stepTo(page, 4)
    await page.waitForTimeout(400)
    await slider(page).press('ArrowRight')
    await page.waitForTimeout(30)
    return page.evaluate(() => {
      const el = document.querySelector<HTMLElement>(
        '[data-viz="event-loop"] [data-flip-id="timer"]',
      )!
      const moving = el.getAnimations().filter((a) => a.id === 'viz-move')
      return {
        moving: moving.length,
        lane: el.closest('[data-viz-region]')!.getAttribute('data-viz-region'),
      }
    })
  }
  await open(page, 1024)
  expect(await moveAfterStep5()).toEqual({ moving: 1, lane: 'tasks' })
  await page.waitForTimeout(400)
  expect(
    await page.evaluate(
      () =>
        document.querySelector('[data-flip-id="timer"]')!.getAnimations()
          .length,
    ),
  ).toBe(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, 1024)
  expect(await moveAfterStep5()).toEqual({ moving: 0, lane: 'tasks' })
})

test('interrupting a transition lands on the next end state within one frame', async ({
  page,
}) => {
  await open(page, 1024)
  await slider(page).focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(30)
  await page.keyboard.press('ArrowRight')
  const settled = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            const chips = [
              ...document.querySelectorAll(
                '[data-viz="event-loop"] [data-glyph], [data-viz="event-loop"] [data-out]',
              ),
            ]
            resolve(
              chips.every((c) => {
                const s = getComputedStyle(c)
                return (
                  Number(s.opacity) === 1 &&
                  /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(s.transform)
                )
              }),
            )
          }),
        ),
      ),
  )
  expect((await state(page)).step).toBe('2')
  expect(settled).toBe(true)
})

test('the frame never moves: stepping, checkpoint, preset switch, bursts and play', async ({
  page,
}) => {
  test.setTimeout(120_000)
  for (const width of [375, 1024]) {
    await open(page, width)
    await page.evaluate(() => {
      ;(window as unknown as { __shifts: number }).__shifts = 0
      // CLS semantics: shifts within 500 ms of input are expected and excluded.
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as {
          value: number
          hadRecentInput: boolean
        }[])
          if (!e.hadRecentInput)
            (window as unknown as { __shifts: number }).__shifts += e.value
      }).observe({ type: 'layout-shift' })
    })
    const base = await layoutSnapshot(page)
    expect(base.frame[3], `frame height at ${width}`).toBeLessThanOrEqual(
      width < 768 ? FOOTPRINT.narrow : FOOTPRINT.wide,
    )
    const same = async (label: string) => {
      await page.waitForTimeout(350)
      expect(await layoutSnapshot(page), `${label} at ${width}`).toEqual(base)
    }
    await slider(page).focus()
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
      await same(`step ${i + 1}`)
    }
    await page.keyboard.press('2')
    await same('reveal')
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowRight')
      await same(`step ${7 + i}`)
    }
    await frame(page).getByRole('radio', { name: 'Drain' }).click()
    await same('preset switch')
    const next = frame(page).getByTestId('viz-next')
    for (let i = 0; i < 5; i++) await next.click({ delay: 0 })
    await same('click burst')
    await page.keyboard.press('2')
    await slider(page).focus()
    for (let i = 0; i < 10; i++)
      await page.keyboard.press('ArrowRight', { delay: 0 })
    await same('10-key burst')
    await frame(page).getByRole('button', { name: 'Restart' }).click()
    await frame(page).getByRole('button', { name: 'Play' }).click()
    await page.waitForTimeout(3_500)
    await same('playing')
    const shifts = await page.evaluate(
      () => (window as unknown as { __shifts: number }).__shifts,
    )
    expect(shifts, 'cumulative layout shift').toBe(0)
  }
})

test('nothing overflows its reserved box at any width or step', async ({
  page,
}) => {
  test.setTimeout(180_000)
  for (const width of WIDTHS) {
    await open(page, width)
    for (const preset of ['Basics', 'Drain']) {
      await frame(page).getByRole('radio', { name: preset }).click()
      await slider(page).focus()
      for (let i = 0; i < 10; i++) {
        await page.waitForTimeout(350) // measure settled states
        const problems = await page.evaluate(() => {
          const root = document.querySelector(
            '[data-viz="event-loop"] section',
          )!
          const out: string[] = []
          for (const el of root.querySelectorAll<HTMLElement>(
            '[data-viz-region], [data-viz-part="viz-caption"], [data-viz-part="viz-feedback"], [data-viz-part="viz-prompt"]',
          )) {
            // The code pane is a window by design; its current line must be inside it.
            if (el.dataset.vizRegion === 'code') continue
            if (el.scrollHeight > el.clientHeight + 1)
              out.push(
                `${el.dataset.vizRegion ?? el.dataset.vizPart} clips vertically`,
              )
          }
          for (const p of root.querySelectorAll<HTMLElement>(
            '[data-viz-part="viz-caption"], [data-viz-part="viz-feedback"], [data-viz-part="viz-prompt"]',
          )) {
            const slot = p.parentElement!.getBoundingClientRect()
            if (p.getBoundingClientRect().bottom > slot.bottom + 1)
              out.push(`${p.dataset.vizPart} taller than its slot`)
          }
          const pane = root
            .querySelector('[data-viz-region="code"]')!
            .getBoundingClientRect()
          for (const line of root.querySelectorAll(
            '[data-viz-region="code"] [aria-current="true"]',
          )) {
            const r = line.getBoundingClientRect()
            if (r.top < pane.top - 0.5 || r.bottom > pane.bottom + 0.5)
              out.push(`current line outside the code window`)
          }
          for (const code of root.querySelectorAll(
            '[data-viz-region="code"] code',
          )) {
            if (code.getBoundingClientRect().right > pane.right + 0.5)
              out.push(`code line clipped: ${code.textContent}`)
          }
          return out
        })
        expect(problems, `${preset} step ${i} at ${width}`).toEqual([])
        const { mode } = await state(page)
        await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      }
    }
  }
})

// The fit comes from layout, not a sticky bar (D14, D16): on phones the
// lanes form a 2x2 grid and the console is one strip. Spec §3.4: with the
// code pane at the top of the viewport, every step of both presets.
test('375×667 fit: code line, focused element, caption and Next stay visible', async ({
  page,
}) => {
  await open(page, 375, '', 667)
  const code = frame(page).locator('[data-viz-region="code"]')
  for (const preset of ['Basics', 'Drain']) {
    await frame(page).getByRole('radio', { name: preset }).click()
    await slider(page).focus()
    for (let i = 0; i <= 9; i++) {
      await code.evaluate((el) =>
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY),
      )
      const v = await page.evaluate(() => {
        const root = document.querySelector('[data-viz="event-loop"] section')!
        const bar = root
          .querySelector('[data-viz-region="bar"]')!
          .getBoundingClientRect()
        const visible = (el: Element | null) => {
          if (!el) return true
          const r = el.getBoundingClientRect()
          return r.top >= 0 && r.bottom <= bar.top + 1
        }
        const next = root
          .querySelector('[data-viz-part="viz-next"]')!
          .getBoundingClientRect()
        return {
          line: visible(root.querySelector('[aria-current="true"]')),
          focus: [...root.querySelectorAll('[data-focus]')].every(visible),
          caption: visible(root.querySelector('[data-viz-part="viz-caption"]')),
          next: next.top >= 0 && next.bottom <= window.innerHeight,
        }
      })
      expect(v, `${preset} step ${i}`).toEqual({
        line: true,
        focus: true,
        caption: true,
        next: true,
      })
      const { mode } = await state(page)
      await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
      await page.waitForTimeout(30)
    }
  }
})

test('lazy mount: server HTML first, engine near the viewport, same footprint', async ({
  page,
}) => {
  // Far below the fold: the server's static Start frame stays until scrolled near.
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto(`${GALLERY}?spacer=1`)
  const staticFrame = mount(page).locator('[data-viz-interactive="false"]')
  await expect(staticFrame).toHaveCount(1)
  await page.waitForTimeout(1_000)
  await expect(staticFrame).toHaveCount(1)
  const before = await mount(page).boundingBox()
  await mount(page).scrollIntoViewIfNeeded()
  await expect(
    mount(page).locator('[data-viz-interactive="true"]'),
  ).toBeVisible()
  const after = await mount(page).evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { y: r.y + window.scrollY, height: r.height }
  })
  expect(after).toEqual({ y: before!.y, height: before!.height })

  // Client-only render (soft navigation): the placeholder reserves the
  // estimate (in rem), an upper bound for the measured frame. The swap happens
  // 800 px before the frame reaches the viewport.
  for (const [width, h] of [
    [375, FOOTPRINT.narrow],
    [1024, FOOTPRINT.wide],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(`${GALLERY}?spacer=1&mount=client`)
    const placeholder = mount(page).locator('[data-viz-placeholder]')
    await expect(placeholder).toHaveCount(1)
    expect((await placeholder.boundingBox())!.height).toBe(h)
    await mount(page).scrollIntoViewIfNeeded()
    await expect(
      mount(page).locator('[data-viz-interactive="true"]'),
    ).toBeVisible()
    expect((await frame(page).boundingBox())!.height).toBeLessThanOrEqual(h)
  }
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the Start frame and a working "Steps as text" are server-rendered', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 900 })
    await page.goto(GALLERY)
    const f = frame(page)
    await expect(f).toHaveAttribute('data-viz-interactive', 'false')
    expect((await f.boundingBox())!.height).toBeLessThanOrEqual(
      FOOTPRINT.narrow,
    )
    await expect(
      f.getByText('Event loop: sync, microtasks, tasks'),
    ).toBeVisible()
    await expect(f.locator('[data-viz-region="bar"]')).toBeHidden()
    await f.locator('summary').click()
    await expect(
      f.locator('details').getByText('Verified output (Node 24.x):'),
    ).toBeVisible()
  })
})

test('zero axe violations at Start, at a checkpoint and at a reveal', async ({
  page,
}) => {
  for (const width of [375, 1024]) {
    await open(page, width)
    const scan = async (label: string) => {
      const result = await new AxeBuilder({ page })
        .include('[data-viz="event-loop"]')
        .withTags([
          'wcag2a',
          'wcag2aa',
          'wcag21a',
          'wcag21aa',
          'wcag22aa',
          'best-practice',
        ])
        .analyze()
      expect(
        result.violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
        `${label} at ${width}`,
      ).toEqual([])
    }
    // Scans run after transitions settle (axe reads painted opacity).
    const settle = () => page.waitForTimeout(400)
    await scan('Start')
    await stepTo(page, 5)
    await settle()
    await scan('checkpoint')
    await page.keyboard.press('1')
    await settle()
    await scan('reveal')
    await frame(page).locator('summary').click()
    await scan('steps as text open')
  }
})

test('screenshots at 320, 375, 768, 1024 and 1440', async ({
  page,
}, testInfo) => {
  const shot = async (locator: Locator, name: string) => {
    const path = testInfo.outputPath(`${name}.png`)
    await locator.screenshot({ path, animations: 'disabled' })
    await testInfo.attach(name, { path, contentType: 'image/png' })
  }
  for (const width of WIDTHS) {
    await open(page, width)
    await shot(frame(page), `viz-${width}-start`)
    await stepTo(page, 5)
    await shot(frame(page), `viz-${width}-checkpoint`)
    await page.keyboard.press('2')
    await page.waitForTimeout(350)
    await shot(frame(page), `viz-${width}-reveal`)
  }
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto(GALLERY)
  await expect(
    mount(page).locator('[data-viz-interactive="true"]'),
  ).toBeVisible()
  await frame(page)
    .locator('[data-viz-region="code"]')
    .evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY),
    )
  await page.screenshot({
    path: testInfo.outputPath('viz-375x667-fit.png'),
    animations: 'disabled',
  })
})
