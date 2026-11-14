import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared page setup and state drivers for the design gates (contrast crawl,
 * visual regression, consistency). Deterministic: reduced motion, fonts
 * loaded, no caret, the Next.js dev indicator hidden, every state reached by
 * the same keyboard and pointer paths a reader uses. The full-motion drivers
 * (`MOTION_STATES`, R2 G-01) freeze a reveal at fixed offsets instead.
 */

export const GALLERY = '/dev/visualizations'
export const SPECIMEN = '/dev/visualizations/system'
/** Lesson-context pages: the two free lessons, and the committed list-keys stand-in (R2 G-02). */
export const LESSONS = ['event-loop', 'closures', 'list-keys'] as const
export const lessonUrl = (slug: string) => `/dev/visualizations/lesson/${slug}`

/** Hides the dev-mode overlay and build indicator, which are not the product. */
export const HIDE_DEV_CHROME = 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }'

export async function open(page: Page, url: string, width: number, height = 900, reducedMotion: 'reduce' | 'no-preference' = 'reduce') {
  // A press state from the previous page must not carry over.
  await page.mouse.up().catch(() => {})
  await page.emulateMedia({ reducedMotion, colorScheme: 'dark' })
  await page.setViewportSize({ width, height })
  await page.goto(url, { waitUntil: 'load' })
  await page.addStyleTag({ content: HIDE_DEV_CHROME })
  await page.evaluate(() => document.fonts.ready)
  // Every lazy step-through and explorable on the page swaps in its engine.
  for (const el of await page.locator('[data-viz]').all()) {
    await el.scrollIntoViewIfNeeded()
    if (await el.locator('section').count())
      await expect(el.locator('section[data-viz-interactive="true"]').first()).toBeVisible({ timeout: 30_000 })
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  await settle(page)
}

/** Animations finished and two frames painted. */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
}

const EL = '[data-viz="event-loop"] section'
const LK = '[data-viz="list-keys"] section'

/** The event loop's Start prediction, answered with choice `pick` (1-based). */
async function answerStart(page: Page, pick: number) {
  const f = page.locator(EL).first()
  if ((await f.getAttribute('data-viz-mode')) === 'ask')
    await f.locator('[data-viz-region="dock"] [data-choice]').nth(pick - 1).click()
  await settle(page)
}

/** The event loop's other preset (R2 G-02: Drain was never visited). */
async function drain(page: Page) {
  const f = page.locator(EL).first()
  await f.getByRole('radio', { name: 'Drain' }).click()
  await settle(page)
}

/** Holds the pointer down on `target` (the press state, R13), without releasing it. */
async function press(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const b = (await target.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await settle(page)
}

/** The key strategy, through whichever face the control shows (segments, or its select where they do not fit). */
async function lkKey(page: Page, label: string) {
  const keys = page.locator(LK).first().locator('[data-viz-part="keys"]')
  const radio = keys.getByRole('radio', { name: label, exact: true })
  if (await radio.isVisible()) await radio.click()
  else await keys.locator('select').selectOption({ label })
  await settle(page)
}

/** The page a state opens on: the static figures alone, the list-keys wrapper preset, or the gallery. */
export function stateUrl(name: string): string {
  if (name.startsWith('closures')) return `${GALLERY}?static=1`
  if (name.startsWith('lk-wrapper')) return `${GALLERY}?lk=parent-type-change`
  return GALLERY
}
/** The frame a state is judged in. */
export function stateFrame(name: string): string {
  if (name.startsWith('closures')) return '[data-viz="environment-records"] figure'
  return name.startsWith('lk') ? LK : EL
}

/** Named states of the gallery's visuals, reached through the real controls. */
export const STATES: Record<string, (page: Page) => Promise<void>> = {
  'el-start': async () => {},
  'el-step-4': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    for (let i = 0; i < 4; i++) await f.getByRole('button', { name: 'Next' }).click()
    await settle(page)
  },
  'el-checkpoint-wrong': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    for (let i = 0; i < 12 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++)
      await f.getByRole('button', { name: 'Next' }).click()
    const choices = f.locator('[data-viz-region="dock"] [data-choice]')
    // The first choice that is not the answer: the feedback says "Not quite."
    for (let i = 0; i < (await choices.count()); i++) {
      await choices.nth(i).click()
      await settle(page)
      if (/Not quite/.test((await f.locator('[data-viz-part="viz-feedback"]').textContent()) ?? '')) return
      // Right by chance: go back one step and forward again to re-ask.
      await f.getByRole('button', { name: 'Back' }).click()
      await f.getByRole('button', { name: 'Next' }).click()
    }
  },
  'el-finale': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(1200)
    await settle(page)
  },
  // G ruling 2: after Restart the Start question names the earlier answer under the prompt.
  'el-last-time': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.keyboard.press('Home')
    // The step tooltip lingers after a key press; let it go so the shot is stable.
    await page.waitForTimeout(1200)
    await settle(page)
    await expect(f.locator('[data-viz-part="viz-note"]')).toBeVisible()
  },
  // R2 G-02: the Drain preset, mid-run and at its finale.
  'el-drain-step-4': async (page) => {
    await drain(page)
    await STATES['el-step-4'](page)
  },
  'el-drain-finale': async (page) => {
    await drain(page)
    await STATES['el-finale'](page)
  },
  // R2 G-02: hover and press inside the real frames (not only the specimen).
  'el-hover-choice': async (page) => {
    const f = page.locator(EL).first()
    await f.locator('[data-viz-region="dock"] [role="radio"]').nth(1).hover()
    await settle(page)
  },
  'el-press-next': async (page) => {
    await answerStart(page, 2)
    await press(page, page.locator(EL).first().getByRole('button', { name: 'Next' }))
  },
  'lk-ask': async () => {},
  'lk-reveal': async (page) => {
    const f = page.locator(LK).first()
    await f.locator('[data-viz-part="viz-skip"]').click()
    await settle(page)
  },
  'lk-answered': async (page) => {
    const f = page.locator(LK).first()
    await f.locator('[data-choice-index="0"]').click()
    await settle(page)
  },
  'lk-random-key': async (page) => {
    await lkKey(page, 'Math.random()')
    await STATES['lk-reveal'](page)
  },
  'lk-hover-choice': async (page) => {
    await page.locator(LK).first().locator('[data-choice-index="1"]').hover()
    await settle(page)
  },
  'lk-press-card': async (page) => {
    await press(page, page.locator(LK).first().locator('[data-row="before-1"]'))
  },
  'lk-wrapper-ask': async () => {},
  'lk-wrapper-reveal': async (page) => {
    await STATES['lk-reveal'](page)
  },
  'closures-hover': async (page) => {
    // The figure draws one svg per layout width; hover the one on screen.
    const fn = page.locator('[data-viz="environment-records"] svg [tabindex="0"] >> visible=true').first()
    await fn.scrollIntoViewIfNeeded()
    await fn.hover()
    await settle(page)
  },
}

// ---------------------------------------------------------------------------
// Full motion (R2 G-01, MOTION GB8): the contrast crawl and the baselines
// also judge reveals while they play, not only at rest.
// ---------------------------------------------------------------------------

/** Steps the event loop (full motion) to the step before its last, the Start prediction answered. */
async function toBeforeEnd(page: Page) {
  const f = page.locator(EL).first()
  await answerStart(page, 2)
  await f.getByRole('slider').focus()
  const last = Number(await f.getByRole('slider').getAttribute('aria-valuemax'))
  for (let g = 0; g < 30; g++) {
    const step = Number(await f.getAttribute('data-viz-step'))
    const mode = await f.getAttribute('data-viz-mode')
    if (step === last - 1 && mode !== 'ask') break
    await page.keyboard.press(mode === 'ask' ? '2' : 'ArrowRight')
    await page.waitForTimeout(650)
  }
  await page.waitForTimeout(900)
}

/** Steps to the mid-run checkpoint (its question open). */
async function toCheckpoint(page: Page) {
  const f = page.locator(EL).first()
  await answerStart(page, 2)
  await page.waitForTimeout(900)
  await f.getByRole('slider').focus()
  for (let g = 0; g < 12 && (await f.getAttribute('data-viz-mode')) !== 'ask'; g++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(650)
  }
  await page.waitForTimeout(400)
}

export type MotionState = {
  url: string
  frame: string
  /** Reaches the state just before the motion (full motion, waits for it to rest). */
  setup: (page: Page) => Promise<void>
  /** The input that starts the motion. */
  act: (page: Page) => Promise<void>
}

const click = (sel: string, frame = EL) => async (page: Page) => {
  await page.locator(frame).first().locator(sel).first().click()
}

/** Every designed motion with a payoff, from the input that starts it (R2 G-01). */
export const MOTION_STATES: Record<string, MotionState> = {
  // Next turns from unavailable to primary as the prediction locks in (R2M-08).
  'el-lockin': { url: GALLERY, frame: EL, setup: async () => {}, act: click('[data-viz-region="dock"] [role="radio"] >> nth=1') },
  // A paced step: line, glyph, then the console line and caption (Q1).
  'el-step': {
    url: GALLERY,
    frame: EL,
    setup: async (page) => {
      await answerStart(page, 2)
      await page.waitForTimeout(900)
    },
    act: async (page) => {
      await page.locator(EL).first().getByRole('button', { name: 'Next' }).click()
    },
  },
  // The verdict, its marks and the answer emphasis landing (Q3, Q4).
  'el-answer': { url: GALLERY, frame: EL, setup: toCheckpoint, act: click('[data-viz-region="dock"] [role="radio"] >> nth=0') },
  // The finale: outputs replay and the code relights (D21, Q14).
  'el-finale': {
    url: GALLERY,
    frame: EL,
    setup: toBeforeEnd,
    act: async (page) => {
      await page.keyboard.press('ArrowRight')
    },
  },
  'el-drain-finale': {
    url: `${GALLERY}?preset=microtask-queued-during-drain`,
    frame: EL,
    setup: toBeforeEnd,
    act: async (page) => {
      await page.keyboard.press('ArrowRight')
    },
  },
  // List keys: the rider, the lines, then the verdict sequence (D21, Q18).
  'lk-ride': { url: GALLERY, frame: LK, setup: async () => {}, act: click('[data-choice-index="0"]', LK) },
  'lk-wrapper-ride': { url: `${GALLERY}?lk=parent-type-change`, frame: LK, setup: async () => {}, act: click('[data-choice-index="0"]', LK) },
}

/**
 * Freezes the page `ms` after the act, for the contrast crawl: an animation
 * of opacity or transform only, or a color tweened to or from transparent,
 * is finished (a fade or a move does not change a pair, it only hides or
 * places it), everything else (one color into another: grounds, fills,
 * labels, strokes mid-tween) is paused where it is, so the crawl measures
 * the pair a reader sees at that moment.
 */
export async function freezeForContrast(page: Page) {
  await page.evaluate(() => {
    const MOVE = new Set(['opacity', 'transform', 'translate', 'scale', 'offset', 'computedOffset', 'easing', 'composite'])
    // A color tweened to or from transparent is a fade in another property (a ground, a bar).
    const CLEAR = /transparent|rgba\([^)]*,\s*0\)|\/\s*0\)/
    for (const a of document.getAnimations()) {
      const kf = (a.effect as KeyframeEffect | null)?.getKeyframes?.() ?? []
      const props = new Set(kf.flatMap((k) => Object.keys(k)))
      const moveOnly = [...props].every((p) => MOVE.has(p))
      const fade = kf.some((k) => Object.values(k).some((v) => typeof v === 'string' && CLEAR.test(v)))
      const transition = (a as CSSTransition).transitionProperty
      if ((transition && ['opacity', 'transform', 'translate', 'scale'].includes(transition)) || (!transition && moveOnly) || fade) a.finish()
      else a.pause()
    }
  })
}

/**
 * Freezes every animation the act started at exactly `ms` into its own
 * timeline (delays included), and cancels pending timers, for a
 * deterministic mid-motion baseline. Only motions driven by Web Animations
 * and CSS (the relight, the rider and its lines, a button's variant change)
 * are frozen this way.
 */
export async function freezeAt(page: Page, ms: number) {
  await page.evaluate(
    (t) =>
      new Promise<void>((done) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            for (const a of document.getAnimations()) {
              a.pause()
              a.currentTime = t
            }
            // Timers that would land the motion (a ride's safety landing, a
            // beat's caption swap) are cancelled, so the frame stays put.
            const last = window.setTimeout(() => {}, 0)
            for (let id = 0; id <= last; id++) {
              window.clearTimeout(id)
              window.clearInterval(id)
            }
            requestAnimationFrame(() => requestAnimationFrame(() => done()))
          }),
        ),
      ),
    ms,
  )
}
