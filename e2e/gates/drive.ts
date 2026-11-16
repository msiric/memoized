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
/** Lesson-context pages: the free lessons (closures, event loop, scope chain, the heap-graph lessons) and the committed list-keys stand-in (R2 G-02). */
export const LESSONS = ['event-loop', 'closures', 'scope-chain', 'list-keys', 'data-types', 'objects'] as const
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
const HEAP_DATA_TYPES = 'figure[data-viz-preset="identity-alias-rebind-spread"]'
const HEAP_OBJECTS = 'figure[data-viz-preset="spread-vs-nested-vs-deep"]'

/** A heap-graph name on screen (one svg per layout width; the visible one). */
const heapName = (page: Page, frame: string, panel: string, name: string) =>
  page.locator(`${frame} [data-viz-section="${panel}"] svg [data-node="v-${name}"] >> visible=true`).first()

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

/** The pointer-rewiring step-through (wave 2B) alone on its page (`?ll=<preset>`), and its static frames (`?ll=static`). */
export const LL = '[data-viz="linked-list-pointer-rewiring"] section'
export const llUrl = (preset: string) => `${GALLERY}?ll=${preset}`
const LL_STATES: Record<string, string> = {
  'll-start': 'reverse-between-m2-n4',
  'll-loop': 'reverse-between-m2-n4',
  'll-finale': 'reverse-between-m2-n4',
  'll-pal-ask': 'palindrome-split-reverse-compare',
  'll-pal-flip': 'palindrome-split-reverse-compare',
  'll-pal-false-finale': 'palindrome-1231',
}
const LLF: Record<string, string> = {
  'llf-rho': 'figure[data-viz-preset="floyd-rho"]',
  'llf-strip': 'figure[data-viz-preset="full-reversal-strip"]',
}

/** The annotated trees (wave 2D), static figures alone on their page (`?at=static`). */
export const atUrl = `${GALLERY}?at=static`
const AT: Record<string, string> = {
  'at-gain': 'figure[data-viz-preset="max-path-gain-vs-through"]',
  'at-trie': 'figure[data-viz-preset="trie-end-markers"]',
  'at-suffix': 'figure[data-viz-preset="suffix-tree-banana"]',
}

/** The wave 3B JavaScript-track figures, static, alone on their page (`?js=static`). */
export const jsUrl = `${GALLERY}?js=static`
export const JS: Record<string, string> = {
  'js-proto-lookup': 'figure[data-viz-preset="lookup-and-shadowing"]',
  'js-proto-ctor': 'figure[data-viz-preset="constructor-fix"]',
  'js-hidden-class': 'figure[data-viz-preset="hidden-class-transitions"]',
  'js-timers': 'figure[data-viz-preset="debounce-vs-throttle"]',
  'js-dispatch': 'figure[data-viz-preset="event-dispatch-path"]',
  'js-pkce': 'figure[data-viz-preset="oauth-pkce-channels"]',
  'js-types': 'figure[data-viz-preset="union-vs-intersection"]',
}

/** Steps the pointer-rewiring frame forward until `done`, skipping any question on the way. */
async function llWalk(page: Page, done: (f: Locator) => Promise<boolean>) {
  const f = page.locator(LL).first()
  for (let i = 0; i < 30 && !(await done(f)); i++) {
    if ((await f.getAttribute('data-viz-mode')) === 'ask') await f.locator('[data-viz-part="viz-skip"]').click()
    else await f.getByRole('button', { name: 'Next' }).click()
  }
  await settle(page)
}

/** The sliding-window step-through (wave 2C) alone on its page (`?sw=<preset>`). */
export const SW = '[data-viz="sliding-window"] section'
export const swUrl = (preset: string) => `${GALLERY}?sw=${preset}`
const SW_STATES: Record<string, string> = {
  'sw-start': 'araaci-k2',
  'sw-ask': 'araaci-k2',
  'sw-reveal-wrong': 'araaci-k2',
  'sw-record': 'araaci-k2',
  'sw-if-locked': 'araaci-k2-if',
  'sw-if-finale': 'araaci-k2-if',
  'sw-set-reveal': 'set-shrink-longest-substring',
  'sw-set-abba-if-finale': 'set-shrink-abba-if',
}

/** Steps the sliding-window frame forward until `stop` holds (or its end), answering an open question with choice `pick` on the way. */
async function swWalk(page: Page, stop: (step: number, mode: string | null) => boolean, pick = 1) {
  const f = page.locator(SW).first()
  for (let g = 0; g < 40; g++) {
    const step = Number(await f.getAttribute('data-viz-step'))
    const mode = await f.getAttribute('data-viz-mode')
    if (stop(step, mode) || step === Number(await f.getAttribute('data-viz-last'))) break
    if (mode === 'ask') await f.locator('[data-viz-region="dock"] [data-choice]').nth(pick - 1).click()
    else await f.getByRole('button', { name: 'Next' }).click()
  }
  await page.waitForTimeout(400)
  await settle(page)
}
/** Answers a prediction asked at Start with choice `pick`, then jumps to the finale. */
async function swFinale(page: Page, pick: number) {
  const f = page.locator(SW).first()
  if ((await f.getAttribute('data-viz-mode')) === 'ask') await f.locator('[data-viz-region="dock"] [data-choice]').nth(pick - 1).click()
  await f.getByRole('slider').focus()
  await page.keyboard.press('End')
  await page.waitForTimeout(1200)
  await settle(page)
}

/** The Promise Patterns lesson's presets (their own group, `?preset=`). */
export const PP = `${GALLERY}?preset=microtask-vs-timer-12345`
export const PP_AWAIT = `${GALLERY}?preset=await-null`

/** The scope-chain figures: the third and fourth environment-records figures of the static gallery. */
const SC: Record<string, string> = {
  'sc-caller': '[data-viz="environment-records"] figure >> nth=2',
  'sc-tdz': '[data-viz="environment-records"] figure >> nth=3',
}
const scFrame = (name: string) => SC[name.replace(/-hover$/, '')]

/** Hovers the traceable call (or function) of a static figure, in the svg on screen. */
async function hoverTracer(page: Page, frame: string) {
  const fn = page.locator(frame).first().locator('svg [tabindex="0"] >> visible=true').first()
  await fn.scrollIntoViewIfNeeded()
  await fn.hover()
  await settle(page)
}

/** The frontier step-through (wave 2A): one lesson group per page, `?fr=<preset>`. */
export const FR = '[data-viz="bfs-dfs-frontier"] section'
export const frUrl = (preset: string) => `${GALLERY}?fr=${preset}`
/** The preset each `fr-*` state opens on, by its name's second word. */
const FR_PRESET: Record<string, string> = {
  bfs: 'bfs-levels',
  matrix: 'binary-matrix-8dir',
  dijkstra: 'dijkstra-lazy-heap',
  effort: 'min-effort-grid',
  bst: 'bst-iterator-stack',
}
export const frPreset = (name: string) => FR_PRESET[name.split('-')[1]]

/**
 * Steps a frontier frame forward with Next until `stop` holds (or its end),
 * answering an open question with choice `pick` (1-based) on the way.
 */
async function frWalk(page: Page, stop: (step: number, mode: string | null) => boolean, pick = 1) {
  const f = page.locator(FR).first()
  for (let g = 0; g < 40; g++) {
    const step = Number(await f.getAttribute('data-viz-step'))
    const mode = await f.getAttribute('data-viz-mode')
    if (stop(step, mode) || step === Number(await f.getAttribute('data-viz-last'))) break
    if (mode === 'ask') await f.locator('[data-viz-region="dock"] [data-choice]').nth(pick - 1).click()
    else await f.getByRole('button', { name: 'Next' }).click()
  }
  await page.waitForTimeout(400)
  await settle(page)
}
const frAsk = (page: Page) => frWalk(page, (_s, mode) => mode === 'ask')
const frStep = (page: Page, n: number, pick = 1) => frWalk(page, (s) => s >= n, pick)
const frEnd = async (page: Page, pick = 1) => {
  await frWalk(page, () => false, pick)
  await page.waitForTimeout(800)
  await settle(page)
}

/** The page a state opens on: the static figures alone, the list-keys wrapper preset, a preset, or the gallery. */
export function stateUrl(name: string): string {
  if (name.startsWith('fr-')) return frUrl(frPreset(name))
  if (name.startsWith('llf-')) return llUrl('static')
  if (name.startsWith('at-')) return atUrl
  if (name.startsWith('js-')) return jsUrl
  if (LL_STATES[name]) return llUrl(LL_STATES[name])
  if (SW_STATES[name]) return swUrl(SW_STATES[name])
  if (name.startsWith('closures') || name.startsWith('heap') || name.startsWith('sc-')) return `${GALLERY}?static=1`
  if (name.startsWith('pp-await')) return PP_AWAIT
  if (name.startsWith('pp-')) return PP
  if (name.startsWith('lk-wrapper')) return `${GALLERY}?lk=parent-type-change`
  return GALLERY
}
/** The frame a state is judged in. */
export function stateFrame(name: string): string {
  if (name.startsWith('fr-')) return FR
  if (LLF[name]) return LLF[name]
  if (AT[name]) return AT[name]
  if (JS[name]) return JS[name]
  if (LL_STATES[name]) return LL
  if (SW_STATES[name]) return SW
  if (name.startsWith('closures')) return '[data-viz="environment-records"] figure'
  if (name.startsWith('heap-objects')) return HEAP_OBJECTS
  if (name.startsWith('heap')) return HEAP_DATA_TYPES
  if (name.startsWith('sc-')) return scFrame(name)
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
  // The heap graphs at rest (each panel's one changed mark), hovered (a
  // name's trace reaching a shared object) and keyboard-focused.
  'heap-rest': async () => {},
  'heap-hover': async (page) => {
    const name = heapName(page, HEAP_DATA_TYPES, 'spread', 'copy')
    await name.scrollIntoViewIfNeeded()
    await name.hover()
    await settle(page)
  },
  'heap-objects-rest': async () => {},
  'heap-objects-focus': async (page) => {
    const name = heapName(page, HEAP_OBJECTS, 'nested', 'updatedPerson')
    await name.scrollIntoViewIfNeeded()
    await name.focus()
    // Focus from a script is not :focus-visible; one Tab round trip makes it so.
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await page.mouse.move(0, 0)
    await settle(page)
  },
  // Promise patterns (R4 preset A): Start, the question after 5 logs, the finale.
  'pp-start': async () => {},
  'pp-checkpoint': async (page) => {
    await answerStart(page, 2)
    const f = page.locator(EL).first()
    for (let i = 0; i < 12 && (await f.getAttribute('data-viz-mode')) !== 'ask'; i++)
      await f.getByRole('button', { name: 'Next' }).click()
    await settle(page)
  },
  'pp-finale': async (page) => {
    await STATES['el-finale'](page)
  },
  // Preset B: run paused at await null (its continuation queued), and a wrong prediction's recap.
  'pp-await-step-3': async (page) => {
    await answerStart(page, 1)
    const f = page.locator(EL).first()
    for (let i = 0; i < 3; i++) await f.getByRole('button', { name: 'Next' }).click()
    await settle(page)
  },
  'pp-await-finale': async (page) => {
    await STATES['el-finale'](page)
  },
  // Scope chain: each figure at rest and with its running call traced.
  'sc-caller': async () => {},
  'sc-caller-hover': async (page) => {
    await hoverTracer(page, scFrame('sc-caller'))
  },
  'sc-tdz': async () => {},
  'sc-tdz-hover': async (page) => {
    await hoverTracer(page, scFrame('sc-tdz'))
  },
  // The frontier (wave 2A), one or more states per lesson group: Start, a
  // question open, a reveal (a wrong pick), mid-run lanes and the end.
  'fr-bfs-start': async () => {},
  'fr-bfs-ask': async (page) => {
    await frAsk(page)
  },
  'fr-bfs-reveal-wrong': async (page) => {
    await frAsk(page)
    await page.locator(FR).first().locator('[data-viz-region="dock"] [data-choice]').nth(1).click()
    await page.waitForTimeout(400)
    await settle(page)
  },
  'fr-bfs-end': async (page) => {
    await frEnd(page)
  },
  'fr-matrix-level': async (page) => {
    await frStep(page, 2)
  },
  'fr-matrix-end': async (page) => {
    await frEnd(page, 2)
  },
  'fr-dijkstra-reveal': async (page) => {
    await frAsk(page)
    await page.locator(FR).first().locator('[data-viz-region="dock"] [data-choice]').first().click()
    await page.waitForTimeout(400)
    await settle(page)
  },
  'fr-dijkstra-stale': async (page) => {
    await frWalk(page, (s) => s >= 12)
  },
  'fr-effort-ask': async (page) => {
    await frAsk(page)
  },
  'fr-effort-end': async (page) => {
    await frEnd(page, 3)
  },
  'fr-bst-reveal': async (page) => {
    await frAsk(page)
    await page.locator(FR).first().locator('[data-viz-region="dock"] [data-choice]').nth(1).click()
    await page.waitForTimeout(400)
    await settle(page)
  },
  'fr-bst-end': async (page) => {
    await frEnd(page)
  },
  // Pointer rewiring (wave 2B): Start, the temporary loop revealed after a
  // wrong pick, the printed list; the palindrome's question, a flip with t
  // saved, and the false preset's end. Then the two static frames.
  'll-start': async () => {},
  'll-loop': async (page) => {
    const f = page.locator(LL).first()
    await llWalk(page, async (x) => (await x.getAttribute('data-viz-mode')) === 'ask')
    await f.locator('[data-viz-region="dock"] [data-choice]').first().click()
    await settle(page)
  },
  'll-finale': async (page) => {
    const f = page.locator(LL).first()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(1200)
    await settle(page)
  },
  'll-pal-ask': async (page) => {
    await llWalk(page, async (x) => (await x.getAttribute('data-viz-mode')) === 'ask')
  },
  'll-pal-flip': async (page) => {
    await llWalk(page, async (x) => Number(await x.getAttribute('data-viz-step')) === 8 && (await x.getAttribute('data-viz-mode')) !== 'ask')
  },
  'll-pal-false-finale': async (page) => {
    const f = page.locator(LL).first()
    if ((await f.getAttribute('data-viz-mode')) === 'ask') await f.locator('[data-viz-region="dock"] [data-choice]').first().click()
    await f.getByRole('slider').focus()
    await page.keyboard.press('End')
    await page.waitForTimeout(1200)
    await settle(page)
  },
  'llf-rho': async () => {},
  'llf-strip': async () => {},
  // The sliding window (wave 2C): Start, the question while 3 keys remain,
  // its reveal after a wrong pick, a record step (the best length tinted),
  // the if preset's locked-in prediction and its finale; the Set's first
  // delete (the read cell dashed) and abba with if returning 3.
  'sw-start': async () => {},
  'sw-ask': async (page) => {
    await swWalk(page, (_s, mode) => mode === 'ask')
  },
  'sw-reveal-wrong': async (page) => {
    await swWalk(page, (_s, mode) => mode === 'ask')
    await page.locator(SW).first().locator('[data-viz-region="dock"] [data-choice]').nth(1).click()
    await page.waitForTimeout(400)
    await settle(page)
  },
  'sw-record': async (page) => {
    await swWalk(page, (s, mode) => s >= 8 && mode !== 'ask')
  },
  'sw-if-locked': async (page) => {
    await page.locator(SW).first().locator('[data-viz-region="dock"] [data-choice]').first().click()
    await settle(page)
  },
  'sw-if-finale': async (page) => {
    await swFinale(page, 2)
  },
  'sw-set-reveal': async (page) => {
    await swWalk(page, (_s, mode) => mode === 'ask')
    await page.locator(SW).first().locator('[data-viz-region="dock"] [data-choice]').first().click()
    await page.waitForTimeout(400)
    await settle(page)
  },
  'sw-set-abba-if-finale': async (page) => {
    await swFinale(page, 1)
  },
  // The annotated trees (wave 2D): static, at rest only.
  'at-gain': async () => {},
  'at-trie': async () => {},
  'at-suffix': async () => {},
  // The wave 3B JavaScript-track figures: static, at rest only.
  'js-proto-lookup': async () => {},
  'js-proto-ctor': async () => {},
  'js-hidden-class': async () => {},
  'js-timers': async () => {},
  'js-dispatch': async () => {},
  'js-pkce': async () => {},
  'js-types': async () => {},
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
  'pp-finale': {
    url: PP,
    frame: EL,
    setup: toBeforeEnd,
    act: async (page) => {
      await page.keyboard.press('ArrowRight')
    },
  },
  'pp-await-finale': {
    url: PP_AWAIT,
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
  // The frontier: q = nq, chips travel from one lane to the other (FLIP).
  'fr-matrix-swap': {
    url: frUrl('binary-matrix-8dir'),
    frame: FR,
    setup: async (page) => {
      await frStep(page, 1)
      await page.waitForTimeout(900)
    },
    act: async (page) => {
      await page.locator(FR).first().getByRole('button', { name: 'Next' }).click()
    },
  },
  // Pointer rewiring: a paced flip (the arrow cross-fades, the tag slides, Q1).
  'll-step': {
    url: llUrl('reverse-between-m2-n4'),
    frame: LL,
    setup: async (page) => {
      const f = page.locator(LL).first()
      await f.getByRole('slider').focus()
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(650)
      }
    },
    act: async (page) => {
      await page.keyboard.press('ArrowRight')
    },
  },
  // The sliding window: a paced extend (the right edge's tag slides with the band, a chip enters, Q1).
  'sw-step': {
    url: swUrl('araaci-k2'),
    frame: SW,
    setup: async (page) => {
      const f = page.locator(SW).first()
      await f.getByRole('slider').focus()
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ArrowRight')
        await page.waitForTimeout(650)
      }
    },
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
