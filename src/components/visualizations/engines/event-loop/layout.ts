import type { StepLog } from '../../step-log/types'
import { codePaneHeight } from '../../shell/CodePane'
import type { EngineLayout, PerVariant } from '../../shell/types'
import type { EventLoopState } from './model'

/**
 * Event-loop stage geometry (spec §8.1 layouts). Every height is derived from
 * the maximum over every step of every preset, so the stage never moves.
 *
 * narrow (< 768):            wide (>= 768):
 *   code (5-line window)       code (all lines to 14) | call stack
 *   call stack | host          (full stage height)    | host
 *   microtasks                                        | microtasks
 *   tasks                                             | tasks
 *   console (2 columns)                               | console (one line per output)
 */

export const G = {
  gap: 8,
  pad: 8,
  label: 16,
  labelGap: 8,
  chip: 28,
  /** Stack frames: 28 tall when the stage is narrow, 32 from 768. */
  frame: { narrow: 28, wide: 32 } as PerVariant<number>,
  frameGap: 4,
  consoleRow: 20,
  /** Console columns: two, each at most 13 rem (208 px). */
  consoleCol: 208,
  /** Wide grid: code column min width (from 768, from 1280), regions min width. */
  codeMin: { md: 280, xl: 360 },
  regionsMin: 240,
  codeRowsNarrow: 5,
  codeRowsMax: 14,
  codeRowsWindow: 12,
} as const

export type EventLoopMetrics = {
  code: PerVariant<number>
  stackLane: PerVariant<number>
  hostLane: PerVariant<number>
  queueLane: number
  console: PerVariant<number>
  consoleRows: PerVariant<number>
  top: number
  maxStack: number
}

function laneWithLabelOnTop(content: number) {
  return G.pad + G.label + G.labelGap + content + G.pad
}

export function eventLoopMetrics(
  logs: readonly StepLog<EventLoopState>[],
): EventLoopMetrics & { layout: EngineLayout } {
  let maxStack = 1
  let maxOut = 1
  let maxLines = 1
  let maxCols = 1
  for (const log of logs) {
    maxLines = Math.max(maxLines, log.code?.lines.length ?? 0)
    for (const l of log.code?.lines ?? []) maxCols = Math.max(maxCols, [...l].length)
    for (const step of log.steps) {
      maxStack = Math.max(maxStack, step.state.stack.length)
      maxOut = Math.max(maxOut, step.state.console.length)
    }
  }
  const codeRows: PerVariant<number> = {
    narrow: Math.min(G.codeRowsNarrow, maxLines),
    wide: maxLines <= G.codeRowsMax ? maxLines : G.codeRowsWindow,
  }
  const stackContent = (v: 'narrow' | 'wide') => maxStack * G.frame[v] + (maxStack - 1) * G.frameGap
  // One frame deep: from 768 the label sits inline, like the queues.
  const stackLane = {
    narrow: laneWithLabelOnTop(stackContent('narrow')),
    wide: maxStack > 1 ? laneWithLabelOnTop(stackContent('wide')) : G.pad + G.frame.wide + G.pad,
  }
  const queueLane = G.pad + G.chip + G.pad
  const hostLane = { narrow: laneWithLabelOnTop(G.chip), wide: queueLane }
  // Two columns at every width keep the console short.
  const consoleRows = { narrow: Math.ceil(maxOut / 2), wide: Math.ceil(maxOut / 2) }
  const consoleH = {
    narrow: laneWithLabelOnTop(consoleRows.narrow * G.consoleRow),
    wide: laneWithLabelOnTop(consoleRows.wide * G.consoleRow),
  }
  const code = { narrow: codePaneHeight(codeRows.narrow), wide: codePaneHeight(codeRows.wide) }
  const topRowNarrow = Math.max(stackLane.narrow, hostLane.narrow)
  const narrowStage =
    code.narrow + G.gap + topRowNarrow + G.gap + queueLane + G.gap + queueLane + G.gap + consoleH.narrow
  const right = stackLane.wide + G.gap + hostLane.wide + G.gap + queueLane + G.gap + queueLane + G.gap + consoleH.wide
  const wideStage = Math.max(code.wide, right)
  const metrics: EventLoopMetrics = {
    code,
    stackLane,
    hostLane,
    queueLane,
    console: consoleH,
    consoleRows,
    top: wideStage,
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
