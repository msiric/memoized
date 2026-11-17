import { placeholderText, type DisplayRow } from '../../../step-log/lesson-source'
import type { Step, StepLog } from '../../../step-log/types'
import { EMPTY, type EventLoopState } from '../model'
import { AWAIT_SNIPPET, whoCalledInnerProgram } from '../programs'
import recording from '../recordings/context-and-call-stack.json'
import type { TraceRecording } from '../truth/trace'

/**
 * Context and Call Stack (R4 row js-track/core-fundamentals/context-and-call-stack,
 * presets `who-called-inner` and `await-async-frames`), on the event-loop
 * engine with its trace list: what `console.trace()` prints once the frame
 * that scheduled the callback is gone.
 *
 * - `who-called-inner` steps through the async-call-stack question's snippet
 *   (premium text: the pane's rows are `wrap` rows resolved from the content
 *   when a page is built; the repo holds placeholders of the same widths).
 * - `await-async-frames` is the register's contrast, the visual's own code.
 *
 * The printed frames come from the committed recording of a real Node 24 run
 * (`yarn viz:traces`, re-checked by the truth test): the console shows the
 * `Trace` header and the list its frames. Stack and queue membership are
 * `modelled`.
 */

export const TRACE_RECORDINGS = recording as unknown as Record<string, TraceRecording>

const traceOf = (id: string) => {
  const t = TRACE_RECORDINGS[id]?.traces[0]
  if (!t) throw new Error(`${id}: no recorded console.trace(): run yarn viz:traces`)
  return t
}

const GENERATOR = 'node-console-trace-stderr@1'

// ---------------------------------------------------------------------------
// who-called-inner: the async-call-stack question (premium: its lines are resolved for a page, never quoted here)
// ---------------------------------------------------------------------------

/** The question's six lines, as `wrap` rows (indent, then the trimmed line). */
const INNER_ROWS: DisplayRow[] = [
  { src: 1, wrap: [0, 0, 18] },
  { src: 2, wrap: [2, 0, 29] },
  { src: 3, wrap: [4, 0, 15] },
  { src: 4, wrap: [2, 0, 5] },
  { src: 5, wrap: [0, 0, 1] },
  { src: 6, wrap: [0, 0, 7] },
]

const inner1 = traceOf('who-called-inner')
const script = { id: 'script', label: 'script' }
const outer = { id: 'outer', label: 'outer' }
const inner = { id: 'inner', label: 'inner' }

const i0: EventLoopState = EMPTY
const i1: EventLoopState = { ...i0, stack: [script, outer] }
const i2: EventLoopState = { ...i1, host: [inner] }
const i3: EventLoopState = { ...i2, stack: [script] }
const i4: EventLoopState = { ...i3, stack: [] }
const i5: EventLoopState = { ...i4, host: [], tasks: [inner] }
const i6: EventLoopState = { ...i5, stack: [inner], tasks: [], console: [inner1.header], trace: inner1.frames }

const innerSteps: Step<EventLoopState>[] = [
  {
    state: i0,
    event: 'Before the run',
    why: 'A trace lists the frames on the stack when it runs, not the code that scheduled it.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: i1,
    event: 'Call outer',
    why: 'The script calls outer, so outer is pushed on top of the script frame.',
    narration: 'The script calls outer, which goes on the call stack.',
    line: 6,
    focus: ['outer'],
    claim: 'modelled',
  },
  {
    state: i2,
    event: 'Register inner',
    why: 'setTimeout only hands inner to the host timer; inner does not run yet.',
    narration: 'setTimeout registers inner with the host.',
    line: [2, 4],
    focus: ['inner'],
    claim: 'modelled',
  },
  {
    state: i3,
    event: 'outer returns',
    why: 'outer has nothing left to do after scheduling, so its frame is popped.',
    narration: 'outer returns and its frame leaves the stack.',
    line: 5,
    focus: ['stack'],
    claim: 'modelled',
  },
  {
    state: i4,
    event: 'Script ends',
    why: 'The script frame is popped too, so the call stack is empty before the timer fires.',
    narration: 'The script finishes; the call stack is empty.',
    line: 'host',
    focus: ['stack'],
    claim: 'modelled',
  },
  {
    state: i5,
    event: 'Timer fires',
    why: 'Once the 0 ms timer is due, the host moves inner to the task queue.',
    narration: 'The timer is due, so inner joins the task queue.',
    line: 'host',
    focus: ['inner'],
    claim: 'modelled',
  },
  {
    state: i6,
    event: 'inner runs and traces',
    why: "inner starts on an empty stack, so only Node's timer frames sit under it; outer is long gone.",
    narration: `inner runs as a task and console.trace() prints ${inner1.frames.join(', ')}.`,
    line: 3,
    focus: ['inner', 'out-0'],
    claim: 'observed',
    observes: [0, ...inner1.frames.map((_, k) => k + 1)],
  },
]

export const whoCalledInner: StepLog<EventLoopState> = {
  id: 'event-loop/who-called-inner',
  schema: 1,
  source: { runtime: 'node@24.x', generator: GENERATOR, sha256: TRACE_RECORDINGS['who-called-inner'].sha256 },
  code: {
    lang: 'js',
    lines: placeholderText(INNER_ROWS),
    premium: { source: 'source' in whoCalledInnerProgram ? whoCalledInnerProgram.source : [], rows: INNER_ROWS },
  },
  steps: innerSteps,
  checkpoints: [
    {
      beforeStep: 6,
      prompt: 'Which frames will console.trace() print?',
      choices: [
        { id: 'outer', label: 'inner, outer', value: 'outer' },
        { id: 'timers', label: 'inner, timers', value: inner1.frames[1] },
      ],
      answer: 'timers',
      feedback: {
        correct: 'outer returned before the timer fired.',
        byChoice: {
          outer: 'outer was popped long before inner ran.',
        },
      },
      recap: { right: 'inner and the timer frames, no outer', wrongLead: 'no {pick}: inner and the timer frames' },
    },
  ],
  observed: { log: [inner1.header, ...inner1.frames] },
}

// ---------------------------------------------------------------------------
// await-async-frames: the contrast, the visual's own code.
// ---------------------------------------------------------------------------

const aw = traceOf('await-async-frames')
const o1 = { id: 'o1', label: 'o1' }
const o2 = { id: 'o2', label: 'o2' }

const a0: EventLoopState = EMPTY
const a1: EventLoopState = { ...a0, stack: [script, o1] }
const a2: EventLoopState = { ...a1, stack: [script, o1, o2] }
const a3: EventLoopState = { ...a2, stack: [script, o1], micro: [o2] }
const a4: EventLoopState = { ...a3, stack: [script] }
const a5: EventLoopState = { ...a4, stack: [] }
const a6: EventLoopState = { ...a5, stack: [o2], micro: [], console: [aw.header], trace: aw.frames }

const awaitSteps: Step<EventLoopState>[] = [
  {
    state: a0,
    event: 'Before the run',
    why: 'Here the hop is an await, not a timer, so V8 can still say who was waiting.',
    narration: 'Nothing has run yet.',
    focus: [],
    claim: 'modelled',
  },
  {
    state: a1,
    event: 'Call o1',
    why: 'An async function runs at once until its first await.',
    narration: 'The script calls o1, which goes on the call stack.',
    line: 8,
    focus: ['o1'],
    claim: 'modelled',
  },
  {
    state: a2,
    event: 'Call o2',
    why: 'await evaluates its operand first, so o2 is called before o1 pauses.',
    narration: 'o1 calls o2, which goes on top of it.',
    line: 6,
    focus: ['o2'],
    claim: 'modelled',
  },
  {
    state: a3,
    event: 'o2 awaits null',
    why: 'await null pauses o2, then queues the rest of it as a microtask.',
    narration: "o2 pauses; its continuation joins the microtask queue.",
    line: 2,
    focus: ['o2'],
    claim: 'modelled',
  },
  {
    state: a4,
    event: 'o1 awaits o2',
    why: "o2's promise is still pending, so o1 waits off the stack and no queue holds it yet.",
    narration: "o1 pauses until o2's promise settles and leaves the stack.",
    line: 6,
    focus: ['stack'],
    claim: 'modelled',
  },
  {
    state: a5,
    event: 'Script ends',
    why: 'The script frame is popped, so the stack is empty before any microtask runs.',
    narration: 'The script finishes; the call stack is empty.',
    line: 'host',
    focus: ['stack'],
    claim: 'modelled',
  },
  {
    state: a6,
    event: 'o2 resumes and traces',
    why: 'o1 is not on the stack, but V8 follows the await chain and lists it as an async frame.',
    narration: `o2 resumes and console.trace() prints ${aw.frames.join(', ')}.`,
    line: 3,
    focus: ['o2', 'out-0'],
    claim: 'observed',
    observes: [0, ...aw.frames.map((_, k) => k + 1)],
  },
]

export const awaitAsyncFrames: StepLog<EventLoopState> = {
  id: 'event-loop/await-async-frames',
  schema: 1,
  source: { snippet: AWAIT_SNIPPET, runtime: 'node@24.x', generator: GENERATOR, sha256: TRACE_RECORDINGS['await-async-frames'].sha256 },
  code: { lang: 'js', lines: AWAIT_SNIPPET.split('\n') },
  steps: awaitSteps,
  checkpoints: [
    {
      beforeStep: 6,
      prompt: 'Which frames will console.trace() print?',
      choices: [
        { id: 'o2', label: 'o2 only', value: 'o2 only' },
        { id: 'async', label: 'o2, async o1', value: aw.frames[1] },
      ],
      answer: 'async',
      feedback: {
        correct: 'V8 follows the await chain back to o1.',
        byChoice: {
          o2: 'An await keeps its caller in the trace.',
        },
      },
      recap: { right: 'o2, then async o1', wrongLead: 'o2, then async o1, not {pick}' },
    },
  ],
  observed: { log: [aw.header, ...aw.frames] },
}
