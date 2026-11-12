import { TARGET_GAP_PX, TARGET_PX, type as typeScale } from '../primitives/tokens-v3'
import { allFeedback } from './feedback'
import type { PerVariant, StepThroughDescriptor, Variant } from './types'

/**
 * Fixed footprint of the StepThrough frame (spec §3.3). Every region has an
 * explicit height derived from the visual's own content (the largest step,
 * prompt and feedback of every preset), so the frame never moves while
 * stepping, switching presets or answering, and the lazy mount reserves the
 * same box before the engine loads. Reserves are tight: text is wrapped with
 * conservative glyph widths at the narrowest width of each variant, and the
 * end-to-end suite checks that nothing overflows at any width.
 *
 * Pure: imported by the shell, by tests and by the registry-table check.
 */

export const FRAME = {
  border: 1,
  padding: 16,
  headerGap: 16,
  stageGap: 8,
  dockGap: 16,
  barGap: 16,
  footerGap: 16,
} as const

export const HEADER = { title: typeScale.title.line, presetRowGap: 8 } as const
export const STEP_BAR = typeScale.status.line
/** A code line (P: Code.tsx:137, 13/24). */
export const LINE = 24
/** Caption and reveal feedback lines (D3: 14/28). */
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

/**
 * The controls bar: scrubber row, then the button row. Below 768 it is sticky
 * to the viewport bottom while the frame is on screen: a 1 px hairline, 8 px
 * above and 8 px below, so it never sits on the screen edge.
 */
export const BAR: PerVariant<number> = {
  narrow: 1 + 8 + TARGET_PX + TARGET_GAP_PX + TARGET_PX + 8,
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

export function choicesHeight(count: number): number {
  const rows = Math.ceil(count / 2)
  return rows * CHOICE.height + Math.max(0, rows - 1) * CHOICE.gap
}

/** Width of the text column beside the choices, from 768. */
export const WIDE_SIDE_TEXT = MIN_TEXT_WIDTH.wide - CHOICE.sideGap - (2 * CHOICE.wideWidth + CHOICE.gap)

export type DockText = { captions: string[]; prompts: string[]; feedback: string[]; maxChoices: number }

export function dockText<S>(def: StepThroughDescriptor<S>): DockText {
  const out: DockText = { captions: [], prompts: [], feedback: [], maxChoices: 0 }
  for (const p of def.presets) {
    for (const st of p.log.steps) out.captions.push(st.why)
    for (const cp of p.log.checkpoints) {
      out.prompts.push(cp.prompt)
      out.feedback.push(...allFeedback(cp))
      out.maxChoices = Math.max(out.maxChoices, cp.choices.length)
    }
  }
  return out
}

const maxLines = (texts: string[], maxChars: number) => Math.max(0, ...texts.map((t) => wrapLines(t, maxChars)))

/**
 * The dock body: one slot shared by the caption, the checkpoint (prompt and
 * choices) and the reveal (feedback and marked choices). Below 768 the
 * choices sit under the text; from 768 beside it.
 */
export function dockSlot(t: DockText, variant: Variant): number {
  const width = MIN_TEXT_WIDTH[variant]
  const caption = maxLines(t.captions, chars(width, GLYPH.caption)) * CAPTION_LINE
  if (t.maxChoices === 0) return caption
  const choices = choicesHeight(t.maxChoices)
  if (variant === 'narrow') {
    const ask = maxLines(t.prompts, chars(width, GLYPH.prompt)) * PROMPT_LINE + CHOICE.textGap + choices
    const reveal = maxLines(t.feedback, chars(width, GLYPH.caption)) * CAPTION_LINE + CHOICE.textGap + choices
    return Math.max(caption, ask, reveal)
  }
  const ask = maxLines(t.prompts, chars(WIDE_SIDE_TEXT, GLYPH.prompt)) * PROMPT_LINE
  const reveal = maxLines(t.feedback, chars(WIDE_SIDE_TEXT, GLYPH.caption)) * CAPTION_LINE
  return Math.max(caption, ask, reveal, choices)
}

export function headerHeight(presetCount: number, variant: Variant): number {
  if (presetCount < 2) return HEADER.title
  return variant === 'narrow' ? HEADER.title + HEADER.presetRowGap + TARGET_PX : Math.max(HEADER.title, TARGET_PX)
}

export type FrameMetrics = { header: number; stage: number; dock: number; bar: number; footer: number; total: number }

export function definitionMetrics<S>(def: StepThroughDescriptor<S>): PerVariant<FrameMetrics> {
  const layout = def.engine.layout(def.presets.map((p) => p.log))
  const text = dockText(def)
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
      FRAME.dockGap +
      dock +
      FRAME.barGap +
      bar +
      FRAME.footerGap +
      footer
    return { header, stage, dock, bar, footer, total }
  }
  return { narrow: metrics('narrow'), wide: metrics('wide') }
}

/** The two numbers the lazy mount needs: [narrow, wide] frame heights. */
export function footprintOf<S>(def: StepThroughDescriptor<S>): readonly [number, number] {
  const m = definitionMetrics(def)
  return [m.narrow.total, m.wide.total]
}
