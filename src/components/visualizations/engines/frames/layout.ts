import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import type { FState } from './model'

/**
 * Frames stage geometry (D16 rules, as the sliding window's). Every height is
 * the maximum over every step of the preset on screen, so stepping never
 * moves anything; the code column comes from the preset's lesson group, so a
 * preset switch never moves it.
 *
 * narrow (< 768): the code (a 3-row window that follows the line), the
 *   readouts on one line, the lanes stacked, then the console. Sized so the
 *   code line, the lanes, the caption and Next fit a 375x667 phone under the
 *   site header (Q15).
 * wide (>= 768): the code on the left; readouts, lanes and console on the
 *   right, centred in the code's height.
 *
 * Every lane exists on every step of a preset (a frame not on the stack says
 * so in its status chip), so no band appears or disappears mid-run. All
 * lengths are px at the default 16 px root and rendered in rem (D19).
 */

export const G = {
  gap: 8,
  columnGap: 16,
  pad: 8,
  padNarrow: 6,
  border: 1,
  laneInset: 6,
  label: 16,
  labelGap: 4,
  chip: 28,
  chipGap: 8,
  readouts: 16,
  /** A console line: mono 12 on a 16 px line. */
  outLine: 16,
  outGap: 2,
  codeRowsNarrow: 4,
  // Three rows that follow the line on a phone (the sliding window keeps four): the lanes are the
  // subject, and four stacked frames must fit the 375x667 screen with the line, the caption and Next.
  codeWindowNarrow: 3,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Chip values and code from 768: mono 13 (`type.value`). */
  text: 13,
  /** Readouts and console: 12 (`type.meta`). */
  small: 12,
  codeMin: { md: 296, xl: 360 },
} as const

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the frontier's). */
export const STAGE_TIGHT = 200
/** The narrow stage on a 375 phone (the frame's content in the lesson column). */
export const STAGE_PHONE = 309

const chipWidth = (label: string) => Math.ceil(monoWidth(label, G.text) + 2 * 6 + 2 * G.border)
/** A chip in the tight frame (`vz-tight`): mono 12 with 2 px padding (`Lane`'s chip). */
const tightChipWidth = (label: string) => Math.ceil(monoWidth(label, G.small) + 2 * 2 + 2 * G.border)

/** Rows a run of chips takes when it flows into `room` px. */
export function flowRows(widths: readonly number[], room: number, gap: number): number {
  let rows = 1
  let x = 0
  for (const w of widths) {
    const next = x === 0 ? w : x + gap + w
    if (next > room && x > 0) {
      rows++
      x = w
    } else x = next
  }
  return rows
}

/** The readout line's width, px at the default root: every readout and an inline output must fit the tight stage on one line. */
export function readoutWidth(state: FState, inlineOut: boolean): number {
  const vars = state.vars.reduce((w, v) => w + (w ? 12 : 0) + sansWidth(v.name, G.small) + 4 + monoWidth(v.value, G.small) + 4, 0)
  const out = inlineOut && state.output.length ? 12 + monoWidth(`› ${state.output[0]}`, G.small) + 4 : 0
  return vars + out + 2 * 6
}

/** Lines a console entry takes at `room` px (it wraps, never truncates). */
export function outRows(text: string, room: number): number {
  return Math.max(1, Math.ceil(monoWidth(`› ${text}`, G.small) / room - 1e-9))
}

export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + CODE_GUTTER
  return { md: Math.max(G.codeMin.md, code), xl: Math.max(G.codeMin.xl, code) }
}

export type FramesMetrics = {
  code: PerVariant<number>
  /** Each lane's height by lane id. */
  lanes: Record<string, PerVariant<number>>
  readouts: boolean
  /**
   * The output sits at the end of the readout line (as the sliding window's)
   * when no step shows more than one printed line; otherwise it gets the
   * console panel.
   */
  inlineOut: boolean
  /** The console's height (0 when the preset prints nothing or prints inline). */
  console: PerVariant<number>
  codeColumn: { md: number; xl: number }
}

const panel = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content

export function framesMetrics(logs: readonly StepLog<FState>[], all: readonly StepLog<FState>[] = logs): FramesMetrics & { layout: EngineLayout } {
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const cols = codeColumn(maxCols)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  const right = STAGE_MIN.wide - cols.md - G.columnGap
  const laneIn = (w: number) => w - 2 * G.laneInset - 2 * G.border

  // Chip rows per lane over every step: narrow at a 375 phone (full chips) and at the tight frame
  // (compact chips), wide in the right column at 768 (R9).
  const rows: Record<string, PerVariant<number>> = {}
  let readouts = false
  let outNarrow = 0
  let outWide = 0
  let inlineOut = true
  for (const log of logs)
    for (const { state } of log.steps) {
      if (state.vars.length) readouts = true
      if (state.output.length > 1) inlineOut = false
      for (const lane of state.lanes) {
        const labels = lane.chips.map((c) => c.label)
        const r = (rows[lane.id] ??= { narrow: 1, wide: 1 })
        r.narrow = Math.max(r.narrow, flowRows(labels.map(chipWidth), laneIn(STAGE_PHONE), G.chipGap), flowRows(labels.map(tightChipWidth), laneIn(STAGE_TIGHT), G.chipGap))
        r.wide = Math.max(r.wide, flowRows(labels.map(chipWidth), laneIn(right), G.chipGap))
      }
      const conIn = (w: number) => w - 2 * G.padNarrow - 2 * G.border
      outNarrow = Math.max(
        outNarrow,
        state.output.reduce((n, o) => n + outRows(o, conIn(STAGE_PHONE)), 0),
        state.output.reduce((n, o) => n + outRows(o, conIn(STAGE_TIGHT)), 0),
      )
      outWide = Math.max(outWide, state.output.reduce((n, o) => n + outRows(o, right - 2 * G.pad - 2 * G.border), 0))
    }
  // Inline only where the readouts and the output fit one line at the tight stage; else the console panel.
  if (inlineOut && logs.some((l) => l.steps.some((st) => readoutWidth(st.state, true) > STAGE_TIGHT))) inlineOut = false
  // An output printed inline needs the readout line even where nothing else is read out.
  if (inlineOut && logs.some((l) => l.steps.some((st) => st.state.output.length))) readouts = true
  const lanes: Record<string, PerVariant<number>> = {}
  for (const [id, r] of Object.entries(rows))
    lanes[id] = per((v) => panel(r[v] * G.chip + (r[v] - 1) * G.chipGap, v === 'wide' ? G.pad : G.padNarrow))
  const consoleBand = (lines: number, pad: number) => (lines ? panel(lines * G.outLine + (lines - 1) * G.outGap, pad) : 0)
  const con = inlineOut || (!outNarrow && !outWide) ? { narrow: 0, wide: 0 } : { narrow: consoleBand(outNarrow, G.padNarrow), wide: consoleBand(outWide, G.pad) }

  // Code rows count soft-wrapped lines at each variant's narrowest pane (A4).
  let narrowRows = 1
  let wideRows = 1
  for (const log of logs) {
    narrowRows = Math.max(narrowRows, visualRows(log.code?.lines ?? [], NARROW_CODE_COLS))
    wideRows = Math.max(wideRows, visualRows(log.code?.lines ?? [], maxCols))
  }
  const codeRows: PerVariant<number> = {
    narrow: narrowRows <= G.codeRowsNarrow ? narrowRows : G.codeWindowNarrow,
    wide: wideRows <= G.codeRowsMax ? wideRows : G.codeRowsWindow,
  }
  const code = per((v) => codePaneHeight(codeRows[v]))
  const bands = (v: Variant) => [readouts ? G.readouts : 0, ...Object.values(lanes).map((l) => l[v]), con[v]].filter((h) => h > 0)
  const machine = per((v) => bands(v).reduce((a, b) => a + b, 0) + (bands(v).length - 1) * G.gap)
  const stage = { narrow: code.narrow + G.gap + machine.narrow, wide: Math.max(code.wide, machine.wide) }
  const metrics: FramesMetrics = { code, lanes, readouts, inlineOut, console: con, codeColumn: cols }
  return { ...metrics, layout: { stage, codeRows, codeCols: maxCols, detail: metrics } }
}
