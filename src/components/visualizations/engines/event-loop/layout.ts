import type { StepLog } from '../../step-log/types'
import { codePaneHeight } from '../../shell/CodePane'
import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import { monoWidth } from '../../substrates/text-metrics'
import type { ElChip, EventLoopState } from './model'

/**
 * Event-loop stage geometry (VIZ-H D16). Every height is the maximum over
 * every step of every preset at the narrowest width of its variant, so the
 * stage never moves while stepping or switching presets.
 *
 * narrow (< 768): the phone composition, built to pass the 375x667 fit test:
 *   code (5-line window)
 *   Call stack | Host          lanes as a 2x2 grid, labels on top
 *   Microtasks | Tasks
 *   console (one left-to-right strip)
 *
 * wide (>= 768): source and output on the left, the machine on the right:
 *   code            | Call stack (takes the spare height: a stack well)
 *   console (strip) | Host
 *                   | Microtasks
 *                   | Tasks
 *
 * Overflow policy (A1): a queue wraps to a second row, then collapses its
 * tail into a `+N more` chip; the console keeps the newest outputs and
 * collapses the oldest into `N earlier`. The full lists are always in
 * "Steps as text". What is visible is decided from the variant's narrowest
 * width with the shared width model, so the server markup is final.
 *
 * All lengths are px at the default 16 px root and rendered in rem (D19).
 */

export const G = {
  gap: 8,
  pad: 8,
  border: 1,
  label: 16,
  labelGap: 4,
  chip: 28,
  chipGap: 8,
  /** Stack frames: 28 tall when the stage is narrow, 32 from 768. */
  frame: { narrow: 28, wide: 32 } as PerVariant<number>,
  frameGap: 4,
  /** Inline lane label column (wide queues): `w-24`. */
  inlineLabel: 96,
  /** Console strip: one output line, the gap between outputs and between rows. */
  outLine: 20,
  outGap: 8,
  outRowGap: 4,
  /** The `›` before each output and its gap. */
  outMark: 4,
  /** Wide grid: code column min width (from 768, from 1280), lanes column min width. */
  codeMin: { md: 296, xl: 360 },
  regionsMin: 240,
  codeRowsNarrow: 5,
  codeRowsMax: 14,
  codeRowsWindow: 12,
  /** Most rows a queue or the console may take before collapsing. */
  queueRows: 2,
  consoleRows: 3,
  /** Chip text: mono 13 (`type.value`). */
  text: 13,
} as const

/** Narrowest stage width per variant (the stage at 320 and at 768). */
export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }

export type LaneKind = 'frame' | 'host' | 'micro' | 'task'

/** Horizontal padding inside a chip, per kind (pills are rounder). */
const CHIP_PAD: Record<LaneKind, number> = { frame: 8, host: 8, micro: 12, task: 8 }

export function chipWidth(label: string, kind: LaneKind): number {
  return Math.ceil(monoWidth(label, G.text) + 2 * CHIP_PAD[kind] + 2 * G.border)
}

export const moreLabel = (n: number) => `+${n} more`
export const earlierLabel = (n: number) => `${n} earlier`

/** Width of one console output token (`› value`). */
export function outWidth(text: string): number {
  return Math.ceil(monoWidth('›', G.text) + G.outMark + monoWidth(text, G.text))
}

/** Rows a left-to-right flow of `widths` takes in `width`, with `gap` between items. */
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

/**
 * How many chips of a queue are visible in `rows` rows of `width`: all of
 * them, or the head of the queue followed by a `+N more` chip.
 */
export function queueVisible(chips: readonly ElChip[], kind: LaneKind, width: number, rows: number): number {
  const ws = chips.map((c) => chipWidth(c.label, kind))
  if (flowRows(ws, width, G.chipGap) <= rows) return chips.length
  for (let k = chips.length - 1; k >= 0; k--) {
    const withMore = [...ws.slice(0, k), chipWidth(moreLabel(chips.length - k), 'task')]
    if (flowRows(withMore, width, G.chipGap) <= rows) return k
  }
  return 0
}

/**
 * How many of the newest console outputs are visible in `rows` rows: all of
 * them, or an `N earlier` token followed by the newest outputs.
 */
export function consoleVisible(out: readonly string[], width: number, rows: number): number {
  const ws = out.map(outWidth)
  if (flowRows(ws, width, G.outGap) <= rows) return out.length
  for (let k = out.length - 1; k >= 1; k--) {
    const tail = [outWidth(earlierLabel(out.length - k)), ...ws.slice(out.length - k)]
    if (flowRows(tail, width, G.outGap) <= rows) return k
  }
  return 1
}

/** A lane: border, padding, a 16 px label above (4 px gap), then `content`. */
const laneTop = (content: number) => 2 * G.border + 2 * G.pad + G.label + G.labelGap + content
/** A lane with its label inline (wide queues): border, padding, content. */
const laneInline = (content: number) => 2 * G.border + 2 * G.pad + content
const rowsHeight = (rows: number, line: number, gap: number) => Math.max(1, rows) * line + (Math.max(1, rows) - 1) * gap

export type EventLoopMetrics = {
  code: PerVariant<number>
  /** Lane heights; on narrow, the two lanes of a grid row share one height. */
  stackLane: PerVariant<number>
  hostLane: PerVariant<number>
  queueLane: PerVariant<number>
  console: PerVariant<number>
  /** Rows reserved per queue and for the console strip, per variant. */
  queueRows: PerVariant<number>
  consoleRows: PerVariant<number>
  /** Content width each flow is packed into, per variant (for the visible counts). */
  queueWidth: PerVariant<number>
  hostWidth: PerVariant<number>
  consoleWidth: PerVariant<number>
  /** Label on top of the stack lane from 768 (it holds frames or spare height). */
  stackLabelTopWide: boolean
  maxStack: number
}

/** Content widths at the narrowest width of each variant. */
function widths(codeCols: number) {
  const half = (STAGE_MIN.narrow - G.gap) / 2
  const laneContentNarrow = half - 2 * G.border - 2 * G.pad
  // From 768 the code column is at least `codeMin.md`, or as wide as the code.
  const codeCol = Math.max(G.codeMin.md, Math.ceil(monoWidth('x'.repeat(codeCols), G.text)) + 52)
  const right = STAGE_MIN.wide - codeCol - 16
  const laneContentWide = right - 2 * G.border - 2 * G.pad - G.inlineLabel - G.gap
  return {
    queueWidth: { narrow: laneContentNarrow, wide: laneContentWide },
    hostWidth: { narrow: laneContentNarrow, wide: laneContentWide },
    consoleWidth: {
      narrow: STAGE_MIN.narrow - 2 * G.border - 2 * G.pad,
      wide: codeCol - 2 * G.border - 2 * G.pad,
    },
  }
}

export function eventLoopMetrics(logs: readonly StepLog<EventLoopState>[]): EventLoopMetrics & { layout: EngineLayout } {
  let maxStack = 1
  let maxLines = 1
  let maxCols = 1
  for (const log of logs) {
    maxLines = Math.max(maxLines, log.code?.lines.length ?? 0)
    for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
    for (const step of log.steps) maxStack = Math.max(maxStack, step.state.stack.length)
  }
  const w = widths(maxCols)
  const per = <T,>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })

  // Rows each flow needs under the overflow policy, over every step.
  const rowsFor = (v: Variant) => {
    let queue = 1
    let host = 1
    let out = 1
    for (const log of logs)
      for (const { state } of log.steps) {
        for (const [chips, kind] of [
          [state.micro, 'micro'],
          [state.tasks, 'task'],
        ] as const) {
          const k = queueVisible(chips, kind, w.queueWidth[v], G.queueRows)
          const shown = chips.slice(0, k).map((c) => chipWidth(c.label, kind))
          if (k < chips.length) shown.push(chipWidth(moreLabel(chips.length - k), 'task'))
          queue = Math.max(queue, flowRows(shown, w.queueWidth[v], G.chipGap))
        }
        const hk = queueVisible(state.host, 'host', w.hostWidth[v], G.queueRows)
        const hs = state.host.slice(0, hk).map((c) => chipWidth(c.label, 'host'))
        if (hk < state.host.length) hs.push(chipWidth(moreLabel(state.host.length - hk), 'task'))
        host = Math.max(host, flowRows(hs, w.hostWidth[v], G.chipGap))
        const ok = consoleVisible(state.console, w.consoleWidth[v], G.consoleRows)
        const os = state.console.slice(state.console.length - ok).map(outWidth)
        if (ok < state.console.length) os.unshift(outWidth(earlierLabel(state.console.length - ok)))
        out = Math.max(out, flowRows(os, w.consoleWidth[v], G.outGap))
      }
    return { queue, host, out }
  }
  const rows = per(rowsFor)

  const codeRows: PerVariant<number> = {
    narrow: Math.min(G.codeRowsNarrow, maxLines),
    wide: maxLines <= G.codeRowsMax ? maxLines : G.codeRowsWindow,
  }
  const code = per((v) => codePaneHeight(codeRows[v]))
  const stackContent = (v: Variant) => maxStack * G.frame[v] + (maxStack - 1) * G.frameGap
  const queueContent = (v: Variant) => rowsHeight(rows[v].queue, G.chip, G.chipGap)
  const hostContent = (v: Variant) => rowsHeight(rows[v].host, G.chip, G.chipGap)
  const consoleH = per((v) => laneTop(rowsHeight(rows[v].out, G.outLine, G.outRowGap)))

  // Narrow: two grid rows, each as tall as its taller lane.
  const row1 = Math.max(laneTop(stackContent('narrow')), laneTop(hostContent('narrow')))
  const row2 = laneTop(queueContent('narrow'))
  const narrowStage = code.narrow + G.gap + row1 + G.gap + row2 + G.gap + consoleH.narrow

  // Wide: queues and host inline; the stack lane takes whatever height the
  // left column (code over console) needs beyond the other three lanes.
  const hostWide = laneInline(hostContent('wide'))
  const queueWide = laneInline(queueContent('wide'))
  const stackNatural = maxStack > 1 ? laneTop(stackContent('wide')) : laneInline(G.frame.wide)
  const left = code.wide + G.gap + consoleH.wide
  const others = hostWide + 2 * queueWide + 3 * G.gap
  const wideStage = Math.max(left, stackNatural + others)
  const stackWide = wideStage - others
  const stackLabelTopWide = maxStack > 1 || stackWide >= laneTop(stackContent('wide'))

  const metrics: EventLoopMetrics = {
    code,
    stackLane: { narrow: row1, wide: stackWide },
    hostLane: { narrow: row1, wide: hostWide },
    queueLane: { narrow: row2, wide: queueWide },
    console: consoleH,
    queueRows: per((v) => rows[v].queue),
    consoleRows: per((v) => rows[v].out),
    queueWidth: w.queueWidth,
    hostWidth: w.hostWidth,
    consoleWidth: w.consoleWidth,
    stackLabelTopWide,
    maxStack,
  }
  return {
    ...metrics,
    layout: {
      stage: { narrow: narrowStage, wide: wideStage },
      codeRows,
      codeCols: maxCols,
      detail: metrics,
    },
  }
}
