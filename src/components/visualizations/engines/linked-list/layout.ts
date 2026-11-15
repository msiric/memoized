import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth } from '../../substrates/text-metrics'
import { W, layoutList, type ListGeometry } from './geometry'
import type { LLState } from './model'

/**
 * Stage geometry for the pointer-rewiring step-through (D16 rules, as the
 * event loop's). Every height is the maximum over every step of the preset,
 * so stepping never moves anything.
 *
 * narrow (< 768): the code (a 4-row window that follows the line), then the
 *   drawing, 288 wide, centred.
 * wide (>= 768): the code on the left, the drawing on the right, centred in
 *   the column's height. The code column is capped so the drawing keeps its
 *   288 px at 768 (longer lines soft-wrap, A4); from 1280 it is wider.
 */

export const G = {
  gap: 8,
  columnGap: 16,
  /** A phone shows a listing of up to 5 rows whole; a longer one in a 4-row window (Q7, Q15). */
  codeRowsNarrow: 5,
  codeWindowNarrow: 4,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Code text from 768: mono 13. */
  codeText: 13,
  /** Code column minimum from 1280. */
  codeMinXl: 360,
} as const

/** The narrowest stage per variant: a 320 px phone, and 768. */
export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }

/** The widest code column at 768: the drawing keeps its full width beside it. */
const CODE_COLUMN_MAX = STAGE_MIN.wide - G.columnGap - W

export function wideCodeCols(codeCols: number): number {
  const fit = Math.floor((CODE_COLUMN_MAX - CODE_GUTTER) / monoWidth('x', G.codeText))
  return Math.min(codeCols, fit)
}

/** The code column from 768 (capped) and from 1280 (the whole code, at least 360). */
export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.codeText)) + CODE_GUTTER
  return { md: Math.min(CODE_COLUMN_MAX, code), xl: Math.max(G.codeMinXl, code) }
}

export type LinkedListMetrics = {
  geometry: ListGeometry
  code: PerVariant<number>
  codeColumn: { md: number; xl: number }
}

export function linkedListMetrics(
  logs: readonly StepLog<LLState>[],
  all: readonly StepLog<LLState>[] = logs,
): LinkedListMetrics & { layout: EngineLayout } {
  // One preset on screen: its own drawing (the shell passes one log).
  const geometry = layoutList(logs.flatMap((l) => l.steps.map((s) => s.state)))
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const wideCols = wideCodeCols(maxCols)
  let narrowRows = 1
  let wideRows = 1
  for (const log of logs) {
    narrowRows = Math.max(narrowRows, visualRows(log.code?.lines ?? [], NARROW_CODE_COLS))
    wideRows = Math.max(wideRows, visualRows(log.code?.lines ?? [], wideCols))
  }
  const codeRows: PerVariant<number> = {
    narrow: narrowRows <= G.codeRowsNarrow ? narrowRows : G.codeWindowNarrow,
    wide: wideRows <= G.codeRowsMax ? wideRows : G.codeRowsWindow,
  }
  const code = { narrow: codePaneHeight(codeRows.narrow), wide: codePaneHeight(codeRows.wide) }
  const stage = {
    narrow: code.narrow + G.gap + geometry.height,
    wide: Math.max(code.wide, geometry.height),
  }
  const metrics: LinkedListMetrics = { geometry, code, codeColumn: codeColumn(maxCols) }
  return { ...metrics, layout: { stage, codeRows, codeCols: wideCols, detail: metrics } }
}
