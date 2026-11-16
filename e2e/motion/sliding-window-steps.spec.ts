import { expect, test } from '@playwright/test'
import {
  WIDTHS,
  animatedGlyphs,
  animsOf,
  beatProblems,
  beatStarts,
  verdictAfterPayoff,
  glyphVectors,
  mirrorProblems,
  overlapProblems,
  recordAction,
  save,
  strictCheck,
  summarize,
  timingAdvisory,
  REQUIRE_TIMING,
} from './helpers'
import { frameHealth } from './analyze'
import { RECORDER } from './recorder'
import { localOnly, localOnlyNote } from '../premium'
import { slidingWindowDescriptor } from '../../src/components/visualizations/engines/sliding-window/descriptor'

/**
 * The motion gate for the sliding-window step-through (wave 2C), as
 * event-loop-steps.spec.ts runs it: every step of every preset, both ways,
 * at full and reduced motion (MOTION_WIDTHS). Asserts the section 4 flags
 * (an edge tag slides on the move spring with the band, a store chip enters
 * or leaves at its end, never more than two glyphs), no moving text over
 * text, the three beats in order (timing enforced locally), the verdict
 * after the step, and Back mirroring Next glyph by glyph. The Strings
 * presets show a practice answer: local-only (e2e/premium.ts).
 */

const LL = '[data-viz="sliding-window"] section'
const PRESETS = slidingWindowDescriptor.presets.map((p) => p.id)

type Entry = {
  dir: string
  before: { step: string | null; mode: string | null }
  after: { step: string | null; mode: string | null }
  glyphs: string[]
  vectors: ReturnType<typeof glyphVectors>
  overlaps: string[]
  flags: { kind: string; detail: string }[]
  beats: string[]
  verdict: string[]
  timing: { p90: number; ok: boolean; enforce: boolean }
  advisory: string[]
}

for (const width of WIDTHS)
  for (const preset of PRESETS)
    for (const reduced of [false, true])
      test(`sliding-window ${preset} @${width}${reduced ? ' reduced' : ''}: every step both ways`, async ({ page }) => {
        test.skip(localOnly('sliding-window', preset), localOnlyNote('sliding-window', preset))
        test.setTimeout(240_000)
        await page.addInitScript(RECORDER)
        if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/dev/visualizations?sw=${preset}`)
        await expect(page.locator(`${LL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
        const frame = page.locator(LL)
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
            const r = await recordAction(page, LL, () => page.keyboard.press(key))
            const after = await stepOf()
            const health = frameHealth(r.cap, r.at)
            // Timing is judged only when measurable, and enforced only where required (REQUIRE_TIMING).
            const enforce = health.ok && REQUIRE_TIMING
            const s = summarize(r.motions, reduced, enforce)
            const timed = health.ok && !REQUIRE_TIMING ? summarize(r.motions, reduced, true) : s
            const oneStep = before.step !== after.step && Math.abs(Number(after.step) - Number(before.step)) === 1
            // No designed reveal here: every paced step, the last included, plays the three beats.
            const paced = !reduced && oneStep
            const beats = paced ? beatProblems(beatStarts(r.motions), dir, enforce) : []
            const timedBeats = paced && health.ok && !REQUIRE_TIMING ? beatProblems(beatStarts(r.motions), dir, true) : beats
            const advisory = [
              ...timed.flags.map((f) => `${f.kind} ${f.detail}`).filter((x) => !s.flags.some((f) => `${f.kind} ${f.detail}` === x)),
              ...timedBeats.filter((x) => !beats.includes(x)),
            ]
            const verdict = !reduced && oneStep && before.mode === 'ask' && after.mode === 'reveal' ? verdictAfterPayoff(r.cap, r.at) : []
            report.push({
              dir,
              before,
              after,
              glyphs: animatedGlyphs(r.motions, reduced),
              vectors: glyphVectors(r.motions),
              overlaps: overlapProblems(r.cap, r.at),
              flags: s.flags,
              beats,
              verdict,
              timing: { ...health, enforce },
              advisory,
              ...({ key, animated: s.animated, anims: animsOf(r.cap) } as object),
            })
            const stuck = after.step === before.step && (dir === 'back' || after.mode === before.mode)
            if (stuck) break
            await page.waitForTimeout(250)
          }
        }
        await walk('forward')
        await walk('back')
        save(`sliding-window-${preset}-${width}${reduced ? '-reduced' : ''}.json`, report)

        const where = (e: Entry) => `${preset}@${width} ${e.dir} ${e.before.step}->${e.after.step}${reduced ? ' reduced' : ''}`
        const mirrorAdvisory: string[] = []
        strictCheck(`${preset}@${width}: §4 flags`, report.flatMap((e) => e.flags.map((f) => `${where(e)}: ${f.kind} ${f.detail}`)))
        strictCheck(`${preset}@${width}: no text crosses text in motion (G1)`, report.flatMap((e) => e.overlaps.map((o) => `${where(e)} ${o}`)))
        strictCheck(`${preset}@${width}: three beats in order, 560 ms (Q1)`, report.flatMap((e) => e.beats.map((o) => `${where(e)} ${o}`)))
        strictCheck(`${preset}@${width}: the verdict lands after the step (Q4)`, report.flatMap((e) => e.verdict.map((o) => `${where(e)} ${o}`)))
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
              const enforced = mirrorProblems(ahead.vectors, e.vectors, ahead.timing.enforce && e.timing.enforce, ahead.timing.ok && e.timing.ok)
              if (ahead.timing.ok && e.timing.ok && !REQUIRE_TIMING)
                for (const p of mirrorProblems(ahead.vectors, e.vectors, true, true)) if (!enforced.includes(p)) mirrorAdvisory.push(`${where(e)}: ${p}`)
              return enforced.map((p) => `${where(e)}: ${p}`)
            }),
        )
        timingAdvisory(
          `${preset}@${width}`,
          [...report.flatMap((e) => e.advisory.map((a) => `${where(e)} ${a}`)), ...mirrorAdvisory],
          report.filter((e) => !e.timing.ok).map((e) => `${where(e)} p90 ${e.timing.p90} ms`),
        )
      })
