import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import type { DPState } from './model'

/**
 * dp-table stage geometry (D16 rules, as the sliding window's, whose strip
 * it follows). Every height is the maximum over every step of the preset on
 * screen, so stepping never moves anything; the code column comes from the
 * preset's lesson group, so a preset switch never moves it.
 *
 * narrow (< 768): the code (a 4-row window that follows the line), then the
 *   table panel (its heading names the items and the current one; under it the
 *   dependency arc, the cells, the "this item" bars, the indices and the two
 *   index tags). Sized so the code line, the table, the caption and Next fit
 *   a 375x667 phone under the site header (Q15).
 * wide (>= 768): the code on the left; the table panel on the right,
 *   centred in the code's height.
 *
 * The table is one svg drawn 1:1 at the default text size, at most its own
 * width (it scales down, never up, under very large text). Row labels sit in
 * a gutter left of the cells, so the bar row says what it marks in words.
 * All lengths are px at the default 16 px root and rendered in rem (D19).
 */

export const G = {
  gap: 8,
  columnGap: 16,
  pad: 8,
  padNarrow: 6,
  border: 1,
  label: 16,
  labelGap: 4,
  codeRowsNarrow: 5,
  codeWindowNarrow: 4,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Code text from 768 and cell values: mono 13 (`type.value`). */
  text: 13,
  /** Heading values, indices, tags and row labels: 12 (`type.meta`, `.vz-12`). */
  small: 12,
  codeMin: { md: 296, xl: 360 },
} as const

/** The table: cells 30 wide with 3 between (as the sliding window's strip), the arc lane over them, the bar, the indices and two tag lanes under. */
export const TABLE = {
  cell: 30,
  cellGap: 3,
  /** The dependency arc's lane, over the cells: its peak stays inside, its head lands on the cell's top. */
  arc: 24,
  indexRow: 14,
  indexGap: 2,
  barGap: 4,
  bar: 3,
  tagGap: 5,
  tag: 18,
  tagPad: 5,
  lane: 22,
  /** The row labels' gutter: the widest label, then this gap to the cells. */
  gutterGap: 8,
} as const

export const ROW_LABELS = { cells: 'f', bar: 'this item' } as const

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the frontier's). */
export const STAGE_TIGHT = 200

export type TableGeometry = {
  width: number
  height: number
  /** Each cell's left edge. */
  x: number[]
  gutter: number
  indexY: number
  cellTop: number
  barY: number
  /** The tag lanes' tops: the index's, then the read cell's. */
  lanes: { j: number; read: number }
}

export const tagWidth = (name: string) => Math.ceil(monoWidth(name, G.small) + 2 * TABLE.tagPad)

/** The tags' names: the index as the code names it, and the read cell's index expression. */
export const tagNames = (names: DPState['names']) => ({
  j: names.index,
  read: `${names.index} - ${names.item}`,
})

/** The table for `n` cells: every step of a preset shares it. */
export function layoutTable(n: number, names: DPState['names']): TableGeometry {
  const gutter = Math.ceil(Math.max(monoWidth(ROW_LABELS.bar, G.small), monoWidth(names.table, G.small))) + TABLE.gutterGap
  const cells = n * TABLE.cell + (n - 1) * TABLE.cellGap
  const t = tagNames(names)
  // A tag centred on the last cell may overhang it by half its excess width.
  const overhang = Math.max(0, (Math.max(tagWidth(t.j), tagWidth(t.read)) - TABLE.cell) / 2)
  const width = Math.ceil(gutter + cells + overhang)
  const x = Array.from({ length: n }, (_, i) => gutter + i * (TABLE.cell + TABLE.cellGap))
  // The arc lands on the cells' tops (an arrow ends on its box); the indices sit under the bars, over the tags that name them.
  const cellTop = TABLE.arc
  const barY = cellTop + TABLE.cell + TABLE.barGap
  const indexY = barY + TABLE.bar + TABLE.indexGap
  const j = indexY + TABLE.indexRow + TABLE.tagGap
  const read = j + TABLE.lane
  return {
    width,
    height: read + TABLE.tag,
    x,
    gutter,
    indexY,
    cellTop,
    barY,
    lanes: { j, read },
  }
}

/** A tag's box: centred on its cell, kept inside the cells' span (never over the gutter's labels). */
export function tagBox(g: TableGeometry, name: string, at: number, lane: 'j' | 'read') {
  const w = tagWidth(name)
  const c = g.x[at] + TABLE.cell / 2
  const x = Math.max(g.gutter, Math.min(g.width - w, c - w / 2))
  return { x: Math.round(x * 10) / 10, y: g.lanes[lane], w, h: TABLE.tag }
}

/** The dependency arc from the read cell's top to the written cell's: its path and the points its head is drawn on. */
export function arcPath(g: TableGeometry, from: number, to: number) {
  const a = { x: g.x[from] + TABLE.cell / 2, y: g.cellTop }
  const b = { x: g.x[to] + TABLE.cell / 2, y: g.cellTop }
  const peak = 4
  const c = { x: (a.x + b.x) / 2, y: peak }
  // Quadratic: the head points along the curve's last tangent (control to end).
  return {
    d: `M${r1(a.x)} ${r1(a.y)}Q${r1(c.x)} ${r1(2 * c.y - (a.y + b.y) / 2)} ${r1(b.x)} ${r1(b.y)}`,
    tail: { x: c.x, y: 2 * c.y - (a.y + b.y) / 2 },
    head: b,
  }
}

const r1 = (n: number) => Math.round(n * 10) / 10

/** The heading's label: the items, as the code names them. */
export const headingLabel = (state: DPState) => `nums ${state.nums.join(', ')}`

/** The heading's items after the label: the current item (the target is the last index, under the cells). */
export function headingItems(state: DPState): { name: string; value: string }[] {
  return [{ name: state.names.item, value: state.x === null ? '–' : String(state.x) }]
}

/** The heading's width with the output, px at the default root (it must fit the tight panel on one line). */
export function headingWidth(state: DPState): number {
  const out = state.output.length ? 12 + monoWidth(`› ${state.output.join(' ')}`, G.small) + 4 : 0
  return (
    headingItems(state).reduce((w, v) => w + 12 + sansWidth(v.name, G.small) + 4 + monoWidth(v.value, G.small) + 4, sansWidth(headingLabel(state), G.small)) +
    out
  )
}

/** The panel's content width in the tight frame (`vz-tight`): what the heading must fit. */
export const TIGHT_PANEL = STAGE_TIGHT - 2 * 4 - 2 * G.border

export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + CODE_GUTTER
  return { md: Math.max(G.codeMin.md, code), xl: Math.max(G.codeMin.xl, code) }
}

export type DpTableMetrics = {
  table: TableGeometry
  code: PerVariant<number>
  /** The table panel: heading and drawing. */
  panel: PerVariant<number>
  codeColumn: { md: number; xl: number }
}

const panelTop = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content

export function dpTableMetrics(logs: readonly StepLog<DPState>[], all: readonly StepLog<DPState>[] = logs): DpTableMetrics & { layout: EngineLayout } {
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const cols = codeColumn(maxCols)
  const first = logs[0].steps[0].state
  const table = layoutTable(first.f.length, first.names)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({
    narrow: f('narrow'),
    wide: f('wide'),
  })
  const panel = per((v) => panelTop(table.height, v === 'wide' ? G.pad : G.padNarrow))

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
  const stage = {
    narrow: code.narrow + G.gap + panel.narrow,
    wide: Math.max(code.wide, panel.wide),
  }
  const metrics: DpTableMetrics = { table, code, panel, codeColumn: cols }
  return {
    ...metrics,
    layout: { stage, codeRows, codeCols: maxCols, detail: metrics },
  }
}
