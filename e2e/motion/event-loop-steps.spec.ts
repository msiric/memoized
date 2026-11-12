import { test } from '@playwright/test'
import { motionRules } from '../../src/components/visualizations/primitives/tokens-v3'
import { EL, animatedGlyphs, animsOf, openGallery, recordAction, save, strictCheck, summarize } from './helpers'

/**
 * H0-C task 1: frame-sample every transition of every event-loop step, in
 * both directions, at full and reduced motion. Writes one JSON report per
 * preset and motion mode to test-results/motion (or MOTION_OUT).
 *
 * MOTION_STRICT=1 asserts, per step and direction:
 * - no §4 flag (size tween, over 300 ms, overshoot, scale, opacity dip; under
 *   reduced motion, no translate and no opacity tween over 130 ms);
 * - at most two stage glyphs animate (spec §4 rule 1, the shell's budget);
 * - Back animates exactly the glyphs Next animated for the same pair (D8).
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
          const glyphs = animatedGlyphs(r.motions)
          report.push({ dir: 'forward', key, before, after, glyphs, ...summarize(r.motions, reduced), anims: animsOf(r.cap) })
          if (after.step === before.step && after.mode === before.mode) break
          await page.waitForTimeout(250)
        }
        // Backward.
        for (let guard = 0; guard < 40; guard++) {
          const before = await stepOf()
          const r = await recordAction(page, EL, () => page.keyboard.press('ArrowLeft'))
          const after = await stepOf()
          const glyphs = animatedGlyphs(r.motions)
          report.push({ dir: 'back', key: 'ArrowLeft', before, after, glyphs, ...summarize(r.motions, reduced), anims: animsOf(r.cap) })
          if (after.step === before.step) break
          await page.waitForTimeout(250)
        }
        save(`event-loop-${preset}-${width}${reduced ? '-reduced' : ''}.json`, report)

        // Strict: the rules, per entry.
        type Entry = { dir: string; before: { step: string | null }; after: { step: string | null }; glyphs: string[]; flags: { kind: string; detail: string }[] }
        const entries = report as Entry[]
        const where = (e: Entry) => `${preset} ${e.dir} ${e.before.step}->${e.after.step}${reduced ? ' reduced' : ''}`
        strictCheck(
          `${preset}: §4 flags`,
          entries.flatMap((e) => e.flags.map((f) => `${where(e)}: ${f.kind} ${f.detail}`)),
        )
        strictCheck(
          `${preset}: at most ${motionRules.maxAnimatedPerStep} stage glyphs per step`,
          entries
            .filter((e) => e.glyphs.length > motionRules.maxAnimatedPerStep)
            .map((e) => `${where(e)}: ${e.glyphs.join(', ')}`),
        )
        const fwd = new Map(entries.filter((e) => e.dir === 'forward').map((e) => [`${e.before.step}->${e.after.step}`, e.glyphs.join(',')]))
        strictCheck(
          `${preset}: Back mirrors Next (D8)`,
          entries
            .filter((e) => e.dir === 'back' && e.before.step !== e.after.step)
            .flatMap((e) => {
              const ahead = fwd.get(`${e.after.step}->${e.before.step}`)
              return ahead === undefined || ahead === e.glyphs.join(',')
                ? []
                : [`${where(e)}: back animates [${e.glyphs}] but next animated [${ahead}]`]
            }),
        )
      })
