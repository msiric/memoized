import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'

/**
 * Spec §8.1 preset B: a microtask queued while the queue drains still runs
 * before the waiting timer. `observed.log` recorded on Node 24 and
 * re-verified by `event-loop.truth.test.ts`.
 */

const snippet = [
  'setTimeout(() => {',
  "  console.log('timeout')",
  '}, 0)',
  'Promise.resolve().then(() => {',
  "  console.log('micro 1')",
  '  queueMicrotask(() => {',
  "    console.log('micro 2')",
  '  })',
  '})',
  "console.log('sync')",
].join('\n')

const script = { id: 'script', label: 'script' }
const timerHost = { id: 'timer', label: 'timer 0 ms → cb' }
const timerTask = { id: 'timer', label: 'timer cb' }
const thenCb = { id: 'then', label: 'then cb' }
const micro2 = { id: 'micro2', label: 'micro 2 cb' }

const s0: EventLoopState = EMPTY
const s1: EventLoopState = { ...s0, stack: [script], host: [timerHost] }
const s2: EventLoopState = { ...s1, micro: [thenCb] }
const s3: EventLoopState = { ...s2, console: ['sync'] }
const s4: EventLoopState = { ...s3, stack: [], host: [], tasks: [timerTask] }
const s5: EventLoopState = { ...s4, stack: [thenCb], micro: [], console: ['sync', 'micro 1'] }
const s6: EventLoopState = { ...s5, micro: [micro2] }
const s7: EventLoopState = { ...s6, stack: [micro2], micro: [], console: ['sync', 'micro 1', 'micro 2'] }
const s8: EventLoopState = { ...s7, stack: [timerTask], tasks: [], console: ['sync', 'micro 1', 'micro 2', 'timeout'] }
const s9: EventLoopState = { ...s8, stack: [] }

const steps: Step<EventLoopState>[] = [
  {
    state: s0,
    event: 'before the run',
    why: 'Predict the log first: one microtask will queue another while the queue is still draining.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: s1,
    event: 'register timer',
    why: 'setTimeout hands the callback to the host; even 0 ms waits until the current task ends.',
    narration: 'The script starts and registers a 0 ms timer with the host.',
    line: [1, 3],
    focus: ['script', 'timer'],
    claim: 'modelled',
  },
  {
    state: s2,
    event: 'queue microtask',
    why: 'Promise.resolve() is already fulfilled, so .then queues its callback now; it runs only after the script.',
    narration: 'The .then callback is added to the microtask queue.',
    line: 4,
    focus: ['then'],
    claim: 'modelled',
  },
  {
    state: s3,
    event: 'log sync',
    why: 'Synchronous code always finishes before any queued callback runs.',
    narration: 'The script logs sync.',
    line: 10,
    focus: ['out-0'],
    claim: 'observed',
    observes: [0],
  },
  {
    state: s4,
    event: 'script ends',
    why: 'The stack is empty, but the loop drains every microtask before it takes a task.',
    narration: 'The script finishes. Once the timer is due, the host moves its callback to the task queue.',
    line: 'host',
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s5,
    event: 'run microtask',
    why: 'Microtasks run before any task, so the .then callback goes first even though the timer was set earlier.',
    narration: 'The .then callback runs and logs micro 1.',
    line: 5,
    focus: ['then', 'out-1'],
    claim: 'observed',
    observes: [1],
  },
  {
    state: s6,
    event: 'queue microtask',
    why: 'queueMicrotask adds to the queue that is draining right now, not to a later turn of the loop.',
    narration: 'queueMicrotask adds the micro 2 callback to the microtask queue.',
    line: [6, 8],
    focus: ['micro2'],
    claim: 'modelled',
  },
  {
    state: s7,
    event: 'run microtask',
    why: 'The drain continues until the queue is empty, including microtasks added during it.',
    narration: 'The micro 2 callback runs and logs micro 2.',
    line: 7,
    focus: ['micro2', 'out-2'],
    claim: 'observed',
    observes: [2],
  },
  {
    state: s8,
    event: 'run next task',
    why: "Only now, with the microtask queue empty, does the loop take the timer's task.",
    narration: 'The timer callback runs as the next task and logs timeout.',
    line: 2,
    focus: ['timer', 'out-3'],
    claim: 'observed',
    observes: [3],
  },
  {
    state: s9,
    event: 'done',
    why: 'A microtask that queues another microtask still runs before any waiting task.',
    narration: 'Done. The log reads sync, micro 1, micro 2, timeout.',
    focus: ['console'],
    claim: 'modelled',
  },
]

export const microtaskQueuedDuringDrain: StepLog<EventLoopState> = {
  id: 'event-loop/microtask-queued-during-drain',
  schema: 1,
  source: {
    snippet,
    runtime: 'node@24.x',
    generator: 'node-console-trace@1',
    sha256: 'a674e56542d1997c69a774eef142be991ae147fcc909ff58f3831570d0da1b28',
  },
  code: { lang: 'js', lines: snippet.split('\n') },
  steps,
  checkpoints: [
    {
      beforeStep: 7,
      prompt: 'micro 2 joined the queue mid-drain. What logs next?',
      choices: [
        { id: 'timeout', label: 'timeout (task)', value: 'timeout' },
        { id: 'micro2', label: 'micro 2 (microtask)', value: 'micro 2' },
      ],
      answer: 'micro2',
      feedback: {
        correct: 'The queue drains fully, new microtasks included.',
        byChoice: {
          timeout: 'A task runs only once the microtask queue is empty.',
        },
      },
    },
  ],
  observed: { log: ['sync', 'micro 1', 'micro 2', 'timeout'] },
}
