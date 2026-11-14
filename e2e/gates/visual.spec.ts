import { expect, test, type Page } from '@playwright/test'
import { GALLERY, LESSONS, MOTION_STATES, SPECIMEN, STATES, freezeAt, lessonUrl, open, settle, stateFrame, stateUrl } from './drive'

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
 */

test.skip(process.env.VIZ_VISUAL !== '1', 'visual baselines render in the Playwright Linux image (yarn test:viz:visual)')

const WIDTHS = [375, 768, 1440] as const
const SHOT = { animations: 'disabled', caret: 'hide', scale: 'css' } as const

async function frameShot(page: Page, selector: string, name: string) {
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
    test.setTimeout(300_000)
    for (const [name, drive] of Object.entries(STATES)) {
      await open(page, stateUrl(name), width)
      await drive(page)
      await frameShot(page, stateFrame(name), `${name}-${width}.png`)
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
})
