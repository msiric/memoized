import codeTokens from '../../code-tokens.json'
import type { EngineCore, StepThroughDescriptor } from '../../shell/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { eventLoopMetrics, outputLines } from './layout'
import { basicOrdering } from './presets/basic-ordering'
import { microtaskQueuedDuringDrain } from './presets/microtask-queued-during-drain'
import {
  consoleReveal,
  describeEventLoop,
  eventLoopIntrospection,
  type EventLoopState,
} from './model'

/**
 * The event-loop visual without its renderer. Pure data and functions, so the
 * registry, the manifest route and the tests can use it without React.
 */

export const eventLoopEngineCore: EngineCore<EventLoopState> = {
  id: 'event-loop',
  describe: describeEventLoop,
  layout: (logs, all) => eventLoopMetrics(logs, all).layout,
  introspect: eventLoopIntrospection,
  revealMs: (state) => consoleReveal(state.console.length).settleMs,
  // The finale relights each line that printed, in the order its output ran.
  codeTrace: (log, index) => {
    if (index !== log.steps.length - 1) return null
    const lines = outputLines(log)
    const { staggerMs } = consoleReveal(log.steps[index].state.console.length)
    const out = lines.flatMap((l, k) => (l ? [{ l, d: k * staggerMs }] : []))
    return { lines: out.map((o) => o.l), delaysMs: out.map((o) => o.d) }
  },
}

export const eventLoopDescriptor: StepThroughDescriptor<EventLoopState> = {
  id: 'event-loop',
  form: 'step',
  title: 'Event loop: sync, microtasks, tasks',
  engine: eventLoopEngineCore,
  presets: [
    {
      id: 'basic-ordering',
      label: 'Basics',
      log: withCodeTokens(basicOrdering, codeTokens),
    },
    {
      id: 'microtask-queued-during-drain',
      label: 'Drain',
      log: withCodeTokens(microtaskQueuedDuringDrain, codeTokens),
    },
  ],
  defaultPreset: 'basic-ordering',
  since: '2026-11',
}
