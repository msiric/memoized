import { expect, test, type Page } from '@playwright/test'
import {
  GALLERY,
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

/**
 * The frontier step-through (wave 2A): every step of every preset, in both
 * directions, at full and reduced motion, under the same assertions as the
 * event loop's walk (event-loop-steps.spec.ts): no section 4 flag, no text
 * crossing text in motion (G1), Back mirroring Next (D8, G4), the three
 * beats in order within 560 ms (Q1; the lane's chip on the glyph beat, the
 * console line and caption on the third) and a verdict that lands only after
 * its step (Q4). Writes one JSON report per preset, width and motion mode.
 */

const EL = '[data-viz="bfs-dfs-frontier"] section'
const PRESETS = ['bfs-levels', 'binary-matrix-8dir', 'dijkstra-lazy-heap', 'min-effort-grid', 'bst-iterator-stack']

async function openGallery(page: Page, opts: { width: number; query: string; reduced: boolean }) {
  await page.addInitScript(RECORDER)
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: opts.width, height: 900 })
  await page.goto(GALLERY + opts.query)
  await expect(page.locator(`${EL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

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
      test(`frontier ${preset} @${width}${reduced ? ' reduced' : ''}: every step both ways`, async ({ page }) => {
        test.setTimeout(240_000)
        await openGallery(page, { width, query: `?fr=${preset}`, reduced })
        const frame = page.locator(EL)
        await frame.scrollIntoViewIfNeeded()
        await page.getByRole('slider').first().focus()
        const report: Entry[] = []
        const stepOf = async () => ({
          step: await frame.getAttribute('data-viz-step'),
          mode: await frame.getAttribute('data-viz-mode'),
        })
        const walk = async (dir: 'forward' | 'back') => {
          for (let guard = 0; guard < 60; guard++) {
            const before = await stepOf()
            // Forward: a wrong answer at each question; the reveal still plays.
            const key = dir === 'back' ? 'ArrowLeft' : before.mode === 'ask' ? '2' : 'ArrowRight'
            const r = await recordAction(page, EL, () => page.keyboard.press(key))
            const after = await stepOf()
            const health = frameHealth(r.cap, r.at)
            // Timing is judged only when measurable, and enforced only where required (REQUIRE_TIMING).
            const enforce = health.ok && REQUIRE_TIMING
            const s = summarize(r.motions, reduced, enforce)
            const timed = health.ok && !REQUIRE_TIMING ? summarize(r.motions, reduced, true) : s
            const last = after.step !== null && Number(after.step) === Number(await frame.getAttribute('data-viz-last'))
            const oneStep = before.step !== after.step && Math.abs(Number(after.step) - Number(before.step)) === 1
            // The finale is the reveal (its own timeline, reveal.spec.ts); every other paced step has beats.
            const paced = !reduced && oneStep && !last
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
        save(`frontier-${preset}-${width}${reduced ? '-reduced' : ''}.json`, report)

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
