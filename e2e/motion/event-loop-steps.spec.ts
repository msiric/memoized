import { test } from '@playwright/test'
import { EL, animsOf, openGallery, recordAction, save, summarize } from './helpers'

/**
 * H0-C task 1: frame-sample every transition of every event-loop step, in
 * both directions, at full and reduced motion. Writes one JSON report per
 * preset and motion mode to test-results/motion (or MOTION_OUT).
 */

const PRESETS = ['basic-ordering', 'microtask-queued-during-drain']
const WIDTHS = [Number(process.env.MOTION_WIDTH ?? 1024)]

for (const width of WIDTHS)
  for (const preset of PRESETS)
    for (const reduced of [false, true])
      test(`event-loop ${preset} @${width}${reduced ? ' reduced' : ''}: every step both ways`, async ({ page }) => {
        test.setTimeout(240_000)
        await openGallery(page, { width, query: `?preset=${preset}`, reduced })
        const frame = page.locator(EL)
        await frame.scrollIntoViewIfNeeded()
        await page.getByRole('slider').first().focus()
        const report: unknown[] = []
        const stepOf = async () => ({
          step: await frame.getAttribute('data-viz-step'),
          mode: await frame.getAttribute('data-viz-mode'),
        })
        // Forward.
        for (let guard = 0; guard < 40; guard++) {
          const before = await stepOf()
          let key = 'ArrowRight'
          if (before.mode === 'ask') key = '2' // a wrong answer first time; the reveal still plays
          const r = await recordAction(page, EL, () => page.keyboard.press(key))
          const after = await stepOf()
          report.push({ dir: 'forward', key, before, after, ...summarize(r.motions, reduced), anims: animsOf(r.cap) })
          if (after.step === before.step && after.mode === before.mode) break
          await page.waitForTimeout(250)
        }
        // Backward.
        for (let guard = 0; guard < 40; guard++) {
          const before = await stepOf()
          const r = await recordAction(page, EL, () => page.keyboard.press('ArrowLeft'))
          const after = await stepOf()
          report.push({ dir: 'back', key: 'ArrowLeft', before, after, ...summarize(r.motions, reduced), anims: animsOf(r.cap) })
          if (after.step === before.step) break
          await page.waitForTimeout(250)
        }
        save(`event-loop-${preset}-${width}${reduced ? '-reduced' : ''}.json`, report)
      })
