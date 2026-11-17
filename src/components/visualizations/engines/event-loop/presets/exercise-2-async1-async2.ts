import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'

/**
 * Event Loop lesson (js-track/core-fundamentals/event-loop, FREE), R4 preset
 * `exercise-2-async1-async2`: the lesson's Exercise 2 question, exactly (the
 * truth test compares it with a local content checkout). A lesson example of
 * a free lesson, already in the committed lesson fixture, so the repo may
 * hold its lines.
 *
 * async1's continuation keeps one chip, `async1`, from the call stack to the
 * microtask queue and back (R7). `observed.log` was recorded by
 * `recordNodeTrace` on Node 24 and is re-verified by
 * `event-loop.truth.test.ts`. Queue membership is `modelled`.
 */

const snippet = [
  'async function async1() {',
  "  console.log('Async 1 Start')",
  '  await async2()',
  "  console.log('Async 1 End')",
  '}',
  '',
  'async function async2() {',
  "  console.log('Async 2')",
  '}',
  '',
  "console.log('Script Start')",
  '',
  'setTimeout(() => {',
  "  console.log('Timeout')",
  '}, 0)',
  '',
  'async1()',
  '',
  'new Promise((resolve) => {',
  "  console.log('Promise 1')",
  '  resolve()',
  '}).then(() => {',
  "  console.log('Promise 2')",
  '})',
  '',
  "console.log('Script End')",
].join('\n')

const script = { id: 'script', label: 'script' }
const async1 = { id: 'async1', label: 'async1' }
const async2 = { id: 'async2', label: 'async2' }
const executor = { id: 'executor', label: 'executor' }
const timerCb = { id: 'timer', label: 'cb Timeout' }
// `then`, not `cb Promise 2`: with async1 it keeps one row in a phone's queue lane.
const thenCb = { id: 'then', label: 'then' }

const OUT = ['Script Start', 'Async 1 Start', 'Async 2', 'Promise 1', 'Script End', 'Async 1 End', 'Promise 2', 'Timeout']
const out = (n: number) => OUT.slice(0, n)

const s0: EventLoopState = EMPTY
const s1: EventLoopState = { ...s0, stack: [script], console: out(1) }
const s2: EventLoopState = { ...s1, host: [timerCb] }
const s3: EventLoopState = { ...s2, stack: [script, async1] }
const s4: EventLoopState = { ...s3, console: out(2) }
const s5: EventLoopState = { ...s4, stack: [script, async1, async2] }
const s6: EventLoopState = { ...s5, console: out(3) }
const s7: EventLoopState = { ...s6, stack: [script], micro: [async1] }
const s8: EventLoopState = { ...s7, stack: [script, executor] }
const s9: EventLoopState = { ...s8, console: out(4) }
const s10: EventLoopState = { ...s9, stack: [script], micro: [async1, thenCb] }
const s11: EventLoopState = { ...s10, console: out(5) }
const s12: EventLoopState = { ...s11, stack: [], host: [], tasks: [timerCb] }
const s13: EventLoopState = { ...s12, stack: [async1], micro: [thenCb], console: out(6) }
const s14: EventLoopState = { ...s13, stack: [thenCb], micro: [], console: out(7) }
const s15: EventLoopState = { ...s14, stack: [timerCb], tasks: [], console: out(8) }
const s16: EventLoopState = { ...s15, stack: [] }

const steps: Step<EventLoopState>[] = [
  {
    state: s0,
    event: 'Before the run',
    why: 'Each callback waits in a queue until the stack is empty, so the order differs from the source order.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: s1,
    event: 'Log Script Start',
    why: 'The script runs top to bottom; the function declarations above only define async1 and async2.',
    narration: 'The script starts and logs Script Start.',
    line: 11,
    focus: ['script', 'out-0'],
    claim: 'observed',
    observes: [0],
  },
  {
    state: s2,
    event: 'Register the timer',
    why: 'setTimeout hands the callback to the host; even 0 ms waits until the script and every microtask finish.',
    narration: 'The script registers a 0 ms timer with the host.',
    line: [13, 15],
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s3,
    event: 'Call async1',
    why: 'Calling an async function runs its body at once, on top of the script, up to its first await.',
    narration: 'async1 is called and goes on the call stack.',
    line: 17,
    focus: ['async1'],
    claim: 'modelled',
  },
  {
    state: s4,
    event: 'Log Async 1 Start',
    why: 'Nothing has paused yet, so this line runs synchronously, inside the script.',
    narration: 'async1 logs Async 1 Start.',
    line: 2,
    focus: ['out-1'],
    claim: 'observed',
    observes: [1],
  },
  {
    state: s5,
    event: 'Call async2',
    why: 'await evaluates its operand first, so async2 is called before async1 pauses.',
    narration: 'async2 is called on top of async1.',
    line: 3,
    focus: ['async2'],
    claim: 'modelled',
  },
  {
    state: s6,
    event: 'Log Async 2',
    why: 'async2 has no await, so its whole body runs now and it returns a fulfilled promise.',
    narration: 'async2 logs Async 2.',
    line: 8,
    focus: ['out-2'],
    claim: 'observed',
    observes: [2],
  },
  {
    state: s7,
    event: 'async1 pauses at await',
    why: 'The awaited promise is already fulfilled, so the rest of async1 is queued as a microtask right away.',
    narration: 'async2 returns; async1 pauses and its continuation joins the microtask queue.',
    line: 3,
    focus: ['async1'],
    claim: 'modelled',
  },
  {
    state: s8,
    event: 'Run the executor',
    why: 'new Promise calls its executor synchronously, before the constructor returns.',
    narration: 'The Promise executor runs on top of the script.',
    line: 19,
    focus: ['executor'],
    claim: 'modelled',
  },
  {
    state: s9,
    event: 'Log Promise 1',
    why: 'The executor is ordinary synchronous code, so it logs before the script moves on.',
    narration: 'The executor logs Promise 1.',
    line: 20,
    focus: ['out-3'],
    claim: 'observed',
    observes: [3],
  },
  {
    state: s10,
    event: 'Queue the then callback',
    why: 'resolve() fulfilled the promise, so .then queues its callback now, behind async1.',
    narration: 'The executor returns and the .then callback joins the microtask queue.',
    line: 22,
    focus: ['then'],
    claim: 'modelled',
  },
  {
    state: s11,
    event: 'Log Script End',
    why: 'Synchronous code always finishes before any queued callback runs.',
    narration: 'The script logs Script End.',
    line: 26,
    focus: ['out-4'],
    claim: 'observed',
    observes: [4],
  },
  {
    state: s12,
    event: 'Script ends',
    why: 'The stack is empty, so the loop drains the microtask queue, oldest first, before it takes a task.',
    narration: 'The script finishes. Once the timer is due, the host moves its callback to the task queue.',
    line: 'host',
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s13,
    event: 'Resume async1',
    why: "async1's continuation was queued first, at the await, so it runs before the .then callback.",
    narration: 'async1 resumes and logs Async 1 End.',
    line: 4,
    focus: ['async1', 'out-5'],
    claim: 'observed',
    observes: [5],
  },
  {
    state: s14,
    event: 'Run the then callback',
    why: 'The drain continues: the .then callback is next in the microtask queue.',
    narration: 'The .then callback runs and logs Promise 2.',
    line: 23,
    focus: ['then', 'out-6'],
    claim: 'observed',
    observes: [6],
  },
  {
    state: s15,
    event: 'Run the next task',
    why: "Only with the microtask queue empty does the loop take the timer's task.",
    narration: 'The timer callback runs as the next task and logs Timeout.',
    line: 14,
    focus: ['timer', 'out-7'],
    claim: 'observed',
    observes: [7],
  },
  {
    state: s16,
    event: 'Done',
    why: 'Microtasks run in the order they were queued, all before the next task.',
    narration: 'Done. The log reads Script Start, Async 1 Start, Async 2, Promise 1, Script End, Async 1 End, Promise 2, Timeout.',
    focus: ['console'],
    claim: 'modelled',
  },
]

export const exercise2Async1Async2: StepLog<EventLoopState> = {
  id: 'event-loop/exercise-2-async1-async2',
  schema: 1,
  source: {
    snippet,
    runtime: 'node@24.x',
    generator: 'node-console-trace@1',
    sha256: '89e22326759ecdf80b27b958a48f7bea94fa07cec070766c2958cff55f59e58a',
  },
  code: { lang: 'js', lines: snippet.split('\n') },
  steps,
  checkpoints: [
    {
      // The exercise's own question, asked before the drain begins.
      beforeStep: 13,
      prompt: 'What logs after Script End?',
      choices: [
        // Two, not three: Timeout plainly waits for the microtasks (the Drain
        // preset's lesson), and two choices keep one row on a 375 px phone.
        { id: 'async1', label: 'Async 1 End', value: 'Async 1 End' },
        { id: 'promise2', label: 'Promise 2', value: 'Promise 2' },
      ],
      answer: 'async1',
      feedback: {
        correct: 'async1 was queued first, at its await.',
        byChoice: {
          promise2: 'async1 was queued before the .then.',
        },
      },
      recap: { right: '{answer} came next', wrongLead: '{answer} came next, not {pick}' },
    },
  ],
  observed: { log: OUT },
}
