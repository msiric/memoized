import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../primitives/tokens-v3'
import type { Checkpoint, StepLog } from '../step-log/types'
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
  footerGap: 16,
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

/** Narrowest text width per variant: the stage at 320 px and at 768 px. */
export const MIN_TEXT_WIDTH: PerVariant<number> = { narrow: 288, wide: 606 }

/**
 * Average glyph width in px, padded about 15 % above the system UI font
 * measured in Chromium (6.25 at 14/400, 7.33 at 16/600) to cover other
 * platforms' fonts.
 */
export const GLYPH = { caption: 7.2, prompt: 8.4 } as const

/** Choices sit in two columns; from 768 they sit beside the prompt. */
export const CHOICE = { height: TARGET_PX, gap: TARGET_GAP_PX, wideWidth: 168, textGap: 8, sideGap: 16 } as const
/** The checkpoint's "Skip" text button (44 px target, about 46 px wide at 14/500). */
export const SKIP_WIDTH = 52

/**
 * The controls bar: scrubber row, then the button row, in flow at every
 * width (the sticky dock is removed, D14).
 */
export const BAR: PerVariant<number> = {
  narrow: TARGET_PX + TARGET_GAP_PX + TARGET_PX,
  wide: TARGET_PX + TARGET_GAP_PX + TARGET_PX,
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

const chars = (width: number, glyph: number) => Math.floor(width / glyph)

/**
 * Key cap, gaps and row padding around a choice label (ChoiceRow: 12 + 20 +
 * 8 + label + 12), plus 4 px of slack: the width model is an average, and a
 * one-letter label ("A") is wider than it predicts.
 */
export const CHOICE_CHROME = 56
/** The least room the prompt keeps beside a one-row set of choices. */
export const ROW_TEXT_MIN = 160
/** The wide variant's threshold in px at the default root (`vz-wide`, 37.875rem). */
export const WIDE_MIN = 606

/** A checkpoint's choice column: its longest label plus the row chrome, at most 168. */
export function choiceColumn(cp: Pick<Checkpoint, 'choices'>): number {
  const label = Math.max(...cp.choices.map((c) => Math.ceil(sansWidth(c.label, typeScale.control.size))))
  return Math.min(CHOICE.wideWidth, label + CHOICE_CHROME)
}

/** One row of all choices: its width. */
export function choiceRowWidth(cp: Pick<Checkpoint, 'choices'>): number {
  const n = cp.choices.length
  return n * choiceColumn(cp) + (n - 1) * CHOICE.gap
}

/** The frame width (px at the default root) from which the choices sit in one row beside the prompt. */
export function choiceRowBeside(cp: Pick<Checkpoint, 'choices'>): number {
  return Math.max(WIDE_MIN, choiceRowWidth(cp) + CHOICE.textGap * 3 + SKIP_WIDTH + ROW_TEXT_MIN)
}

/** Height of a checkpoint's choices at frame width `width` in `variant` (one row where it fits, else two columns). */
export function choicesBlockHeight(cp: Pick<Checkpoint, 'choices'>, variant: Variant, width: number): number {
  const n = cp.choices.length
  if (n <= 2) return choicesHeight(n)
  const oneRow = variant === 'narrow' ? choiceRowWidth(cp) <= width : choiceRowBeside(cp) <= width
  return oneRow ? CHOICE.height : choicesHeight(n)
}

export function choicesHeight(count: number): number {
  const rows = Math.ceil(count / 2)
  return rows * CHOICE.height + Math.max(0, rows - 1) * CHOICE.gap
}

/** Width of the checkpoint prompt below 768: beside "Skip". */
export const NARROW_SIDE_TEXT = MIN_TEXT_WIDTH.narrow - SKIP_WIDTH - CHOICE.textGap
/** Width of the checkpoint text from 768: beside the choices and "Skip" (8 px gaps plus 8 px padding). */
export const WIDE_SIDE_TEXT =
  MIN_TEXT_WIDTH.wide - 3 * CHOICE.textGap - (2 * CHOICE.wideWidth + CHOICE.gap) - SKIP_WIDTH

export type DockText = {
  captions: string[]
  prompts: string[]
  feedback: string[]
  maxChoices: number
  checkpoints: Pick<Checkpoint, 'choices'>[]
}

/** Every caption, prompt and feedback one preset can show in the dock. */
export function dockText<S>(log: StepLog<S>): DockText {
  const out: DockText = { captions: [], prompts: [], feedback: [], maxChoices: 0, checkpoints: [] }
  for (const st of log.steps) out.captions.push(st.why)
  // The end caption leads with a recap of the predictions (D21).
  const end = log.steps[log.steps.length - 1].why
  for (const r of allRecaps(log.checkpoints)) out.captions.push(`${r} ${end}`)
  for (const cp of log.checkpoints) {
    out.prompts.push(cp.prompt)
    out.feedback.push(...allFeedbackStrings(cp))
    out.maxChoices = Math.max(out.maxChoices, cp.choices.length)
    out.checkpoints.push(cp)
  }
  return out
}

const maxLines = (texts: string[], maxChars: number) => Math.max(0, ...texts.map((t) => wrapLines(t, maxChars)))

/**
 * The dock estimate at the narrowest width of a variant: the taller of the
 * caption and the checkpoint block. The checkpoint's text cell holds its
 * prompt and every feedback; below 768 the choices sit under it (it shares
 * its row with "Skip"), from 768 beside it.
 */
export function dockSlot(t: DockText, variant: Variant): number {
  const width = MIN_TEXT_WIDTH[variant]
  const caption = maxLines(t.captions, chars(width, GLYPH.caption)) * CAPTION_LINE
  if (t.maxChoices === 0) return caption
  const choices = Math.max(...t.checkpoints.map((cp) => choicesBlockHeight(cp, variant, width)))
  const side = variant === 'narrow' ? NARROW_SIDE_TEXT : WIDE_SIDE_TEXT
  // Stacked, the feedback takes the full row (Skip is gone by then) and
  // Skip takes only the prompt's line (its target overhangs, F1 ruling 2).
  const feedbackWidth = variant === 'narrow' ? width : side
  const text = Math.max(
    maxLines(t.prompts, chars(side, GLYPH.prompt)) * PROMPT_LINE,
    maxLines(t.feedback, chars(feedbackWidth, GLYPH.caption)) * CAPTION_LINE,
  )
  const checkpoint =
    variant === 'narrow' ? Math.max(text, PROMPT_LINE) + CHOICE.textGap + choices : Math.max(text, choices)
  return Math.max(caption, checkpoint)
}

export function headerHeight(presetCount: number, variant: Variant): number {
  if (presetCount < 2) return HEADER.title
  return variant === 'narrow' ? HEADER.title + HEADER.presetRowGap + TARGET_PX : Math.max(HEADER.title, TARGET_PX)
}

export type FrameMetrics = { header: number; stage: number; dock: number; bar: number; footer: number; total: number }

/** The index of a preset id (the default preset when absent or unknown). */
export function presetIndex<S>(def: StepThroughDescriptor<S>, preset?: string): number {
  return Math.max(
    0,
    def.presets.findIndex((p) => p.id === (preset ?? def.defaultPreset)),
  )
}

/** The frame's footprint with preset `index` on screen (R2: per preset). */
export function definitionMetrics<S>(def: StepThroughDescriptor<S>, index = presetIndex(def)): PerVariant<FrameMetrics> {
  const all = def.presets.map((p) => p.log)
  const log = all[index]
  const layout = def.engine.layout([log], all)
  const text = dockText(log)
  const metrics = (variant: Variant): FrameMetrics => {
    const header = headerHeight(def.presets.length, variant)
    const stage = layout.stage[variant]
    const dock = dockSlot(text, variant)
    const bar = BAR[variant]
    const footer = FOOTER[variant]
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
      FRAME.barGap +
      bar +
      FRAME.footerGap +
      footer
    return { header, stage, dock, bar, footer, total }
  }
  return { narrow: metrics('narrow'), wide: metrics('wide') }
}

/** The two numbers the lazy mount needs: [narrow, wide] frame heights, for one preset (the default). */
export function footprintOf<S>(def: StepThroughDescriptor<S>, preset?: string): readonly [number, number] {
  const m = definitionMetrics(def, presetIndex(def, preset))
  return [m.narrow.total, m.wide.total]
}

/** [narrow, wide] per preset id: the lazy mount reserves the preset it renders. */
export function presetFootprints<S>(def: StepThroughDescriptor<S>): Record<string, readonly [number, number]> {
  return Object.fromEntries(def.presets.map((p) => [p.id, footprintOf(def, p.id)]))
}
