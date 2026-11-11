import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'

/**
 * Specimen preset: one sync log either side of a timer and a resolved .then.
 *
 * `observed.log` was recorded by `recordNodeTrace` on Node 24 and is
 * re-verified by `event-loop.truth.test.ts`. Queue membership is `modelled`.
 */

const snippet = [
  "console.log('A')",
  "setTimeout(() => console.log('B'))",
  'Promise.resolve()',
  "  .then(() => console.log('C'))",
  "console.log('D')",
].join('\n')

const script = { id: 'script', label: 'script' }
const timerHost = { id: 'timer', label: 'timer → cb' }
const timerTask = { id: 'timer', label: 'timer cb' }
const thenCb = { id: 'then', label: 'then cb' }

const s0: EventLoopState = EMPTY
const s1: EventLoopState = { ...s0, stack: [script], console: ['A'] }
const s2: EventLoopState = { ...s1, host: [timerHost] }
const s3: EventLoopState = { ...s2, micro: [thenCb] }
const s4: EventLoopState = { ...s3, console: ['A', 'D'] }
const s5: EventLoopState = { ...s4, stack: [], host: [], tasks: [timerTask] }
const s6: EventLoopState = { ...s5, stack: [thenCb], micro: [], console: ['A', 'D', 'C'] }
const s7: EventLoopState = { ...s6, stack: [timerTask], tasks: [], console: ['A', 'D', 'C', 'B'] }
const s8: EventLoopState = { ...s7, stack: [] }

const steps: Step<EventLoopState>[] = [
  {
    state: s0,
    event: 'before the run',
    why: 'Predict the order first: the script runs to the end as one task before anything it queues can run.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: s1,
    event: 'run script',
    why: 'The whole file runs as one task, so nothing queued can start until it finishes.',
    narration: 'The script starts on the call stack and logs A.',
    line: 1,
    focus: ['script', 'out-0'],
    claim: 'observed',
    observes: [0],
  },
  {
    state: s2,
    event: 'register timer',
    why: 'setTimeout hands the callback to the host; even with no delay it waits for the current task to finish.',
    narration: 'setTimeout registers a timer with the host.',
    line: 2,
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s3,
    event: 'queue microtask',
    why: "The promise is already fulfilled, so .then queues its callback now, but it can't run until the stack is empty.",
    narration: 'The .then callback is added to the microtask queue.',
    line: [3, 4],
    focus: ['then'],
    claim: 'modelled',
  },
  {
    state: s4,
    event: 'log D',
    why: 'Still the first task: synchronous code always finishes before any queued callback runs.',
    narration: 'The script logs D.',
    line: 5,
    focus: ['out-1'],
    claim: 'observed',
    observes: [1],
  },
  {
    state: s5,
    event: 'script ends',
    why: 'The stack is empty, but the loop drains every microtask before it takes a task.',
    narration: 'The script finishes. Once the timer is due, the host moves its callback to the task queue.',
    line: 'host',
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s6,
    event: 'run microtask',
    why: 'The loop empties the microtask queue completely before it takes another task.',
    narration: 'The .then callback runs and logs C.',
    line: 4,
    focus: ['then', 'out-2'],
    claim: 'observed',
    observes: [2],
  },
  {
    state: s7,
    event: 'run next task',
    why: "Only with no microtasks left does the loop take the timer's task, even with no delay.",
    narration: 'The timer callback runs as the next task and logs B.',
    line: 2,
    focus: ['timer', 'out-3'],
    claim: 'observed',
    observes: [3],
  },
  {
    state: s8,
    event: 'done',
    why: 'The order is always sync code first, then every microtask, then one task.',
    narration: 'Done. The log reads A, D, C, B.',
    focus: ['console'],
    claim: 'modelled',
  },
]

export const basicOrdering: StepLog<EventLoopState> = {
  id: 'event-loop/basic-ordering',
  schema: 1,
  source: {
    snippet,
    runtime: 'node@24.x',
    generator: 'node-console-trace@1',
    sha256: '77b377f1ddb165dc5bc16a8a3ac2b84b3d40d73c78cf172d935ccd2899e054d7',
  },
  code: { lang: 'js', lines: snippet.split('\n') },
  steps,
  checkpoints: [
    {
      beforeStep: 6,
      prompt: 'D has logged. What logs next?',
      choices: [
        { id: 'b', label: 'B, from the timer', value: 'B' },
        { id: 'c', label: 'C, from .then', value: 'C' },
      ],
      answer: 'c',
      feedback: {
        correct: 'Microtasks run before the next task, so C goes first.',
        byChoice: { b: "The timer's task waits for an empty microtask queue." },
      },
    },
  ],
  observed: { log: ['A', 'D', 'C', 'B'] },
}
