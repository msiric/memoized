import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import type { SWState } from './model'

/**
 * Sliding-window stage geometry (D16 rules, as the frontier's). Every height
 * is the maximum over every step of the preset on screen, so stepping never
 * moves anything; the code column comes from the preset's lesson group, so a
 * preset switch never moves it.
 *
 * narrow (< 768): the code (a 4-row window that follows the line), the
 *   strip panel (its heading names the limit, the window's length and the
 *   best length; under it the cells, the window band and the two edge tags),
 *   then the store lane. Sized so the code line, the strip, the caption and
 *   Next fit a 375x667 phone under the site header (Q15).
 * wide (>= 768): the code on the left; the strip panel over the store lane
 *   on the right, centred in the code's height.
 *
 * The strip is one svg drawn 1:1 at the default text size, at most its own
 * width (it scales down, never up, under very large text). All lengths are
 * px at the default 16 px root and rendered in rem (D19).
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
  codeRowsNarrow: 5,
  codeWindowNarrow: 4,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Code text from 768 and chip values: mono 13 (`type.value`). */
  text: 13,
  /** Heading values, indices and tags: 12 (`type.meta`, `.vz-12`). */
  small: 12,
  codeMin: { md: 296, xl: 360 },
} as const

/** The strip: cells 30 wide with 3 between (8 cells fit beside a 35-column pane at 768), indices above, the band and two tag lanes under. */
export const STRIP = {
  cell: 30,
  cellGap: 3,
  indexRow: 14,
  indexGap: 2,
  bandGap: 4,
  band: 3,
  tagGap: 5,
  tag: 18,
  tagPad: 5,
  lane: 22,
} as const

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the frontier's). */
export const STAGE_TIGHT = 200

export type StripGeometry = {
  width: number
  height: number
  /** Each cell's left edge. */
  x: number[]
  cellTop: number
  bandY: number
  /** The tag lanes' tops: the left edge's, then the right edge's. */
  lanes: { left: number; right: number }
}

export const tagWidth = (name: string) => Math.ceil(monoWidth(name, G.small) + 2 * STRIP.tagPad)

/** The strip for a string of `n` cells and the two edge names: every step of a preset shares it. */
export function layoutStrip(n: number, names: { left: string; right: string }): StripGeometry {
  const cells = n * STRIP.cell + (n - 1) * STRIP.cellGap
  const width = Math.max(cells, tagWidth(names.left), tagWidth(names.right))
  const x0 = (width - cells) / 2
  const x = Array.from({ length: n }, (_, i) => x0 + i * (STRIP.cell + STRIP.cellGap))
  const cellTop = STRIP.indexRow + STRIP.indexGap
  const bandY = cellTop + STRIP.cell + STRIP.bandGap
  const left = bandY + STRIP.band + STRIP.tagGap
  const right = left + STRIP.lane
  return { width, height: right + STRIP.tag, x, cellTop, bandY, lanes: { left, right } }
}

/** A tag's box: centred on its cell, kept inside the strip. */
export function tagBox(g: StripGeometry, name: string, at: number, lane: 'left' | 'right') {
  const w = tagWidth(name)
  const c = g.x[at] + STRIP.cell / 2
  const x = Math.max(0, Math.min(g.width - w, c - w / 2))
  return { x: Math.round(x * 10) / 10, y: g.lanes[lane], w, h: STRIP.tag }
}

/** The band from the left edge's cell to the right edge's, as [x, width]. */
export function bandSpan(g: StripGeometry, left: number, right: number): [number, number] {
  const a = g.x[left]
  const b = g.x[right] + STRIP.cell
  return [a, Math.max(0, b - a)]
}

/** A store chip's label: `a: 2` for a count map, the member for a Set. */
export const chipLabel = (e: { key: string; count?: number }) => (e.count === undefined ? e.key : `${e.key}: ${e.count}`)

const chipWidth = (label: string) => Math.ceil(monoWidth(label, G.text) + 2 * 6 + 2 * G.border)
/** A chip in the tight frame (`vz-tight`): mono 12 with 2 px padding (`Lane`'s chip). */
const tightChipWidth = (label: string) => Math.ceil(monoWidth(label, G.small) + 2 * 2 + 2 * G.border)

function flowRows(widths: readonly number[], room: number, gap: number): number {
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

/**
 * The heading's items after the string's name: the limit K (a count map),
 * the window's length (a Set, whose bug is a length its members do not
 * match) and the best length.
 */
export function headingItems(state: SWState): { name: string; value: string }[] {
  const map = state.names.storeKind === 'map'
  return [
    ...(map && state.k !== undefined ? [{ name: 'K', value: String(state.k) }] : []),
    ...(map ? [] : [{ name: 'length', value: String(state.right === null ? 0 : state.right - state.left + 1) }]),
    { name: state.names.best, value: String(state.best) },
  ]
}

/** The store lane's label: the map with its key count (the shrink condition's left side), the Set with its size. */
export function storeLabel(state: SWState): string {
  const n = state.store.length
  return state.names.storeKind === 'map' ? `${state.names.store}: ${n} ${n === 1 ? 'key' : 'keys'}` : `${state.names.store}: size ${n}`
}

/** The heading's width with the output, px at the default root (it must fit the tight panel on one line). */
export function headingWidth(state: SWState): number {
  const out = state.output.length ? 12 + monoWidth(`› ${state.output.join(' ')}`, G.small) + 4 : 0
  return headingItems(state).reduce((w, v) => w + 12 + sansWidth(v.name, G.small) + 4 + monoWidth(v.value, G.small) + 4, sansWidth('s', G.small)) + out
}

/** The panel's content width in the tight frame (`vz-tight`): what the heading and the store label must fit. */
export const TIGHT_PANEL = STAGE_TIGHT - 2 * 4 - 2 * G.border

export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + CODE_GUTTER
  return { md: Math.max(G.codeMin.md, code), xl: Math.max(G.codeMin.xl, code) }
}

export type SlidingWindowMetrics = {
  strip: StripGeometry
  code: PerVariant<number>
  /** The strip panel: heading and drawing. */
  stripPanel: PerVariant<number>
  store: PerVariant<number>
  codeColumn: { md: number; xl: number }
}

const panelTop = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content

export function slidingWindowMetrics(
  logs: readonly StepLog<SWState>[],
  all: readonly StepLog<SWState>[] = logs,
): SlidingWindowMetrics & { layout: EngineLayout } {
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const cols = codeColumn(maxCols)
  const first = logs[0].steps[0].state
  const strip = layoutStrip(first.text.length, first.names)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  const right = STAGE_MIN.wide - cols.md - G.columnGap
  const laneIn = (w: number) => w - 2 * G.laneInset - 2 * G.border

  // Store rows over every step: narrow at a 375 phone (full chips) and at the
  // tight frame (compact chips), wide in the right column at 768 (R9).
  const rows = { narrow: 1, wide: 1 }
  for (const log of logs)
    for (const { state } of log.steps) {
      const labels = state.store.map(chipLabel)
      rows.narrow = Math.max(rows.narrow, flowRows(labels.map(chipWidth), laneIn(309), G.chipGap), flowRows(labels.map(tightChipWidth), laneIn(STAGE_TIGHT), G.chipGap))
      rows.wide = Math.max(rows.wide, flowRows(labels.map(chipWidth), laneIn(right), G.chipGap))
    }
  const store = per((v) => panelTop(rows[v] * G.chip + (rows[v] - 1) * G.chipGap, v === 'wide' ? G.pad : G.padNarrow))
  const stripPanel = per((v) => panelTop(strip.height, v === 'wide' ? G.pad : G.padNarrow))

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
  const machine = per((v) => stripPanel[v] + G.gap + store[v])
  const stage = { narrow: code.narrow + G.gap + machine.narrow, wide: Math.max(code.wide, machine.wide) }
  const metrics: SlidingWindowMetrics = { strip, code, stripPanel, store, codeColumn: cols }
  return { ...metrics, layout: { stage, codeRows, codeCols: maxCols, detail: metrics } }
}
