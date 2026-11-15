import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'

/**
 * Promise patterns lesson (js-track/advanced-concepts/promise-patterns), R4
 * preset B: `await null` pauses an async function and queues the rest of it
 * as a microtask, so the caller's next log comes first (a, c, b). The
 * program is the second lesson example in "When Promise Callbacks Run" (the
 * section that places this visual, content branch
 * `feat/viz-placement-flagships`), exactly: the truth test compares it with a
 * local content checkout. A lesson example, so the repo may hold its lines;
 * it is never taken from the practice answer that discusses the same order.
 *
 * The paused function keeps one chip, `run`, from the call stack to the
 * microtask queue and back (R7: one shape, one name across lanes): what
 * waits in the queue is its continuation.
 *
 * `observed.log` was recorded by `recordNodeTrace` on Node 24 and is
 * re-verified by `event-loop.truth.test.ts`. Queue membership is `modelled`.
 */

const snippet = [
  'async function run() {',
  "  console.log('a')",
  '  await null',
  "  console.log('b')",
  '}',
  '',
  'run()',
  "console.log('c')",
].join('\n')

const script = { id: 'script', label: 'script' }
const run = { id: 'run', label: 'run' }

const s0: EventLoopState = EMPTY
const s1: EventLoopState = { ...s0, stack: [script, run] }
const s2: EventLoopState = { ...s1, console: ['a'] }
const s3: EventLoopState = { ...s2, stack: [script], micro: [run] }
const s4: EventLoopState = { ...s3, console: ['a', 'c'] }
const s5: EventLoopState = { ...s4, stack: [] }
const s6: EventLoopState = { ...s5, stack: [run], micro: [], console: ['a', 'c', 'b'] }
const s7: EventLoopState = { ...s6, stack: [] }

const steps: Step<EventLoopState>[] = [
  {
    state: s0,
    event: 'Before the run',
    why: 'An async function runs like any other call until it reaches its first await.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: s1,
    event: 'Call run',
    why: 'Calling an async function starts its body at once, on top of the script, not later.',
    narration: 'The script starts and calls run, which goes on the call stack.',
    line: 7,
    focus: ['script', 'run'],
    claim: 'modelled',
  },
  {
    state: s2,
    event: 'Log a',
    why: 'Nothing has been awaited yet, so run is still running synchronously inside the call.',
    narration: 'run logs a.',
    line: 2,
    focus: ['out-0'],
    claim: 'observed',
    observes: [0],
  },
  {
    state: s3,
    event: 'Await null',
    why: 'await pauses run even for a value that is not a promise: the rest of run is queued as a microtask.',
    narration: 'run pauses at await null, and the rest of run is added to the microtask queue.',
    line: 3,
    focus: ['run'],
    claim: 'modelled',
  },
  {
    state: s4,
    event: 'Log c',
    why: 'The call to run has returned, so the script carries on while run waits in the queue.',
    narration: 'The script logs c.',
    line: 8,
    focus: ['out-1'],
    claim: 'observed',
    observes: [1],
  },
  {
    state: s5,
    event: 'Script ends',
    why: 'The stack is empty, so the loop now drains the microtask queue before anything else.',
    narration: 'The script finishes and leaves the call stack.',
    line: 'host',
    focus: ['run'],
    claim: 'modelled',
  },
  {
    state: s6,
    event: 'Resume run',
    why: 'The continuation is a microtask, so run resumes after its await only once the script has ended.',
    narration: 'run resumes after its await and logs b.',
    line: 4,
    focus: ['run', 'out-2'],
    claim: 'observed',
    observes: [2],
  },
  {
    state: s7,
    event: 'Done',
    why: 'Code after an await runs only once the script has ended.',
    narration: 'Done. The log reads a, c, b.',
    focus: ['console'],
    claim: 'modelled',
  },
]

export const awaitNull: StepLog<EventLoopState> = {
  id: 'event-loop/await-null',
  schema: 1,
  source: {
    snippet,
    runtime: 'node@24.x',
    generator: 'node-console-trace@1',
    sha256: '0bce71dc538a53acf89dde6339241e691898c864f6b737611ca28e28833896b3',
  },
  code: { lang: 'js', lines: snippet.split('\n') },
  steps,
  checkpoints: [
    {
      // R4: does b or c log first? Asked at Start (R7) as the run's last
      // output: a plainly logs first, so two choices.
      beforeStep: 1,
      verdict: 'end',
      prompt: 'Which logs last?',
      choices: [
        { id: 'b', label: 'b', value: 'b' },
        { id: 'c', label: 'c', value: 'c' },
      ],
      answer: 'b',
      feedback: {
        correct: 'b logs last: await queues the rest of run as a microtask, so the script logs c first.',
        byChoice: {
          c: 'c is synchronous: the script carries on while run waits.',
        },
      },
      locked: 'Watch the console.',
      recap: { right: '{answer} logs last', wrongLead: '{answer} logs last, not {pick}' },
    },
  ],
  observed: { log: ['a', 'c', 'b'] },
}
