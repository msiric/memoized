import { expect, test, type Page } from '@playwright/test'
import { baselineName, urlLocalOnly } from '../premium'
import { FR, GALLERY, LESSONS, LL, MOTION_STATES, PP, SPECIMEN, STATES, SW, DP, JS, DSA, FE, atUrl, dpUrl, dsaUrl, feUrl, freezeAt, jsUrl, frUrl, lessonUrl, llUrl, open, settle, stateFrame, stateUrl, swUrl, CORE, coreUrl } from './drive'

/**
 * Visual regression (VIZ-H G, H4): the specimen (every primitive in every
 * state), the gallery's visuals in each named state and the visuals in
 * lesson context, at 375, 768 and 1440, against committed baselines.
 *
 * Baselines are rendered in the Playwright Linux image
 * (mcr.microsoft.com/playwright, the version in package.json), the same
 * image CI runs, so fonts and antialiasing match byte for byte. Locally:
 * `yarn test:viz:visual` (runs the image against a dev server on the host;
 * add `--update-snapshots` after an intended change and review the diff).
 * Outside the image (VIZ_VISUAL unset) the spec skips: a macOS render would
 * never match a Linux baseline.
 *
 * Deterministic: reduced motion, `animations: 'disabled'`, fonts loaded,
 * caret hidden, the dev overlay hidden, states reached through the real
 * controls.
 *
 * Practice-answer frames (the premium-code policy) show premium text, so
 * their baselines are rendered from the local content checkout into the
 * gitignored `local-only/` folder and never committed; without the checkout
 * (CI) those states skip, each named in the test's annotations.
 */

test.skip(process.env.VIZ_VISUAL !== '1', 'visual baselines render in the Playwright Linux image (yarn test:viz:visual)')

const WIDTHS = [375, 768, 1440] as const
const SHOT = { animations: 'disabled', caret: 'hide', scale: 'css' } as const

async function frameShot(page: Page, selector: string, name: string | string[]) {
  const el = page.locator(selector).first()
  await el.scrollIntoViewIfNeeded()
  await settle(page)
  await expect(el).toHaveScreenshot(name, SHOT)
}

for (const width of WIDTHS) {
  test(`specimen @${width}`, async ({ page }) => {
    await open(page, SPECIMEN, width)
    for (const section of await page.locator('[data-specimen]').all()) {
      const id = await section.getAttribute('data-specimen')
      if (id === 'engines') continue
      await section.scrollIntoViewIfNeeded()
      await expect(section).toHaveScreenshot(`specimen-${id}-${width}.png`, SHOT)
    }
  })

  test(`gallery states @${width}`, async ({ page }) => {
    // Every gallery state in one test: wave 4 brought it near five minutes in the image, so it gets seven.
    test.setTimeout(420_000)
    for (const [name, drive] of Object.entries(STATES)) {
      const url = stateUrl(name)
      const skip = urlLocalOnly(url)
      if (skip) {
        test.info().annotations.push({ type: 'skipped state', description: `${name}: ${skip}` })
        continue
      }
      await open(page, url, width)
      await drive(page)
      await frameShot(page, stateFrame(name), baselineName(url, `${name}-${width}.png`))
    }
  })

  // R2 G-01: one baseline per reveal at its midpoint, in full motion. The
  // motion is frozen at a fixed time into its own timeline (`freezeAt`), so
  // the frame is the same on every run.
  test(`full motion midpoints @${width}`, async ({ page }) => {
    test.setTimeout(180_000)
    for (const [name, ms] of [
      ['el-lockin', 75],
      ['el-finale', 300],
      ['lk-ride', 200],
    ] as const) {
      const st = MOTION_STATES[name]
      await open(page, st.url, width, 900, 'no-preference')
      await st.setup(page)
      const el = page.locator(st.frame).first()
      await el.scrollIntoViewIfNeeded()
      await st.act(page)
      await freezeAt(page, ms)
      await expect(el).toHaveScreenshot(`motion-${name}-${ms}-${width}.png`, { ...SHOT, animations: 'allow' })
    }
  })

  for (const slug of LESSONS)
    test(`lesson ${slug} in context @${width}`, async ({ page }) => {
      await open(page, lessonUrl(slug), width)
      const vizs = await page.locator('[data-viz]').all()
      for (const [i, v] of vizs.entries()) {
        // The visual in the middle of the viewport, with the lesson around it.
        await v.evaluate((el) => el.scrollIntoView({ block: 'center' }))
        await settle(page)
        await expect(page).toHaveScreenshot(`lesson-${slug}-${i}-${width}.png`, SHOT)
      }
    })
}

test('print: specimen and gallery on paper', async ({ page }) => {
  await open(page, SPECIMEN, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const id of ['code', 'checkbox', 'lanes', 'scrubber']) {
    const section = page.locator(`[data-specimen="${id}"]`)
    await section.scrollIntoViewIfNeeded()
    await expect(section).toHaveScreenshot(`print-specimen-${id}.png`, SHOT)
  }
  await open(page, GALLERY, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, '[data-viz="event-loop"] section', 'print-event-loop.png')
  await frameShot(page, '[data-viz="list-keys"] section', 'print-list-keys.png')
  // The promise-patterns presets (their own switcher and code column) and the scope-chain figures.
  await open(page, PP, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, '[data-viz="event-loop"] section', 'print-promise-patterns.png')
  await open(page, `${GALLERY}?static=1`, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, '[data-viz="environment-records"] figure >> nth=2', 'print-scope-chain-caller.png')
  await frameShot(page, '[data-viz="environment-records"] figure >> nth=3', 'print-scope-chain-tdz.png')
  await open(page, `${GALLERY}?static=1`, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, 'figure[data-viz-preset="identity-alias-rebind-spread"]', 'print-heap-graph-data-types.png')
  await frameShot(page, 'figure[data-viz-preset="spread-vs-nested-vs-deep"]', 'print-heap-graph-objects.png')
  // The frontier: a graph, a grid and a tree on paper; DFS stack mode and Kahn's badges (wave 4B).
  for (const preset of ['bfs-levels', 'min-effort-grid', 'bst-iterator-stack', 'dfs-directed-recstack', 'kahn-indegree']) {
    const skip = urlLocalOnly(frUrl(preset))
    if (skip) {
      test.info().annotations.push({ type: 'skipped state', description: `print ${preset}: ${skip}` })
      continue
    }
    await open(page, frUrl(preset), 768)
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
    await frameShot(page, FR, baselineName(frUrl(preset), `print-frontier-${preset}.png`))
  }
  // Pointer rewiring (wave 2B): the step-through's Start and both static frames.
  await open(page, llUrl('reverse-between-m2-n4'), 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, LL, 'print-linked-list-reverse-between.png')
  await open(page, llUrl('static'), 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, 'figure[data-viz-preset="floyd-rho"]', 'print-linked-list-floyd-rho.png')
  await frameShot(page, 'figure[data-viz-preset="full-reversal-strip"]', 'print-linked-list-full-reversal.png')
  // The sliding window (wave 2C): the lesson example's Start.
  await open(page, swUrl('araaci-k2'), 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  await frameShot(page, SW, 'print-sliding-window-araaci.png')
  // The dp table (wave 3A): its Start on paper, local-only (a practice answer).
  const dpSkip = urlLocalOnly(dpUrl('knapsack-1d-desc-vs-asc'))
  if (dpSkip) test.info().annotations.push({ type: 'skipped state', description: `print dp table: ${dpSkip}` })
  else {
    await open(page, dpUrl('knapsack-1d-desc-vs-asc'), 768)
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
    await frameShot(page, DP, baselineName(dpUrl('knapsack-1d-desc-vs-asc'), 'print-dp-table-knapsack.png'))
  }
  // The annotated trees (waves 2D and 3A), every preset on paper.
  await open(page, atUrl, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const preset of ['max-path-gain-vs-through', 'trie-end-markers', 'suffix-tree-banana', 'combination-sum-take-skip', 'water-wells-virtual-source', 'k-pairs-lazy-grid', 'diamond-reverse-edge', 'clrs-23-min-cut'])
    await frameShot(page, `figure[data-viz-preset="${preset}"]`, `print-annotated-tree-${preset}.png`)
  // The wave 3B JavaScript-track figures, every preset on paper.
  await open(page, jsUrl, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const [state, frame] of Object.entries(JS)) await frameShot(page, frame, `print-${state}.png`)
  // The wave 4A DSA-track figures, every preset on paper.
  await open(page, dsaUrl, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const [state, frame] of Object.entries(DSA)) await frameShot(page, frame, `print-${state}.png`)
  // The wave 4D frontend figures, every preset on paper.
  await open(page, feUrl, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const [state, frame] of Object.entries(FE)) await frameShot(page, frame, `print-${state}.png`)
  // The wave 4C JavaScript core figures on paper.
  await open(page, coreUrl, 768)
  await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' })
  for (const [state, frame] of Object.entries(CORE)) await frameShot(page, frame, `print-${state}.png`)
})
