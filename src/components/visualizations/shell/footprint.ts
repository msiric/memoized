import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../primitives/tokens-v3'
import type { Checkpoint, StepLog } from '../step-log/types'
import { CHOICE as CHOICE_GEOMETRY, besideAt, choiceGeometry, choicesHeight } from '../primitives/choice-geometry'
import { sansWidth } from '../substrates/text-metrics'
import { allFeedbackStrings, allRecaps } from './feedback'
import type { PerVariant, StepThroughDescriptor, Variant } from './types'

/**
 * Footprint of the StepThrough frame (spec §3.3). The header, stage, step bar
 * and controls have explicit heights derived from the visual's own content,
 * emitted in rem so they follow the reader's text size (D19). Every reserved
 * band is sized to the preset on screen, not to the worst preset of the
 * visual (R2): a preset switch may change the frame's height, stepping never
 * does.
 *
 * The dock is not reserved from these numbers any more (D15): the shell
 * measures it with a ghost stack of every caption, prompt and feedback, so it
 * is exactly the worst case at the current width and text size. `dockSlot`
 * stays as the estimate at the narrowest width of each variant, which sizes
 * the lazy mount's client-only placeholder (`entry-table.ts`).
 *
 * Pure: imported by the shell, by tests and by the registry-table check.
 */

export const FRAME = {
  border: 1,
  padding: 16,
  headerGap: 16,
  stageGap: 8,
  /** The step's name sits right on its caption (R3: joined to its description). */
  nameGap: 4,
  dockGap: 16,
  barGap: 16,
  /** On a phone the controls sit 12 under the dock (Q15). */
  barGapNarrow: 12,
  footerGap: 16,
  /**
   * On a phone the scrubber ends the controls: its 44 px band already holds
   * 20 px of air under the track, so "Steps as text" follows with only the
   * 8 px two targets keep apart (A5; final polish: the band read as dead space).
   */
  footerGapNarrow: TARGET_GAP_PX,
} as const

export const HEADER = { title: typeScale.title.line, presetRowGap: 8 } as const
/** The step bar: the step's name (14/24 600) left, the counter right (R3). */
export const STEP_BAR = typeScale.stepName.line
/** A code line (P: Code.tsx:137, 13/24). */
export const LINE = 24
/** Caption and reveal feedback lines (R3: 14/24). */
export const CAPTION_LINE = typeScale.caption.line
/** Checkpoint prompt lines (16/28). */
export const PROMPT_LINE = typeScale.prompt.line

/**
 * Narrowest content width per variant (px at the default root): a 320 px
 * phone, where the frame still bleeds (288 px of content, `frame-cls.ts`),
 * and 768. From a 375 px phone the frame sits in the column (H3 R2 Q6): 309.
 */
export const NARROW_MIN = 288
export const MIN_TEXT_WIDTH: PerVariant<number> = { narrow: NARROW_MIN, wide: 606 }
/** The frame's content in the full lesson column (`vz-col`, 47.875rem): 1280 and up. */
export const COL_TEXT_WIDTH = 766

/**
 * Width bands of the narrow variant for the lazy mount's reserve (H3 R2
 * Q16): the content width in rem picks a band, and each band reserves the
 * frame as laid out at its narrowest width, so the reserve is never short
 * under any text size. `phone`: a 375 px phone (309 px of content) and up;
 * `small`: a 320 px phone (the frame bleeds there, 288 px); `tight` and
 * `tighter`: very large text (Chrome's
 * "Very large" on a phone is about 12.9rem, 200 % in a lesson column about
 * 14.9rem).
 */
export const BANDS = { phone: 309, small: 288, tight: 206, tighter: 152 } as const
export type Band = keyof typeof BANDS
export const BAND_ORDER: readonly Band[] = ['phone', 'small', 'tight', 'tighter']

/**
 * Average glyph width in px, padded about 15 % above the system UI font
 * measured in Chromium (6.25 at 14/400, 7.33 at 16/600) to cover other
 * platforms' fonts.
 */
export const GLYPH = { caption: 7.2, prompt: 8.4, note: 6.2 } as const

/** Checkpoint geometry lives in `primitives/choice-geometry.ts` (one model for every visual, Q4). */
export const CHOICE = CHOICE_GEOMETRY
/** The checkpoint's "Skip" text button (44 px target, about 52 px wide at 14/500). */
export const SKIP_WIDTH = CHOICE_GEOMETRY.skip

/**
 * The controls bar: scrubber row, then the button row (Restart, Back, Next,
 * Play), in flow at every width. The row wraps (Next and Play to a second
 * row) only where it cannot fit: Back is an icon below 18rem (`vz-tight`).
 */
export const BAR: PerVariant<number> = {
  narrow: TARGET_PX + TARGET_GAP_PX + TARGET_PX,
  wide: TARGET_PX + TARGET_GAP_PX + TARGET_PX,
}
/** The button row's width: Restart, Back (icon below 18rem), Next (its least width), Play, three gaps. */
const NEXT_MIN = 88
export function buttonRowWidth(width: number): number {
  const back = width < 286 ? TARGET_PX : 84
  return TARGET_PX + back + NEXT_MIN + TARGET_PX + 3 * TARGET_GAP_PX
}
export function barHeight(width: number): number {
  return buttonRowWidth(width) <= width ? BAR.narrow : BAR.narrow + TARGET_GAP_PX + TARGET_PX
}

export const FOOTER: PerVariant<number> = {
  /** "Steps as text" (44) with the provenance line (12/20) below it. */
  narrow: TARGET_PX + typeScale.provenance.line,
  /** Disclosure and provenance on one row. */
  wide: TARGET_PX,
}

/** Greedy word wrap: how many lines `text` needs at `maxChars` per line. */
export function wrapLines(text: string, maxChars: number): number {
  let lines = 1
  let used = 0
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const len = [...word].length
    if (used === 0) used = len
    else if (used + 1 + len <= maxChars) used += 1 + len
    else {
      lines += 1
      used = len
    }
    while (used > maxChars) {
      lines += 1
      used -= maxChars
    }
  }
  return lines
}

const chars = (width: number, glyph: number) => Math.max(1, Math.floor(width / glyph))

/** The wide variant's threshold in px at the default root (`vz-wide`, 37.875rem). */
export const WIDE_MIN = 606

/**
 * The note line under a prompt (G ruling 2, H3 R2 Q2): the earlier answer
 * after Restart ("Last time: <label>"), or, after a press on Next while the
 * question is open, the nudge. One muted 12/20 line, always reserved, so the
 * prompt never moves.
 */
export const LAST_TIME_LINE = typeScale.provenance.line
export const lastTimeText = (label: string) => `Last time: ${label}`
/** Q2: what a press on Next says while a question is open. */
export const NUDGE_TEXT = 'Pick an answer, or Skip.'
/** The longest note a checkpoint can show (its widest "Last time" line, or the nudge). */
export function longestLastTime(cp: Pick<Checkpoint, 'choices'>): string {
  const notes = [NUDGE_TEXT, ...cp.choices.map((c) => lastTimeText(c.value ?? c.label))]
  return notes.sort((a, b) => sansWidth(b, 12) - sansWidth(a, 12))[0]
}

export type DockText = {
  captions: string[]
  prompts: string[]
  /** The longest note line per checkpoint (G ruling 2, Q2). */
  lastTimes: string[]
  feedback: string[]
  /** Every feedback per checkpoint (its text cell's ghosts). */
  feedbackBy: string[][]
  maxChoices: number
  checkpoints: Pick<Checkpoint, 'choices'>[]
}

/** Every caption, prompt and feedback one preset can show in the dock. */
export function dockText<S>(log: StepLog<S>): DockText {
  const out: DockText = { captions: [], prompts: [], lastTimes: [], feedback: [], feedbackBy: [], maxChoices: 0, checkpoints: [] }
  for (const st of log.steps) out.captions.push(st.why)
  // The end caption leads with a recap of the predictions (D21).
  for (const r of allRecaps(log.checkpoints, log.steps[log.steps.length - 1].why)) out.captions.push(`${r.lead} ${r.body}`.trim())
  for (const cp of log.checkpoints) {
    out.prompts.push(cp.prompt)
    out.lastTimes.push(longestLastTime(cp))
    out.feedback.push(...allFeedbackStrings(cp))
    out.feedbackBy.push(allFeedbackStrings(cp))
    out.maxChoices = Math.max(out.maxChoices, cp.choices.length)
    out.checkpoints.push(cp)
  }
  return out
}

const maxLines = (texts: string[], maxChars: number) => Math.max(0, ...texts.map((t) => wrapLines(t, maxChars)))

/**
 * The dock at content width `width` (px at the default root): the taller of
 * the caption and each checkpoint block (Q4: the text cell over the choice
 * row with Skip at its end when narrow; text beside the row from 768).
 */
export function dockAt(t: DockText, width: number, variant: Variant): number {
  const caption = maxLines(t.captions, chars(width, GLYPH.caption)) * CAPTION_LINE
  let worst = caption
  t.checkpoints.forEach((cp, k) => {
    const labels = cp.choices.map((c) => c.label)
    const g = choiceGeometry(labels)
    const wide = variant === 'wide'
    // Beside the choices where the row fits next to the text, else stacked over them (Q4).
    const beside = besideAt(g, width, wide)
    const side = beside ? width - CHOICE.textGap - 8 - (g.n * g.col + g.n * CHOICE.gap + CHOICE.skip) : width
    // The note shares the prompt's line when both fit (Q15), else wraps under it.
    const promptLines = wrapLines(t.prompts[k], chars(side, GLYPH.prompt))
    const inline =
      promptLines === 1 && [...t.prompts[k]].length * GLYPH.prompt + 16 + sansWidth(t.lastTimes[k], 12) <= side
    const text = Math.max(
      promptLines * PROMPT_LINE + (inline ? 0 : wrapLines(t.lastTimes[k], chars(side, GLYPH.note)) * LAST_TIME_LINE),
      maxLines(t.feedbackBy[k] ?? [], chars(side, GLYPH.caption)) * CAPTION_LINE,
    )
    const choices = choicesHeight(labels, width, wide)
    worst = Math.max(worst, beside ? Math.max(text, choices) : text + CHOICE.textGap + choices)
  })
  return worst
}

/** The dock estimate at the narrowest width of a variant. */
export function dockSlot(t: DockText, variant: Variant): number {
  return dockAt(t, variant === 'wide' ? MIN_TEXT_WIDTH.wide : NARROW_MIN, variant)
}

export function headerHeight(presetCount: number, variant: Variant, titleLines = 1): number {
  const title = titleLines * HEADER.title
  if (presetCount < 2) return title
  return variant === 'narrow' ? title + HEADER.presetRowGap + TARGET_PX : Math.max(title, TARGET_PX)
}

/** Lines the frame title takes at content width `width` (16/600). */
export function titleLines(title: string, width: number): number {
  return wrapLines(title, chars(width, GLYPH.prompt))
}

export type FrameMetrics = { header: number; stage: number; dock: number; bar: number; footer: number; total: number }

/** The index of a preset id (the default preset when absent or unknown). */
export function presetIndex<S>(def: StepThroughDescriptor<S>, preset?: string): number {
  return Math.max(
    0,
    def.presets.findIndex((p) => p.id === (preset ?? def.defaultPreset)),
  )
}

/**
 * The frame's footprint with preset `index` on screen (R2: per preset), laid
 * out at content width `width` (px at the default root) in `variant`. The
 * stage is fixed per variant; the title, the dock, the button row and the
 * footer wrap with the width (Q16: the text-scaled part).
 */
export function metricsAt<S>(
  def: StepThroughDescriptor<S>,
  index: number,
  width: number,
  variant: Variant,
): FrameMetrics {
  const all = def.presets.map((p) => p.log)
  const log = all[index]
  const layout = def.engine.layout([log], all)
  const text = dockText(log)
  const header = headerHeight(def.presets.length, variant, titleLines(def.title, variant === 'wide' ? width / 2 : width))
  const stage = layout.stage[variant]
  const dock = dockAt(text, width, variant)
  const bar = variant === 'wide' ? BAR.wide : barHeight(width)
  const provenance = wrapLines(PROVENANCE_MODEL, chars(width, GLYPH.note))
  const footer = variant === 'wide' ? FOOTER.wide : TARGET_PX + provenance * typeScale.provenance.line
  const total =
    2 * FRAME.border +
    2 * FRAME.padding +
    header +
    FRAME.headerGap +
    stage +
    FRAME.stageGap +
    STEP_BAR +
    FRAME.nameGap +
    dock +
    (variant === 'wide' ? FRAME.barGap : FRAME.barGapNarrow) +
    bar +
    (variant === 'wide' ? FRAME.footerGap : FRAME.footerGapNarrow) +
    footer
  return { header, stage, dock, bar, footer, total }
}

/** The provenance line's longest form (the width model for its wrap). */
const PROVENANCE_MODEL = 'Recorded from a real run in Node 24.x'

/** The frame's footprint per variant: narrow at a 375 px phone (`BANDS.phone`), wide at 768. */
export function definitionMetrics<S>(def: StepThroughDescriptor<S>, index = presetIndex(def)): PerVariant<FrameMetrics> {
  return {
    narrow: metricsAt(def, index, BANDS.phone, 'narrow'),
    wide: metricsAt(def, index, MIN_TEXT_WIDTH.wide, 'wide'),
  }
}

/**
 * The lazy mount's reserve for one preset: [narrow, wide, small, tight,
 * tighter] frame heights in px at the default root (Q16). `narrow` is the
 * `phone` band; the placeholder picks a band by its own width in rem.
 */
export type StepFootprint = readonly [number, number, number, number, number]
export function footprintOf<S>(def: StepThroughDescriptor<S>, preset?: string): StepFootprint {
  const i = presetIndex(def, preset)
  const at = (w: number) => metricsAt(def, i, w, 'narrow').total
  return [at(BANDS.phone), metricsAt(def, i, MIN_TEXT_WIDTH.wide, 'wide').total, at(BANDS.small), at(BANDS.tight), at(BANDS.tighter)]
}

/** Every band per preset id: the lazy mount reserves the preset it renders. */
export function presetFootprints<S>(def: StepThroughDescriptor<S>): Record<string, StepFootprint> {
  return Object.fromEntries(def.presets.map((p) => [p.id, footprintOf(def, p.id)]))
}
