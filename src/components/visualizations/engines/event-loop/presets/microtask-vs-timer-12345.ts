import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'

/**
 * Promise patterns lesson (js-track/advanced-concepts/promise-patterns), R4
 * preset A: two `.then` callbacks either side of a 0 ms timer, between two
 * synchronous logs (1, 5, 2, 4, 3). The program is the lesson example in
 * "When Promise Callbacks Run" (the section that places this visual, content
 * branch `feat/viz-placement-flagships`), exactly: the truth test compares it
 * with a local content checkout. A lesson example, so the repo may hold its
 * lines; it is never taken from the practice answer that discusses the same
 * order.
 *
 * `observed.log` was recorded by `recordNodeTrace` on Node 24 and is
 * re-verified by `event-loop.truth.test.ts`. Queue membership is `modelled`.
 */

const snippet = [
  "console.log('1')",
  'Promise.resolve()',
  "  .then(() => console.log('2'))",
  'setTimeout(() => {',
  "  console.log('3')",
  '}, 0)',
  'Promise.resolve()',
  "  .then(() => console.log('4'))",
  "console.log('5')",
].join('\n')

// One name per callback from Host to Tasks to the call stack (R7): named by
// what it logs, so a chip matches its console output.
const script = { id: 'script', label: 'script' }
const then2 = { id: 'then2', label: 'cb 2' }
const timerCb = { id: 'timer', label: 'cb 3' }
const then4 = { id: 'then4', label: 'cb 4' }

const s0: EventLoopState = EMPTY
const s1: EventLoopState = { ...s0, stack: [script], console: ['1'] }
const s2: EventLoopState = { ...s1, micro: [then2] }
const s3: EventLoopState = { ...s2, host: [timerCb] }
const s4: EventLoopState = { ...s3, micro: [then2, then4] }
const s5: EventLoopState = { ...s4, console: ['1', '5'] }
const s6: EventLoopState = { ...s5, stack: [], host: [], tasks: [timerCb] }
const s7: EventLoopState = { ...s6, stack: [then2], micro: [then4], console: ['1', '5', '2'] }
const s8: EventLoopState = { ...s7, stack: [then4], micro: [], console: ['1', '5', '2', '4'] }
const s9: EventLoopState = { ...s8, stack: [timerCb], tasks: [], console: ['1', '5', '2', '4', '3'] }
const s10: EventLoopState = { ...s9, stack: [] }

const steps: Step<EventLoopState>[] = [
  {
    state: s0,
    event: 'Before the run',
    why: 'The script runs to the end as one task before anything it queues can run.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: s1,
    event: 'Run the script',
    why: 'The whole file runs as one task, so nothing queued can start until it finishes.',
    narration: 'The script starts on the call stack and logs 1.',
    line: 1,
    focus: ['script', 'out-0'],
    claim: 'observed',
    observes: [0],
  },
  {
    state: s2,
    event: 'Queue a microtask',
    why: "The promise is already fulfilled, so .then queues its callback now, but it can't run until the stack is empty.",
    narration: 'The first .then callback is added to the microtask queue.',
    line: [2, 3],
    focus: ['then2'],
    claim: 'modelled',
  },
  {
    state: s3,
    event: 'Register the timer',
    why: 'setTimeout hands the callback to the host; even 0 ms waits until the current task ends.',
    narration: 'setTimeout registers a 0 ms timer with the host.',
    line: [4, 6],
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s4,
    event: 'Queue another microtask',
    why: 'This .then joins the same queue behind the first one, so the two run in the order they were queued.',
    narration: 'The second .then callback is added to the microtask queue, behind the first.',
    line: [7, 8],
    focus: ['then4'],
    claim: 'modelled',
  },
  {
    state: s5,
    event: 'Log 5',
    why: 'Still the first task: synchronous code always finishes before any queued callback runs.',
    narration: 'The script logs 5.',
    line: 9,
    focus: ['out-1'],
    claim: 'observed',
    observes: [1],
  },
  {
    state: s6,
    event: 'Script ends',
    why: 'The stack is empty, but the loop drains every microtask before it takes a task.',
    narration: 'The script finishes. Once the timer is due, the host moves its callback to the task queue.',
    line: 'host',
    focus: ['timer'],
    claim: 'modelled',
  },
  {
    state: s7,
    event: 'Run the first microtask',
    why: 'The loop takes microtasks first, oldest first, even though the timer is already waiting.',
    narration: 'The first .then callback runs and logs 2.',
    line: 3,
    focus: ['then2', 'out-2'],
    claim: 'observed',
    observes: [2],
  },
  {
    state: s8,
    event: 'Run the next microtask',
    why: 'The drain continues until the microtask queue is empty, so 4 still goes before the timer.',
    narration: 'The second .then callback runs and logs 4.',
    line: 8,
    focus: ['then4', 'out-3'],
    claim: 'observed',
    observes: [3],
  },
  {
    state: s9,
    event: 'Run the next task',
    why: "Only with no microtasks left does the loop take the timer's task, even at 0 ms.",
    narration: 'The timer callback runs as the next task and logs 3.',
    line: 5,
    focus: ['timer', 'out-4'],
    claim: 'observed',
    observes: [4],
  },
  {
    state: s10,
    event: 'Done',
    why: 'Sync code first, then every microtask, then one task.',
    narration: 'Done. The log reads 1, 5, 2, 4, 3.',
    focus: ['console'],
    claim: 'modelled',
  },
]

export const microtaskVsTimer12345: StepLog<EventLoopState> = {
  id: 'event-loop/microtask-vs-timer-12345',
  schema: 1,
  source: {
    snippet,
    runtime: 'node@24.x',
    generator: 'node-console-trace@1',
    sha256: '5ad7f59298a215fb6051aa939ae55d890db4d05a1cb5d0ed3e16c4cfd4d7ea82',
  },
  code: { lang: 'js', lines: snippet.split('\n') },
  steps,
  checkpoints: [
    {
      // R7: the learner predicts before anything runs; the verdict lands
      // with the finale. 1 plainly logs first; 5 stays, since reading the
      // file top to bottom says 5 logs last.
      beforeStep: 1,
      verdict: 'end',
      prompt: 'Which logs last?',
      choices: [
        { id: '2', label: '2', value: '2' },
        { id: '3', label: '3', value: '3' },
        { id: '4', label: '4', value: '4' },
        { id: '5', label: '5', value: '5' },
      ],
      answer: '3',
      feedback: {
        correct: "3 logs last: the timer's callback is a task, so it waits for the script and both microtasks.",
        byChoice: {
          '2': '2 is a microtask: it runs right after the script.',
          '4': "4 is a microtask: it runs before the timer's task.",
          '5': '5 is synchronous: it logs before anything queued runs.',
        },
      },
      locked: 'Watch the console.',
      recap: { right: '{answer} logs last', wrongLead: '{answer} logs last, not {pick}' },
    },
    {
      // R4: after 5 logs, which logs next, 2 or 3?
      beforeStep: 7,
      prompt: 'What logs after 5?',
      choices: [
        { id: '3', label: '3, from the timer', value: '3' },
        { id: '2', label: '2, from .then', value: '2' },
      ],
      answer: '2',
      feedback: {
        // One line on a 375 px phone with its lead (F1 ruling 2).
        correct: 'Microtasks run before the next task.',
        byChoice: { '3': 'A task waits for every microtask.' },
      },
      recap: { right: '{answer} came after 5', wrongLead: '{answer} came after 5, not {pick}', wrong: '{answer}, a microtask, ran before {pick}.' },
    },
  ],
  observed: { log: ['1', '5', '2', '4', '3'] },
}
