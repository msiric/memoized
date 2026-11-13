import { test } from '@playwright/test'
import {
  EL,
  WIDTHS,
  animatedGlyphs,
  animsOf,
  glyphVectors,
  mirrorProblems,
  openGallery,
  overlapProblems,
  recordAction,
  save,
  strictCheck,
  summarize,
} from './helpers'

/**
 * H0-C task 1, G: frame-sample every transition of every event-loop step, in
 * both directions, at full and reduced motion, at 375, 1024 and 1440
 * (MOTION_WIDTHS overrides). Writes one JSON report per preset, width and
 * motion mode to e2e/motion/out (or MOTION_OUT).
 *
 * Asserts (unless MOTION_STRICT=0), per step and direction:
 * - no §4 flag (size tween, over 300 ms, overshoot, a jump inside a tween,
 *   scale, opacity dip, more than two animated stage glyphs; under reduced
 *   motion, no translate and no opacity tween over 150 ms);
 * - G1: no moving or fading text prints over other text;
 * - G4, D8: Back mirrors Next glyph by glyph: the same glyphs, each
 *   displacement negated, durations matched (helpers `mirrorProblems`).
 */

const PRESETS = ['basic-ordering', 'microtask-queued-during-drain']

type Entry = {
  dir: string
  before: { step: string | null; mode: string | null }
  after: { step: string | null; mode: string | null }
  glyphs: string[]
  vectors: ReturnType<typeof glyphVectors>
  overlaps: string[]
  flags: { kind: string; detail: string }[]
}

for (const width of WIDTHS)
  for (const preset of PRESETS)
    for (const reduced of [false, true])
      test(`event-loop ${preset} @${width}${reduced ? ' reduced' : ''}: every step both ways`, async ({ page }) => {
        test.setTimeout(240_000)
        await openGallery(page, { width, query: `?preset=${preset}`, reduced })
        const frame = page.locator(EL)
        await frame.scrollIntoViewIfNeeded()
        await page.getByRole('slider').first().focus()
        const report: Entry[] = []
        const stepOf = async () => ({
          step: await frame.getAttribute('data-viz-step'),
          mode: await frame.getAttribute('data-viz-mode'),
        })
        const walk = async (dir: 'forward' | 'back') => {
          for (let guard = 0; guard < 40; guard++) {
            const before = await stepOf()
            // Forward: a wrong answer at each question; the reveal still plays.
            const key = dir === 'back' ? 'ArrowLeft' : before.mode === 'ask' ? '2' : 'ArrowRight'
            const r = await recordAction(page, EL, () => page.keyboard.press(key))
            const after = await stepOf()
            const s = summarize(r.motions, reduced)
            report.push({
              dir,
              before,
              after,
              glyphs: animatedGlyphs(r.motions, reduced),
              vectors: glyphVectors(r.motions),
              overlaps: overlapProblems(r.cap, r.at),
              flags: s.flags,
              ...({ key, animated: s.animated, anims: animsOf(r.cap) } as object),
            })
            const stuck = after.step === before.step && (dir === 'back' || after.mode === before.mode)
            if (stuck) break
            await page.waitForTimeout(250)
          }
        }
        await walk('forward')
        await walk('back')
        save(`event-loop-${preset}-${width}${reduced ? '-reduced' : ''}.json`, report)

        const where = (e: Entry) => `${preset}@${width} ${e.dir} ${e.before.step}->${e.after.step}${reduced ? ' reduced' : ''}`
        strictCheck(`${preset}@${width}: §4 flags`, report.flatMap((e) => e.flags.map((f) => `${where(e)}: ${f.kind} ${f.detail}`)))
        strictCheck(`${preset}@${width}: no text crosses text in motion (G1)`, report.flatMap((e) => e.overlaps.map((o) => `${where(e)} ${o}`)))
        // Back mirrors Next (D8, G4), between the same two steps.
        const fwd = new Map(
          report.filter((e) => e.dir === 'forward' && e.before.step !== e.after.step).map((e) => [`${e.before.step}->${e.after.step}`, e]),
        )
        strictCheck(
          `${preset}@${width}: Back mirrors Next (D8, G4)`,
          report
            .filter((e) => e.dir === 'back' && e.before.step !== e.after.step)
            .flatMap((e) => {
              const ahead = fwd.get(`${e.after.step}->${e.before.step}`)
              if (!ahead) return []
              // Under reduced motion nothing travels: only the glyph sets must match.
              if (reduced)
                return ahead.glyphs.join(',') === e.glyphs.join(',')
                  ? []
                  : [`${where(e)}: back animates [${e.glyphs}] but next animated [${ahead.glyphs}]`]
              return mirrorProblems(ahead.vectors, e.vectors).map((p) => `${where(e)}: ${p}`)
            }),
        )
      })
