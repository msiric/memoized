import codeTokens from '../../code-tokens.json'
import type { EngineCore, StepThroughDescriptor } from '../../shell/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { eventLoopMetrics, outputLines } from './layout'
import { awaitNull } from './presets/await-null'
import { basicOrdering } from './presets/basic-ordering'
import { awaitAsyncFrames, whoCalledInner } from './presets/call-stack-traces'
import { exercise2Async1Async2 } from './presets/exercise-2-async1-async2'
import { microtaskQueuedDuringDrain } from './presets/microtask-queued-during-drain'
import { microtaskVsTimer12345 } from './presets/microtask-vs-timer-12345'
import {
  consoleReveal,
  describeEventLoop,
  eventLoopIntrospection,
  revealCount,
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
  revealMs: (state) => consoleReveal(revealCount(state)).settleMs,
  // The finale relights each line that printed, in the order its output ran.
  codeTrace: (log, index) => {
    if (index !== log.steps.length - 1) return null
    const lines = outputLines(log)
    const { staggerMs } = consoleReveal(revealCount(log.steps[index].state))
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
    // Promise patterns lesson: its own switcher and code column (`Preset.group`).
    {
      id: 'microtask-vs-timer-12345',
      label: 'then and timers',
      group: 'promise-patterns',
      log: withCodeTokens(microtaskVsTimer12345, codeTokens),
    },
    {
      id: 'await-null',
      label: 'await null',
      group: 'promise-patterns',
      log: withCodeTokens(awaitNull, codeTokens),
    },
    // Event Loop lesson, Exercise 2: its own frame in the Exercises (a
    // one-preset group, so the flagship frame keeps Basics and Drain).
    {
      id: 'exercise-2-async1-async2',
      label: 'Exercise 2',
      group: 'event-loop-exercise-2',
      title: 'await: where async1 resumes',
      log: withCodeTokens(exercise2Async1Async2, codeTokens),
    },
    // Context and Call Stack: what console.trace() shows after a timer hop
    // (the async-call-stack question, premium rows) and after an await.
    {
      id: 'who-called-inner',
      label: 'setTimeout',
      group: 'context-and-call-stack',
      title: 'Call stack after setTimeout, await',
      log: whoCalledInner,
    },
    {
      id: 'await-async-frames',
      label: 'await',
      group: 'context-and-call-stack',
      log: withCodeTokens(awaitAsyncFrames, codeTokens),
    },
  ],
  defaultPreset: 'basic-ordering',
  since: '2026-11',
}
