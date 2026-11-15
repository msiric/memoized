import type { StepLog } from '../../step-log/types'
import { CODE_GUTTER, NARROW_CODE_COLS, codePaneHeight, codeRows as visualRows } from '../../shell/code-geometry'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import type { FrontierScene, FrontierState } from './model'

/**
 * Frontier stage geometry. Every height is the maximum over every step of
 * the preset on screen at the narrowest width of its variant, so stepping
 * never moves anything; widths a preset switch must not move (the code
 * column) come from the preset's lesson group.
 *
 * narrow (< 768): code (a 4-row window that follows the line), the canvas
 *   panel with the console under the drawing, the frontier lane(s). Labels
 *   on top. Sized so the code line, the canvas, the caption and Next fit a
 *   375x667 phone under the site header (Q15), as the event loop does.
 * wide (>= 768): code on the left, the canvas panel and the lane(s) on the
 *   right.
 *   Labels stay on top (one anatomy, Q8): the right column is narrow at
 *   768, and a heap entry needs the lane's whole width.
 *
 * The canvas is one SVG laid out in px at the default root from the scene's
 * layout units; it is drawn at most at its own size and scales down, never
 * up, so a 320 px phone and very large text keep the whole drawing.
 *
 * All lengths are px at the default 16 px root and rendered in rem (D19).
 */

export const G = {
  gap: 8,
  pad: 8,
  padNarrow: 6,
  border: 1,
  laneInset: 6,
  label: 16,
  labelGap: 4,
  chip: 28,
  chipGap: 8,
  frameGap: 4,
  outLine: 20,
  outGap: 6,
  outRowGap: 4,
  outMark: 4,
  codeMin: { md: 296, xl: 360 },
  codeRowsNarrow: 5,
  codeWindowNarrow: 4,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Value text: mono 13 (`type.value`). */
  text: 13,
  /** Badges, weights and tags: 12 (`type.meta`, `type.tag`). */
  small: 12,
  queueRows: 2,
} as const

/** The canvas: node size, pitches and margins, px at the default root. */
export const CANVAS = {
  /** The widest drawing: it must fit the right column at 768 (606 - code - 16) less the panel inset. */
  maxWidth: 244,
  node: 28,
  cell: 32,
  cellGap: 4,
  /** Graph and tree pitches (layout unit to px), before fitting `maxWidth`. */
  pitch: { graph: { x: 80, y: 46 }, tree: { x: 34, y: 44 } },
  /** Room around the drawing for badges (right, top) and weight labels. */
  margin: { x: 4, top: 12, right: 22, bottom: 4 },
  gridMargin: { x: 18, top: 18, right: 4, bottom: 2 },
  badgeGap: 3,
  arrow: 6,
} as const

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the event loop's). */
export const STAGE_TIGHT = 200

export type Point = { x: number; y: number }

export type CanvasGeometry = {
  width: number
  height: number
  /** Centre of each node (graph, tree) or the top-left of each cell (grid), px. */
  at: Record<string, Point>
  /** Node diameter or cell side. */
  size: number
}

/** The scene's drawing in px: graphs and trees by pitch (fitted to `maxWidth`), grids by cell. */
export function canvasGeometry(scene: FrontierScene): CanvasGeometry {
  const units = Object.values(scene.pos)
  const minX = Math.min(...units.map((u) => u[0]))
  const minY = Math.min(...units.map((u) => u[1]))
  const spanX = Math.max(...units.map((u) => u[0])) - minX
  const spanY = Math.max(...units.map((u) => u[1])) - minY
  const m = CANVAS.margin
  if (scene.kind === 'grid') {
    // Room on the left and on top for the row and column numbers.
    const m = CANVAS.gridMargin
    const step = CANVAS.cell + CANVAS.cellGap
    const at = Object.fromEntries(
      Object.entries(scene.pos).map(([id, [x, y]]) => [id, { x: m.x + (x - minX) * step, y: m.top + (y - minY) * step }]),
    )
    return { width: m.x + spanX * step + CANVAS.cell + m.right, height: m.top + spanY * step + CANVAS.cell + m.bottom, at, size: CANVAS.cell }
  }
  const pitch = CANVAS.pitch[scene.kind]
  const r = CANVAS.node / 2
  const fit = spanX ? (CANVAS.maxWidth - m.x - m.right - CANVAS.node) / spanX : pitch.x
  const px = Math.min(pitch.x, fit)
  const at = Object.fromEntries(
    Object.entries(scene.pos).map(([id, [x, y]]) => [id, { x: m.x + r + (x - minX) * px, y: m.top + r + (y - minY) * pitch.y }]),
  )
  return {
    width: Math.ceil(m.x + CANVAS.node + spanX * px + m.right),
    height: Math.ceil(m.top + CANVAS.node + spanY * pitch.y + m.bottom),
    at,
    size: CANVAS.node,
  }
}

const CHIP_PAD = 6
export const chipWidth = (label: string) => Math.ceil(monoWidth(label, G.text) + 2 * CHIP_PAD + 2 * G.border)

/** Rows a left-to-right flow of `widths` takes in `width`. */
export function flowRows(widths: readonly number[], width: number, gap: number): number {
  if (!widths.length) return 0
  let rows = 1
  let used = 0
  for (const w0 of widths) {
    const w = Math.min(w0, width)
    if (used === 0) used = w
    else if (used + gap + w <= width) used += gap + w
    else {
      rows++
      used = w
    }
  }
  return rows
}

/** Console rows: outputs flow left to right, and one longer than the strip wraps onto rows of its own. */
export function consoleRows(out: readonly string[], width: number): number {
  let rows = 0
  let used = 0
  for (const t of out) {
    const w = Math.ceil(monoWidth(`› ${t}`, G.text))
    if (w > width) {
      rows += (used ? 1 : 0) + Math.ceil(w / width)
      used = 0
    } else if (used === 0) {
      rows += 1
      used = w
    } else if (used + G.outGap + w <= width) used += G.outGap + w
    else {
      rows += 1
      used = w
    }
  }
  return Math.max(1, rows)
}

export type FrontierMetrics = {
  code: PerVariant<number>
  canvas: CanvasGeometry
  /** The canvas panel: heading, drawing and, under it, the console line(s). */
  canvasPanel: PerVariant<number>
  /** Console rows reserved inside the canvas panel. */
  consoleRows: PerVariant<number>
  /** Height per lane id, per variant (lanes side by side share their row's height). */
  lanes: Record<string, PerVariant<number>>
  codeColumn: { md: number; xl: number }
}

export function codeColumn(codeCols: number): { md: number; xl: number } {
  const code = Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + CODE_GUTTER
  return { md: Math.max(G.codeMin.md, code), xl: Math.max(G.codeMin.xl, code) }
}

const laneTop = (content: number, pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + content
const rowsHeight = (rows: number, line: number, gap: number) => Math.max(1, rows) * line + (Math.max(1, rows) - 1) * gap
/** A chip in the tight frame (`vz-tight`): mono 12 with 2 px padding (`Lane`'s chip). */
const tightChipWidth = (label: string) => Math.ceil(monoWidth(label, G.small) + 2 * 2 + 2 * G.border)

/** The canvas header's width: its title and every local it names, so the lint can keep it on one line. */
export function headerWidth(state: FrontierState): number {
  const title = sansWidth(state.scene.title, G.small) + 8
  return state.vars.reduce((w, v) => w + 12 + sansWidth(v.name, G.small) + 4 + monoWidth(v.value, G.small), title)
}

export function frontierMetrics(
  logs: readonly StepLog<FrontierState>[],
  all: readonly StepLog<FrontierState>[] = logs,
): FrontierMetrics & { layout: EngineLayout } {
  let maxCols = 1
  for (const log of all) for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
  const cols = codeColumn(maxCols)
  const scene = logs[0].steps[0].state.scene
  const canvas = canvasGeometry(scene)
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  const right = STAGE_MIN.wide - cols.md - 16
  const columns = scene.laneRow ? scene.lanes.length : 1
  /** A lane's content width in a stage `w` wide (lanes side by side split it). */
  const laneIn = (w: number) => (w - (columns - 1) * G.gap) / columns - 2 * G.laneInset
  const panelIn = (w: number) => w - 2 * G.laneInset - 2 * G.border

  // Rows over every step. Narrow is counted at a 375 phone (full chips) and
  // where the frame is narrowest in rem, a phone at very large text
  // (`STAGE_TIGHT`, compact chips), so nothing wraps past its reserve (R9).
  const laneRows: Record<string, PerVariant<number>> = {}
  for (const lane of scene.lanes) laneRows[lane.id] = { narrow: 1, wide: 1 }
  const outRows = { narrow: 1, wide: 1 }
  for (const log of logs)
    for (const { state } of log.steps) {
      for (const lane of scene.lanes) {
        const chips = state.lanes[lane.id] ?? []
        const flow = (w: number, measure: (l: string) => number) =>
          lane.vertical ? chips.length : flowRows(chips.map((c) => measure(c.label)), laneIn(w), G.chipGap)
        laneRows[lane.id].narrow = Math.max(laneRows[lane.id].narrow, flow(309, chipWidth), flow(STAGE_TIGHT, tightChipWidth))
        laneRows[lane.id].wide = Math.max(laneRows[lane.id].wide, flow(right, chipWidth))
      }
      outRows.narrow = Math.max(outRows.narrow, consoleRows(state.console, panelIn(STAGE_TIGHT)))
      outRows.wide = Math.max(outRows.wide, consoleRows(state.console, panelIn(right)))
    }

  const lanes: Record<string, PerVariant<number>> = {}
  for (const v of ['narrow', 'wide'] as const) {
    const height = (id: string) => {
      const lane = scene.lanes.find((l) => l.id === id)!
      const content = rowsHeight(laneRows[id][v], G.chip, lane.vertical ? G.frameGap : G.chipGap)
      return laneTop(content, v === 'wide' ? G.pad : G.padNarrow)
    }
    // Side by side, a row is as tall as its tallest lane.
    const row = Math.max(...scene.lanes.map((l) => height(l.id)))
    for (const lane of scene.lanes) (lanes[lane.id] ??= { narrow: 0, wide: 0 })[v] = scene.laneRow ? row : height(lane.id)
  }
  const consoleH = per((v) => rowsHeight(outRows[v], G.outLine, G.outRowGap))
  const canvasPanel = per((v) => laneTop(canvas.height + G.labelGap + consoleH[v], v === 'wide' ? G.pad : G.padNarrow))

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

  const laneSum = (v: Variant) =>
    scene.laneRow ? G.gap + lanes[scene.lanes[0].id][v] : scene.lanes.reduce((s, l) => s + G.gap + lanes[l.id][v], 0)
  const narrowStage = code.narrow + G.gap + canvasPanel.narrow + laneSum('narrow')
  const wideStage = Math.max(code.wide, canvasPanel.wide + laneSum('wide'))

  const metrics: FrontierMetrics = { code, canvas, canvasPanel, consoleRows: outRows, lanes, codeColumn: cols }
  return {
    ...metrics,
    layout: { stage: { narrow: narrowStage, wide: wideStage }, codeRows, codeCols: maxCols, detail: metrics },
  }
}
