import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { ARROW_HEAD } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { key, label, signed, stackOf, type HullState, type Pt } from './model'

/**
 * turn-stack stage geometry (D16 rules, as the dp table's). Every height is
 * the maximum over every step of the preset on screen, so stepping never
 * moves anything; the code column comes from the preset's lesson group, so
 * a preset switch never moves it.
 *
 * narrow (< 768): the code (a 4-row window that follows the line), then the
 *   panel: its heading names the chain and the rule it pops on; under it the
 *   plot and, beside it, the turn column (`cross(o, a, p)`, the three points,
 *   the value and what it does), which at the end shows what the program
 *   printed. Sized so the code line, the plot, the caption and Next fit a
 *   375x667 phone under the site header (Q15).
 * wide (>= 768): the code on the left; the panel on the right, centred in
 *   the code's height.
 *
 * The plot is one svg drawn 1:1 at the default text size, at most its own
 * width (it scales down, never up, under very large text). Each point's
 * coordinate label takes the first place around it (NE, NW, SE, SW, E, W, then straight above or below)
 * that no point, label or segment the preset ever draws crosses, so a line
 * never runs through a letter. All lengths are px at the default 16 px root
 * and rendered in rem (D19).
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
  /** Code text from 768: mono 13 (`type.value`). */
  text: 13,
  /** Labels, the column's rows: 12 (`type.meta`, `.vz-12`). */
  small: 12,
  codeMin: { md: 296, xl: 360 },
  /** Between the plot and the turn column. */
  split: 12,
} as const

export const PLOT = {
  /** One unit of the lattice. */
  unit: 36,
  /** Margins around the lattice: room for a label on any side. */
  mx: 30,
  my: 18,
  /** A point's radius. */
  r: 4.5,
  /** A label's gap from its point. */
  off: 6,
  /** A label's box above and below its baseline (12 px mono). */
  ascent: 9,
  descent: 2,
  /** What a label keeps clear of: points by this much past their radius, segments by this much. */
  clear: 1.5,
} as const

/** The turn column: one row per line, 16 tall, six rows (the label, o, a, p, the value, the verdict; or the output). */
export const COLUMN = { row: 16, rows: 6 } as const
export const COLUMN_LABEL = 'cross(o,a,p)'

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the frontier's). */
export const STAGE_TIGHT = 200

type Box = { x: number; y: number; w: number; h: number }
export type Seg = readonly [{ x: number; y: number }, { x: number; y: number }]
export type LabelPlace = { x: number; y: number; anchor: 'start' | 'end' | 'middle'; box: Box; side: string }

export type PlotGeometry = {
  width: number
  height: number
  /** Lattice bounds in data units. */
  min: Pt
  max: Pt
  /** Each point's label, by `key`. */
  labels: Record<string, LabelPlace>
}

const r1 = (n: number) => Math.round(n * 10) / 10

export function at(g: Pick<PlotGeometry, 'min' | 'max' | 'height'>, p: Pt) {
  return { x: r1(PLOT.mx + (p[0] - g.min[0]) * PLOT.unit), y: r1(g.height - PLOT.my - (p[1] - g.min[1]) * PLOT.unit) }
}

/** Every segment a state draws: the finished lower chain, the current stack, the turn, the hull. */
export function segmentsOf(g: Pick<PlotGeometry, 'min' | 'max' | 'height'>, s: HullState): Seg[] {
  const out: Seg[] = []
  const path = (pts: readonly Pt[], closed = false) => {
    for (let i = 1; i < pts.length; i++) out.push([at(g, pts[i - 1]), at(g, pts[i])])
    if (closed && pts.length > 2) out.push([at(g, pts[pts.length - 1]), at(g, pts[0])])
  }
  if (s.chain === 'upper') path(s.lower)
  path(stackOf(s), s.chain === 'hull')
  if (s.turn) {
    out.push([at(g, s.turn.o), at(g, s.turn.a)])
    out.push([at(g, s.turn.a), at(g, s.turn.p)])
  }
  return out
}

const segHitsBox = (s: Seg, b: Box, pad: number): boolean => {
  const [x0, y0, x1, y1] = [b.x - pad, b.y - pad, b.x + b.w + pad, b.y + b.h + pad]
  // Liang–Barsky clip.
  const [a, c] = s
  const dx = c.x - a.x
  const dy = c.y - a.y
  let t0 = 0
  let t1 = 1
  for (const [p, q] of [
    [-dx, a.x - x0],
    [dx, x1 - a.x],
    [-dy, a.y - y0],
    [dy, y1 - a.y],
  ]) {
    if (p === 0) {
      if (q < 0) return false
      continue
    }
    const t = q / p
    if (p < 0) {
      if (t > t1) return false
      if (t > t0) t0 = t
    } else {
      if (t < t0) return false
      if (t < t1) t1 = t
    }
  }
  return t0 <= t1
}
const boxesMeet = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
const circleHitsBox = (c: { x: number; y: number }, r: number, b: Box) => {
  const nx = Math.max(b.x, Math.min(c.x, b.x + b.w))
  const ny = Math.max(b.y, Math.min(c.y, b.y + b.h))
  return (nx - c.x) ** 2 + (ny - c.y) ** 2 < r * r
}

/** The label's text: the coordinates, without parentheses (the plot's own shorthand; captions use `(x,y)`). */
export const plotLabel = (p: Pt) => `${p[0]},${p[1]}`

/** Around the point, then straight above or below it, then one step further (`N2`, `S2`). */
const SIDES = ['NE', 'NW', 'SE', 'SW', 'E', 'W', 'N', 'S', 'N2', 'S2'] as const
function candidate(c: { x: number; y: number }, w: number, side: (typeof SIDES)[number]): LabelPlace {
  const { off, ascent, descent, r } = PLOT
  const far = side === 'N2' || side === 'S2' ? 2 * r : side === 'N' || side === 'S' ? r - 2 : 0
  const y = side === 'E' || side === 'W' ? c.y + 4 : side.startsWith('N') ? c.y - off - far : c.y + off + ascent + far
  if (side === 'N' || side === 'S' || side === 'N2' || side === 'S2') return { x: r1(c.x), y: r1(y), anchor: 'middle', box: { x: c.x - w / 2, y: y - ascent, w, h: ascent + descent }, side }
  const right = side === 'NE' || side === 'SE' || side === 'E'
  const x = right ? c.x + off : c.x - off
  const bx = right ? x : x - w
  // An E/W label sits past the point's edge.
  const nudge = side === 'E' ? r : side === 'W' ? -r : 0
  return { x: r1(x + nudge), y: r1(y), anchor: right ? 'start' : 'end', box: { x: bx + nudge, y: y - ascent, w, h: ascent + descent }, side }
}

/** The plot for a preset: its lattice, size and every label's place (clear of every point, label and segment of every step). */
export function layoutPlot(logs: readonly StepLog<HullState>[]): PlotGeometry {
  const pts = logs[0].steps[0].state.points
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const min: Pt = [Math.min(...xs), Math.min(...ys)]
  const max: Pt = [Math.max(...xs), Math.max(...ys)]
  const width = Math.ceil(2 * PLOT.mx + (max[0] - min[0]) * PLOT.unit)
  const height = Math.ceil(2 * PLOT.my + (max[1] - min[1]) * PLOT.unit)
  const g = { min, max, height }
  const segs = logs.flatMap((log) => log.steps.flatMap((s) => segmentsOf(g, s.state)))
  const labels: Record<string, LabelPlace> = {}
  const placed: Box[] = []
  for (const p of pts) {
    const c = at(g, p)
    const w = monoWidth(plotLabel(p), G.small)
    const fits = (b: Box) =>
      b.x >= 0 &&
      b.x + b.w <= width &&
      b.y >= 0 &&
      b.y + b.h <= height &&
      !pts.some((q) => circleHitsBox(at(g, q), PLOT.r + PLOT.clear, b)) &&
      !placed.some((o) => boxesMeet(o, b)) &&
      !segs.some((s) => segHitsBox(s, b, PLOT.clear))
    const pick = SIDES.map((side) => candidate(c, w, side)).find((l) => fits(l.box)) ?? candidate(c, w, 'NE')
    labels[key(p)] = pick
    placed.push(pick.box)
  }
  return { width, height, min, max, labels }
}

/** Every label conflict a preset's plot has (the layout test asserts none). */
export function labelProblems(g: PlotGeometry, logs: readonly StepLog<HullState>[]): string[] {
  const out: string[] = []
  const pts = logs[0].steps[0].state.points
  const boxes = pts.map((p) => [p, g.labels[key(p)].box] as const)
  for (const [p, b] of boxes) {
    if (b.x < 0 || b.x + b.w > g.width || b.y < 0 || b.y + b.h > g.height) out.push(`${label(p)}'s label spills the plot`)
    for (const q of pts) if (circleHitsBox(at(g, q), PLOT.r + PLOT.clear, b)) out.push(`${label(p)}'s label covers ${label(q)}`)
    for (const [q, c] of boxes) if (q !== p && boxesMeet(b, c)) out.push(`${label(p)}'s label meets ${label(q)}'s`)
    logs.forEach((log) =>
      log.steps.forEach((s, i) => {
        if (segmentsOf(g, s.state).some((seg) => segHitsBox(seg, b, PLOT.clear))) out.push(`${log.id} step ${i}: a line crosses ${label(p)}'s label`)
      }),
    )
  }
  return [...new Set(out)]
}

/** A filled arrowhead whose tip is `to`, pointing along `from -> to`, the tip on the point's edge. */
export function turnArrow(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const [ux, uy] = [dx / len, dy / len]
  const tip = { x: to.x - ux * PLOT.r, y: to.y - uy * PLOT.r }
  const { length: l, halfWidth: w } = ARROW_HEAD
  const b = { x: tip.x - ux * l, y: tip.y - uy * l }
  return {
    line: `M${r1(from.x)} ${r1(from.y)}L${r1(b.x)} ${r1(b.y)}`,
    head: `M${r1(tip.x)} ${r1(tip.y)}L${r1(b.x - uy * w)} ${r1(b.y + ux * w)}L${r1(b.x + uy * w)} ${r1(b.y - ux * w)}Z`,
  }
}

/** The output broken after each comma between points, as the column shows it (the pieces spell the printed line). */
export const outputRows = (out: string) => out.split(/(?<=\],)/)

/** The turn column's rows for a state, as text (width and row count are measured from these). */
export function columnRows(s: HullState): string[] {
  if (s.output.length) return s.output.flatMap((o) => outputRows(o)).map((r, i) => (i === 0 ? `› ${r}` : `  ${r}`))
  const t = s.turn
  const v = (p: Pt | undefined) => (p ? label(p) : '–')
  return [
    COLUMN_LABEL,
    `o ${v(t?.o)}`,
    `a ${v(t?.a)}`,
    `p ${v(t?.p ?? s.p ?? undefined)}`,
    t ? `${signed(t.cross)} ${t.cross > 0 ? 'left' : t.cross < 0 ? 'right' : 'straight'}` : '–',
    t ? `${t.pops ? 'pop' : 'keep'} ${label(t.a)}` : '',
  ]
}

export const columnWidth = (logs: readonly StepLog<HullState>[]) =>
  Math.ceil(Math.max(...logs.flatMap((l) => l.steps.flatMap((s) => columnRows(s.state).map((r) => monoWidth(r, G.small))))))

/** The heading's two texts: the chain on the left, the rule on the right (hidden in the tight frame: the code says it too). */
export const chainName = (s: HullState) => (s.chain === null ? 'points' : s.chain === 'hull' ? 'hull' : `${s.chain} chain`)
export const ruleText = (s: HullState) => `cross ${s.op} 0 pops`

export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + CODE_GUTTER
  return { md: Math.max(G.codeMin.md, code), xl: Math.max(G.codeMin.xl, code) }
}

export type TurnStackMetrics = {
  plot: PlotGeometry
  column: number
  /** The content row's height: the plot or the column, whichever is taller. */
  row: number
  code: PerVariant<number>
  /** The panel: heading and content (narrow: plot and column side by side; wide: the column under the plot). */
  panel: PerVariant<number>
  /** The panel in the full lesson column (`vz-col`): side by side again. */
  panelCol: number
  codeColumn: { md: number; xl: number }
}

const panelTop = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content

export function turnStackMetrics(logs: readonly StepLog<HullState>[], all: readonly StepLog<HullState>[] = logs): TurnStackMetrics & { layout: EngineLayout } {
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const cols = codeColumn(maxCols)
  const plot = layoutPlot(logs)
  const column = Math.max(...all.map((l) => columnWidth([l])))
  const row = Math.max(plot.height, COLUMN.row * COLUMN.rows)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  // Side by side on a phone and in the full column; stacked from 768 to the full column, where the code takes the width.
  const panel = { narrow: panelTop(row, G.padNarrow), wide: panelTop(plot.height + G.split + COLUMN.row * COLUMN.rows, G.pad) }
  const panelCol = panelTop(row, G.pad)
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
  const stage = { narrow: code.narrow + G.gap + panel.narrow, wide: Math.max(code.wide, panel.wide, panelCol) }
  const metrics: TurnStackMetrics = { plot, column, row, code, panel, panelCol, codeColumn: cols }
  return { ...metrics, layout: { stage, codeRows, codeCols: maxCols, detail: metrics } }
}
