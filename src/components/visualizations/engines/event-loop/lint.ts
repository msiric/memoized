import type { StepLog } from '../../step-log/types'
import {
  G,
  chipWidth,
  consoleVisible,
  eventLoopMetrics,
  outWidth,
  queueVisible,
  type LaneKind,
} from './layout'
import type { EventLoopState } from './model'

/**
 * Event-loop authoring lint (VIZ-H A1, A7, A8, F4, F5): the overflow policy
 * keeps any data inside the frame, and this lint keeps real presets from
 * ever needing it. Measured with the same width model the layout uses, at
 * the narrowest width (320), so an accepted preset never truncates a chip
 * or an output and never collapses a queue or the console.
 */

export const EL_LIMITS = {
  /** Frames on the call stack (each adds a row to the stack lane). */
  stackDepth: 4,
} as const

export function lintEventLoopLogs(
  logs: readonly StepLog<EventLoopState>[],
): string[] {
  const errors: string[] = []
  const m = eventLoopMetrics(logs)
  const lanes: [
    keyof EventLoopState & ('stack' | 'host' | 'micro' | 'tasks'),
    LaneKind,
    number,
  ][] = [
    ['stack', 'frame', m.queueWidth.narrow],
    ['host', 'host', m.hostWidth.narrow],
    ['micro', 'micro', m.queueWidth.narrow],
    ['tasks', 'task', m.queueWidth.narrow],
  ]
  const seen = new Set<string>()
  const once = (msg: string) => {
    if (!seen.has(msg)) {
      seen.add(msg)
      errors.push(msg)
    }
  }
  for (const log of logs)
    log.steps.forEach(({ state }, i) => {
      const at = `${log.id} ${i === 0 ? 'Start' : `step ${i}`}`
      if (state.stack.length > EL_LIMITS.stackDepth)
        once(
          `${at}: call stack is ${state.stack.length} deep > ${EL_LIMITS.stackDepth}`,
        )
      for (const [lane, kind, width] of lanes) {
        for (const c of state[lane]) {
          const w = chipWidth(c.label, kind)
          if (w > width)
            once(
              `${log.id}: ${lane} chip "${c.label}" is ${w}px > ${width}px at 320 (it would truncate)`,
            )
        }
        if (
          lane !== 'stack' &&
          queueVisible(state[lane], kind, width, G.queueRows) <
            state[lane].length
        )
          once(
            `${at}: ${lane} holds ${state[lane].length} items, more than ${G.queueRows} rows at 320 (it would collapse)`,
          )
      }
      for (const out of state.console) {
        const w = outWidth(out)
        if (w > m.consoleWidth.narrow)
          once(
            `${log.id}: console output "${out}" is ${w}px > ${m.consoleWidth.narrow}px at 320 (it would truncate)`,
          )
      }
      if (
        consoleVisible(state.console, m.consoleWidth.narrow, G.consoleRows) <
        state.console.length
      )
        once(
          `${at}: ${state.console.length} outputs need more than ${G.consoleRows} rows at 320 (older ones would collapse)`,
        )
    })
  return errors
}
