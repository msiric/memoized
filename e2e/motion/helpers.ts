import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { RECORDER } from './recorder'
import { motion as MOTION_TOKENS, motionRules, type TweenToken } from '../../src/components/visualizations/primitives/tokens-v3'
import {
  REVEAL,
  animatedGlyphs,
  flagsFor,
  glyphKey,
  motionsAfter,
  integrityDuring,
  overlapsDuring,
  vacates,
  type Capture,
  type ElementMotion,
} from './analyze'

export { REVEAL, animatedGlyphs, glyphKey }

export const GALLERY = '/dev/visualizations'
export const EL = '[data-viz="event-loop"] section'
export const LK = '[data-viz="list-keys"] section'

/** Where JSON reports and frame strips go. Override with MOTION_OUT. */
export const OUT = process.env.MOTION_OUT ?? path.join('e2e', 'motion', 'out')

export function save(name: string, data: unknown) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2))
}

export async function openGallery(
  page: Page,
  opts: { width?: number; height?: number; query?: string; reduced?: boolean } = {},
) {
  await page.addInitScript(RECORDER)
  if (opts.reduced) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: opts.width ?? 1024, height: opts.height ?? 900 })
  await page.goto(GALLERY + (opts.query ?? ''))
  await expect(page.locator(`${EL}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

export async function hydrateListKeys(page: Page) {
  await page.locator('[data-viz="list-keys"]').scrollIntoViewIfNeeded()
  await expect(page.locator(`${LK}[data-viz-interactive="true"]`)).toBeVisible({ timeout: 30_000 })
}

/**
 * List keys (H3 R8): the key and the action are always-visible controls (a
 * select where the segments do not fit); choosing either asks again. A DOM
 * click reaches a segment hidden behind the select fallback too.
 */
export async function lkChoose(page: Page, opts: { key?: string; action?: string; both?: boolean }) {
  const f = page.locator(LK)
  if (opts.both !== undefined) {
    const second = f.locator('input[type="checkbox"]').nth(1)
    if (opts.both !== (await second.isChecked())) await second.click()
    await page.waitForTimeout(300)
  }
  if (opts.key)
    await f.evaluate((el, k) => {
      const radios = [...el.querySelectorAll('[role="radiogroup"][aria-label="Key strategy"] [role="radio"]')] as HTMLElement[]
      radios.find((r) => r.textContent?.trim().toLowerCase() === k.toLowerCase())?.click()
    }, opts.key)
  if (opts.key) await page.waitForTimeout(300)
  if (opts.action) {
    const id = LK_ACTION_ID[opts.action] ?? opts.action
    const same = (await f.getAttribute('data-viz-action')) === id
    const other = ({ type: 'class', class: 'type', 'insert-top': 'append' } as Record<string, string>)[id] ?? 'insert-top'
    if (same && (await f.getAttribute('data-viz-mode')) === 'reveal')
      await f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), other)
    await f.evaluate((el, a) => (el.querySelector(`[data-viz-focus="action-${a}"]`) as HTMLElement).click(), id)
    await page.waitForTimeout(350)
  }
}

export const LK_ACTION_ID: Record<string, string> = {
  'Insert at top': 'insert-top',
  'Delete first': 'delete-first',
  Append: 'append',
  Reverse: 'reverse',
}

export async function startRec(page: Page, root: string) {
  await page.evaluate((sel) => (window as any).__vizRec.start(sel), root)
}
export async function mark(page: Page): Promise<number> {
  return page.evaluate(() => (window as any).__vizRec.mark())
}
export async function stopRec(page: Page): Promise<Capture> {
  return page.evaluate(() => (window as any).__vizRec.stop())
}

/** Records one command: starts the recorder, waits a frame, runs `act`, records `ms`. */
export async function recordAction(page: Page, root: string, act: () => Promise<unknown>, ms = 700) {
  await startRec(page, root)
  await page.waitForTimeout(80)
  const at = await mark(page)
  await act()
  await page.waitForTimeout(ms)
  const cap = await stopRec(page)
  return { cap, at, motions: motionsAfter(cap, at) }
}

/** Elements that tweened an own property (opacity, translate, path) after the command. */
export function animated(ms: ElementMotion[]) {
  return ms
    .map((e) => ({ ...e, props: e.props.filter((p) => p.intermediates > 0 && p.prop !== 'x' && p.prop !== 'y' && p.prop !== 'eff') }))
    .filter((e) => e.props.length)
}

export function summarize(ms: ElementMotion[], reduced = false, timing = true) {
  return {
    animated: animated(ms).map((e) => ({
      label: e.label,
      mounted: e.mounted,
      removed: e.removed,
      props: e.props.map((p) => ({
        prop: p.prop,
        start: p.start,
        end: p.end,
        delay: p.delay,
        duration: p.duration,
        intermediates: p.intermediates,
        overshootPx: p.overshootPx,
        maxStepShare: p.maxStepShare,
        monotonic: p.monotonic,
      })),
    })),
    flags: flagsFor(ms, { reduced, maxGlyphs: motionRules.maxAnimatedPerStep, timing }),
  }
}

export async function activeInfo(page: Page) {
  return page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null
    if (!a || a === document.body) return 'body'
    const viz = a.closest('[data-viz]')?.getAttribute('data-viz') ?? 'outside'
    return `${viz}:${a.tagName.toLowerCase()}[${a.getAttribute('role') ?? ''}]${a.getAttribute('aria-label') ?? a.getAttribute('data-viz-focus') ?? a.textContent?.trim().slice(0, 20)}`
  })
}

/** Web Animations started inside the frame (CSS transitions, FLIP, accelerated opacity). */
export function animsOf(cap: Capture) {
  return cap.anims.map((a) => ({
    t: a.t,
    label: a.label.slice(0, 80),
    kind: a.kind,
    name: a.name,
    duration: a.duration,
    easing: a.easing,
    from: a.from,
    to: a.to,
  }))
}

// ---------------------------------------------------------------------------
// Strict mode (VIZ-H WS2, G). The specs assert by default; MOTION_STRICT=0
// turns the assertions off so a run only records its JSON reports. Failures
// are soft, so one run lists every violation.
// ---------------------------------------------------------------------------

export const STRICT = process.env.MOTION_STRICT !== '0'

/**
 * Timing is enforced wherever frames can be measured. On CI a starved
 * runner may skip it per recording (`frameHealth`), reported as a warning;
 * anywhere else (the local gate, `e2e/gate.sh`) a skip fails, so every
 * merge still passes the timing budgets on a machine that holds 60 Hz.
 * MOTION_REQUIRE_TIMING=1 or 0 overrides.
 */
export const REQUIRE_TIMING = process.env.MOTION_REQUIRE_TIMING ? process.env.MOTION_REQUIRE_TIMING === '1' : !process.env.CI

/** Reports recordings whose timing could not be measured (see REQUIRE_TIMING). */
export function timingSkips(name: string, skipped: string[]) {
  if (!skipped.length) return
  const msg = `${name}: timing not measurable in ${skipped.length} recording(s) (frame gaps p90 > 25 ms): ${skipped.slice(0, 6).join('; ')}`
  if (REQUIRE_TIMING) expect.soft(skipped, `${name}: timing must be measurable here (MOTION_REQUIRE_TIMING)`).toEqual([])
  else {
    console.log(`::warning title=motion timing skipped::${msg}`)
    test.info().annotations.push({ type: 'timing-skipped', description: msg })
  }
}

/** Fails (softly) with the list of problems, unless MOTION_STRICT=0. */
export function strictCheck(name: string, problems: string[]) {
  if (STRICT) expect.soft(problems, name).toEqual([])
}

/** Widths the gated specs run at (G5): MOTION_WIDTHS=375,1024 overrides. */
export const WIDTHS = (process.env.MOTION_WIDTHS ?? process.env.MOTION_WIDTH ?? '375,1024,1440')
  .split(',')
  .map(Number)
  .filter((n) => n > 0)

/**
 * G1 and R2 GB1, GB2: text a moving or fading element prints over or covers,
 * and text that is cut or rewraps while it moves, as readable problems.
 */
export function overlapProblems(cap: Capture, at: number): string[] {
  return [
    ...overlapsDuring(cap, at).map(
      (o) => `+${o.t}ms: ${o.moving.slice(0, 70)} ${o.covers ? 'covers' : 'over'} ${o.over.slice(0, 70)} (${o.area} px²)`,
    ),
    ...integrityDuring(cap, at).map((x) => `+${x.t}ms: ${x.label.slice(0, 70)} ${x.what}`),
  ]
}

/** One glyph's motion for a step: its translate displacement and duration. */
export type GlyphVector = { dx: number; dy: number; ms: number; kind: 'enter' | 'exit' | 'move'; gapMs: number }

/** Per stage glyph, the displacement (end minus start) of its translate and the tween's duration (G4). */
export function glyphVectors(ms: ElementMotion[]): Record<string, GlyphVector> {
  const out: Record<string, GlyphVector> = {}
  for (const e of ms) {
    const k = glyphKey(e.label)
    // A vacate (R1M-13) is outside the budget and the mirror: the glyph fades
    // where a moving glyph arrives, and comes back at once on Back.
    if (!k || vacates(e)) continue
    const tx = e.props.find((p) => p.prop === 'tx' && p.intermediates > 0)
    const ty = e.props.find((p) => p.prop === 'ty' && p.intermediates > 0)
    const op = e.props.find((p) => p.prop === 'op' && p.intermediates > 0)
    if (!tx && !ty && !op) continue
    const num = (v: number | string | undefined) => (typeof v === 'number' ? v : 0)
    const kind = op && op.start === 0 && op.end === 1 ? 'enter' : op && op.start === 1 && op.end === 0 ? 'exit' : 'move'
    const v: GlyphVector = {
      dx: tx ? num(tx.end) - num(tx.start) : 0,
      dy: ty ? num(ty.end) - num(ty.start) : 0,
      ms: Math.max(tx?.duration ?? 0, ty?.duration ?? 0) || (op?.duration ?? 0),
      kind,
      gapMs: Math.max(tx?.maxGapMs ?? 0, ty?.maxGapMs ?? 0, op?.maxGapMs ?? 0),
    }
    // The element that travels is the glyph; keep the larger displacement.
    const prev = out[k]
    if (!prev || Math.hypot(v.dx, v.dy) > Math.hypot(prev.dx, prev.dy)) out[k] = v
  }
  return out
}

const TOKEN_MS = {
  enter: (MOTION_TOKENS.enter.full as TweenToken).duration * 1000,
  exit: (MOTION_TOKENS.exit.full as TweenToken).duration * 1000,
}

/**
 * G4, D8: Back mirrors Next. Per glyph the displacement is negated (within
 * 1 px): an enter from `from` (f -> 0) mirrors as an exit toward `from`
 * (0 -> f), a FLIP move from A to B (A-B -> 0) as (B-A -> 0). Durations match
 * within 20 ms, except that an enter mirrors as an exit and the two tokens
 * differ by design (enter 200 ms, exit 160 ms, the recorded data in
 * e2e/motion/out shows 212 vs 168 at 1024): the difference must then be
 * the tokens' difference. The tolerance is 20 ms plus one 60 Hz frame,
 * because each duration is measured to the frame it was sampled in (a
 * 160 ms exit reads 166 to 182 ms run to run). On a loaded machine that
 * drops paints, the frame is the longest gap observed in either direction.
 */
const MIRROR_MS = 20 + 17
const mirrorTolerance = (f: GlyphVector, b: GlyphVector) => 20 + Math.max(17, Math.ceil(f.gapMs), Math.ceil(b.gapMs))
export function mirrorProblems(fwd: Record<string, GlyphVector>, back: Record<string, GlyphVector>, timing = true): string[] {
  const out: string[] = []
  for (const k of new Set([...Object.keys(fwd), ...Object.keys(back)])) {
    const f = fwd[k]
    const b = back[k]
    if (!f || !b) {
      out.push(`${k}: animates only ${f ? 'forward' : 'back'}`)
      continue
    }
    if (Math.abs(b.dx + f.dx) > 1 || Math.abs(b.dy + f.dy) > 1)
      out.push(`${k}: next moves (${f.dx}, ${f.dy}), back (${b.dx}, ${b.dy}); expected (${-f.dx}, ${-f.dy})`)
    // A console line arrives and leaves on the one `land` token (H3 R2 Q1): no difference.
    const land = /^out-/.test(k)
    const expected =
      !land && f.kind !== b.kind && f.kind !== 'move' && b.kind !== 'move' ? TOKEN_MS[b.kind] - TOKEN_MS[f.kind] : 0
    if (timing && Math.abs(b.ms - f.ms - expected) > Math.max(MIRROR_MS, mirrorTolerance(f, b)))
      out.push(`${k}: next ${f.kind} ${f.ms} ms, back ${b.kind} ${b.ms} ms (expected a ${expected} ms difference)`)
  }
  return out
}

/**
 * The event loop asks "Which logs last?" at Start (VIZ-H R7). Answers it
 * (digit `pick` when focus is in the frame, else a click on that choice) so
 * a walk can step on; a no-op anywhere else.
 */
export async function answerStart(page: Page, frame: string = EL, pick = '2') {
  const f = page.locator(frame)
  if ((await f.getAttribute('data-viz-step')) !== '0' || (await f.getAttribute('data-viz-mode')) !== 'ask') return
  const inside = await f.evaluate((el) => el.contains(document.activeElement))
  if (inside) await page.keyboard.press(pick)
  else await f.locator('[data-viz-region="dock"] [role="radio"]').nth(Number(pick) - 1).click()
  await page.waitForTimeout(300)
}

/**
 * H3 R2 Q1: a paced event-loop step moves in three beats, the code line,
 * then the moving glyph, then the console line and the caption, in 560 ms or
 * less; Back plays them in reverse. Each beat starts when the first of its
 * parts changes on screen (after the command), so the order is read from
 * the frames themselves.
 */
const BEAT_PART = {
  line: /in=code/,
  glyph: /data-glyph|flip-id|chip=/,
  land: /out=|viz-caption/,
} as const
export type BeatStarts = Partial<Record<keyof typeof BEAT_PART, number>> & { end: number; maxGapMs: number }

export function beatStarts(ms: ElementMotion[]): BeatStarts {
  const out: BeatStarts = { end: 0, maxGapMs: 0 }
  for (const e of ms) {
    const props = e.props.filter((p) => p.prop !== 'x' && p.prop !== 'y' && p.prop !== 'eff' && p.prop !== 'w' && p.prop !== 'h')
    if (!props.length) continue
    for (const [beat, re] of Object.entries(BEAT_PART) as [keyof typeof BEAT_PART, RegExp][]) {
      if (!re.test(e.label) || (beat === 'glyph' && BEAT_PART.land.test(e.label))) continue
      const start = Math.min(...props.map((p) => p.delay))
      out[beat] = Math.min(out[beat] ?? Infinity, start)
    }
    out.end = Math.max(out.end, ...props.map((p) => p.delay + p.duration))
    out.maxGapMs = Math.max(out.maxGapMs, ...props.map((p) => p.maxGapMs ?? 0))
  }
  return out
}

/** One frame of slack (a beat may start in the same frame as the one before it). */
const BEAT_SLACK_MS = 20
/**
 * The three beats end within 560 ms (nominally 540: 120 + 260 + 160), plus
 * two frames: the held caption is swapped on a timer, then committed.
 */
export const BEATS_MAX_MS = 560 + 34

/**
 * The measured end can only be read at a sampled frame, and the caption
 * swap commits a frame later, so two frames of slack are added; on a loaded
 * machine (a 2-CPU CI runner) a "frame" is the longest gap actually observed
 * during the step. The motion itself is time-based, so dropped paints delay
 * when the end is seen, not when it happens. On a machine that keeps 60 Hz
 * the budget is exactly `BEATS_MAX_MS`.
 */
export const beatsBudget = (maxGapMs: number) => 560 + 2 * Math.max(17, Math.ceil(maxGapMs))

export function beatProblems(b: BeatStarts, dir: 'forward' | 'back', timing = true): string[] {
  const order = dir === 'forward' ? (['line', 'glyph', 'land'] as const) : (['land', 'glyph', 'line'] as const)
  const seen = order.filter((k) => b[k] !== undefined)
  const out: string[] = []
  for (let i = 1; i < seen.length; i++) {
    const a = b[seen[i - 1]]!
    const c = b[seen[i]]!
    if (c + BEAT_SLACK_MS < a) out.push(`${seen[i]} starts at ${Math.round(c)} ms, before ${seen[i - 1]} (${Math.round(a)} ms)`)
  }
  // A forward step's console line and caption wait for the glyph to land.
  if (dir === 'forward' && b.glyph !== undefined && b.land !== undefined && b.land - b.glyph < 200)
    out.push(`land starts ${Math.round(b.land - b.glyph)} ms after the glyph beat (the glyph has not landed)`)
  const budget = beatsBudget(b.maxGapMs)
  if (timing && b.end > budget) out.push(`the step ends at ${Math.round(b.end)} ms (> ${budget}, longest frame gap ${b.maxGapMs} ms)`)
  return out
}

/**
 * Q4: a checkpoint's verdict (the feedback line and the ✓ or × marks) lands
 * only after the step's motion has landed: its first visible frame is no
 * earlier than the last frame any stage glyph moved, less one frame. Every
 * part is timed: the line and each mark (R2 GB4).
 */
export function verdictAfterPayoff(cap: Capture, at: number): string[] {
  // The step's motion is its moving glyphs (chips); the console line lands with the verdict.
  const glyph = /data-glyph|flip-id|chip=/
  let lastGlyph = -Infinity
  let firstVerdict = Infinity
  const shown = new Map<number, number>()
  for (const f of cap.frames) {
    if (f.t < at) continue
    for (const [id, s] of f.rows) {
      const label = cap.labels[id] ?? ''
      if (glyph.test(label)) lastGlyph = Math.max(lastGlyph, f.t - at)
      // The feedback line and the ✓ and × that replace the numerals (R2 GB4: the marks too).
      const verdictPart = /viz-feedback/.test(label) || (/in=dock/.test(label) && /"[✓×]"/.test(label))
      if (verdictPart && (s as { eff?: number }).eff !== undefined && (s as { eff: number }).eff > 0 && !shown.has(id)) {
        shown.set(id, f.t - at)
        firstVerdict = Math.min(firstVerdict, f.t - at)
      }
    }
  }
  if (firstVerdict === Infinity) return ['no feedback appeared']
  return firstVerdict + BEAT_SLACK_MS < lastGlyph
    ? [`the verdict shows at ${Math.round(firstVerdict)} ms, before the step lands (${Math.round(lastGlyph)} ms)`]
    : []
}
