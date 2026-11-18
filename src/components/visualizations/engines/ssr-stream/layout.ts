import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import { BADGE_TEXT, SLOT_BUTTON, SLOT_TITLE, type SSRState, type Slot } from './model'

/**
 * ssr-stream stage geometry (D16 rules). No code pane: the stage is the
 * wire and the screen, each a panel whose drawing is one svg laid out 1:1
 * at the default text size and at most its own width, so under very large
 * text it scales down, never clips (as the dp table's strip). Every height
 * is the maximum over every step of the preset on screen, so stepping never
 * moves anything.
 *
 * narrow (< 768): the wire panel (each write's lines beside its time), then
 *   the screen panel (Header, the two slots with their badges, the handler
 *   log). wide (>= 768): the wire on the left, the screen on the right,
 *   both the taller one's height.
 *
 * Text: wire lines mono 12, labels sans 12, the handler log mono 13 (as the
 * console). All lengths are px at the default 16 px root, rendered in rem.
 */

export const G = {
  gap: 8,
  columnGap: 16,
  pad: 8,
  padNarrow: 6,
  border: 1,
  label: 16,
  labelGap: 4,
  /** A wire line: mono 12 on a 16 px row. */
  row: 16,
  /** The time column of the wire: "120 ms" in sans 12 (about 40 px) from x 2, then the gap. */
  timeCol: 46,
  /** The screen: the Header bar, two slots, the handler log. */
  header: 20,
  slot: 40,
  slotGap: 6,
  slotPad: 8,
  /** The handler log: one console line, mono 13 on 20. */
  out: 20,
  /** A tag (badge, button, click): sans 12 on a 20 px chip, 6 px each side. */
  tag: 20,
  tagPad: 6,
} as const

/** The widest wire line, in columns (the cuts keep every line within it). */
export const WIRE_COLS = 31

/** The drawings' width: the narrow panel's content at 320 (288 less the inset and borders). */
export const DRAW_W = 288 - 2 * G.padNarrow - 2 * G.border

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }

export type SsrMetrics = {
  wire: PerVariant<number>
  screen: PerVariant<number>
  /** Wire rows reserved (the preset's last step holds every line). */
  rows: number
  /** The wire drawing's size (px at 1:1). */
  wireDraw: { w: number; h: number }
  screenDraw: { w: number; h: number }
}

const panel = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content

/** The screen drawing's content: Header, two slots, the handler log. */
export const SCREEN_CONTENT = G.header + G.slotGap + G.slot + G.slotGap + G.slot + G.slotGap + G.out

export const slotTop = (k: number) => G.header + G.slotGap + k * (G.slot + G.slotGap)
export const OUT_TOP = slotTop(2)

export const tagW = (text: string) => Math.ceil(sansWidth(text, 12) + 2 * G.tagPad)
export const slotLabel = (s: Slot, ms: number) => `${SLOT_TITLE[s]} · data ${ms} ms`
export const END_TEXT = 'end'

/** The widest thing a slot row holds: its label or its body, then the widest badge (problems if it overflows). */
export function slotRowWidth(s: Slot, ms: number): number {
  const badge = Math.max(...Object.values(BADGE_TEXT).map(tagW))
  const body = sansWidth(SLOT_TITLE[s], 12) + 8 + tagW(SLOT_BUTTON[s]) + (s === 'reviews' ? 6 + tagW('click') : 0)
  const fallback = sansWidth(`Loading ${s}`, 12)
  return G.slotPad + Math.max(sansWidth(slotLabel(s, ms), 12), body, fallback) + 8 + badge + G.slotPad
}

/** The px width of the widest wire row: time column, line, and on the last row the end mark. */
export function wireWidth(logs: readonly StepLog<SSRState>[]): number {
  let w = 0
  for (const log of logs) {
    const wire = log.steps[log.steps.length - 1].state.wire
    wire.forEach((l, i) => {
      const end = i === wire.length - 1 ? 8 + sansWidth(END_TEXT, 12) : 0
      w = Math.max(w, G.timeCol + monoWidth(l.text, 12) + end)
    })
  }
  return Math.ceil(w)
}

export function ssrMetrics(logs: readonly StepLog<SSRState>[]): SsrMetrics & { layout: EngineLayout } {
  let rows = 1
  for (const log of logs) for (const s of log.steps) rows = Math.max(rows, s.state.wire.length)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  const pad = (v: Variant) => (v === 'wide' ? G.pad : G.padNarrow)
  const wireDraw = { w: DRAW_W, h: rows * G.row }
  const screenDraw = { w: DRAW_W, h: SCREEN_CONTENT }
  const wire = per((v) => panel(wireDraw.h, pad(v)))
  const screen = per((v) => panel(screenDraw.h, pad(v)))
  const stage = {
    narrow: wire.narrow + G.gap + screen.narrow,
    wide: Math.max(wire.wide, screen.wide),
  }
  const tall = stage.wide
  const metrics: SsrMetrics = { wire: { ...wire, wide: tall }, screen: { ...screen, wide: tall }, rows, wireDraw, screenDraw }
  return { ...metrics, layout: { stage, codeRows: { narrow: 0, wide: 0 }, detail: metrics } }
}
