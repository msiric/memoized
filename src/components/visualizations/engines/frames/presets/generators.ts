import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint } from '../../../step-log/types'
import { assemble, fmt, rowOf, Walk, type Draft, type FramesSpec } from '../build'
import { statusId, varId, type FChip, type FLane, type FState } from '../model'
import type { FramesRecording, GenState, Pause } from '../program'
import { delegationProgram, pipelineProgram, takeProgram, twoWayProgram } from '../programs/generators'
import recordings from '../recordings/generators.json'

/**
 * Generators (R4 `twoWay-next-arg`, `take-closes-source`,
 * `lazy-pipeline-pull`, `yield-star-forwarding`): one lane per generator
 * object, whose status chip is the inspector's own `[[GeneratorState]]` and
 * suspended line at that pause (not started, paused at a line, running,
 * closed), and whose other chips are its recorded locals. A step is one
 * resumption or one hand-off: next(arg) resumes the frame and arg becomes the
 * value of the paused yield; a yield hands a value out and suspends the frame
 * again. The panes are the answers' and checks' lines (no committed text).
 */

const rec = recordings as unknown as Record<string, FramesRecording>

/** A generator's status chip; `header` is its function's first line, where a generator that has not started is suspended. */
function statusOf(g: GenState | undefined, header: number, display: readonly DisplayRow[], before = 'not created'): string {
  if (!g) return before
  if (g.state === 'running') return 'running'
  if (g.state === 'closed') return 'closed'
  return g.line === header ? 'not started' : `paused at ${rowOf(display, g.line!)}`
}

const chip = (id: string, label: string): FChip => ({ id, label })
const lane = (id: string, label: string, status: string, chips: FChip[] = []): FLane => ({ id, label, kind: 'frame', chips: [chip(statusId(id), status), ...chips] })

// ---------------------------------------------------------------------------
// twoWay: next(99), next(10), next(20)
// ---------------------------------------------------------------------------

export const TWO_WAY_DISPLAY: DisplayRow[] = [
  { src: 1, wrap: [0, 0, 20] },
  { src: 2, wrap: [2, 0, 23] },
  { src: 2, wrap: [4, 34, 61] },
  { src: 2, wrap: [4, 62, 78] },
  { src: 3, wrap: [2, 0, 22] },
  { src: 4, wrap: [2, 0, 24] },
  { src: 5, wrap: [2, 0, 22] },
  { src: 6, wrap: [0, 0, 1] },
  { src: 7, text: '' },
  { src: 8, wrap: [0, 0, 18] },
  { src: 9, text: 'console.log(g.next(99))' },
  { src: 10, text: 'console.log(g.next(10))' },
  { src: 11, text: 'console.log(g.next(20))' },
]

function twoWayDrafts(r: FramesRecording, display: readonly DisplayRow[]): Draft[] {
  const w = new Walk(r.pauses)
  const status = (p: Pause) => statusOf(p.gens?.g, 1, display)
  const out = (p: Pause) => r.observed.slice(0, p.out)
  const state = (p: Pause, locals: FChip[], printed = out(p)): FState => ({
    vars: [],
    lanes: [lane('g', 'g = twoWay()', status(p), locals)],
    output: printed,
  })
  const x = (v: unknown) => chip('x', `x = ${fmt(v)}`)
  const y = (v: unknown) => chip('y', `y = ${fmt(v)}`)
  w.to('create')
  const c1 = w.take('call')
  const start = w.take('start')
  const c2 = w.take('call')
  const gotX = w.take('got-x')
  const y2 = w.take('yield-2')
  const c3 = w.take('call')
  const gotY = w.take('got-y')
  const end = w.take('end')
  const exit = w.take('exit')
  const xv = gotX.vars.x
  const yv = gotY.vars.y
  const S = (p: Pause) => rowOf(display, p.gens!.g.line!)
  return [
    {
      state: state(c1, []),
      focus: [],
      event: 'g = twoWay(): not started',
      why: 'Calling a generator function only creates it; the body waits for the first next().',
      narration: 'g is a generator that has not started.',
    },
    {
      state: state(start, []),
      src: 9,
      focus: [statusId('g')],
      event: 'next(99) starts the body',
      why: 'The body starts from the top, so no yield is paused to receive 99: the first argument is dropped.',
      narration: 'next(99) starts g; 99 has nowhere to go.',
    },
    {
      state: state(c2, []),
      src: 2,
      focus: [statusId('g'), 'output'],
      event: "yield 'first': paused",
      why: "yield hands 'first' out and suspends the frame mid-statement, before x is assigned.",
      narration: `g is paused at line ${S(c2)}. next(99) returned { value: 'first', done: false }.`,
    },
    {
      state: state(y2, [x(xv)]),
      src: [2, 3],
      focus: ['x', 'output'],
      event: `next(10): x is ${fmt(xv)}`,
      why: 'next(10) resumes the paused yield, and 10 becomes that yield’s value, so x is 10 and the log runs.',
      narration: `g resumed. x is ${fmt(xv)}, and it logged got: ${fmt(xv)}.`,
    },
    {
      state: state(c3, [x(xv)]),
      src: 4,
      focus: [statusId('g'), 'output'],
      event: "yield 'second': paused",
      why: "The next yield hands 'second' out and suspends g again, so next(10) returns it.",
      narration: `g is paused at line ${S(c3)}. next(10) returned { value: 'second', done: false }.`,
    },
    {
      state: state(end, [x(xv), y(yv)]),
      src: [4, 5],
      focus: ['y', 'output'],
      event: `next(20): y is ${fmt(yv)}`,
      why: `next(20) resumes the yield paused at line ${S(c3)}, so its value is 20: y is 20 and the log runs.`,
      narration: `g resumed. y is ${fmt(yv)}, and it logged got: ${fmt(yv)}.`,
    },
    {
      state: state(exit, [x(xv), y(yv)]),
      src: 6,
      focus: [statusId('g'), 'output'],
      event: 'Body ends: done is true',
      why: 'No yield is left, so the body ends and g closes: done is true, value undefined.',
      narration: 'g is closed. next(20) returned { value: undefined, done: true }.',
    },
  ]
}

export const twoWaySpec: FramesSpec = {
  id: 'frames/twoWay-next-arg',
  program: twoWayProgram,
  recording: rec[twoWayProgram.id],
  display: TWO_WAY_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('next(10)')),
      prompt: 'next(10) resumes g. What is x?',
      choices: [
        { id: 'ten', label: '10', value: 'got: 10' },
        { id: 'ninety-nine', label: '99' },
      ],
      answer: 'ten',
      feedback: {
        correct: 'The argument becomes the value of the yield g is paused at.',
        byChoice: {
          'ninety-nine': '99 went in before any yield was paused, so it was dropped.',
        },
      },
      recap: { right: 'x was {answer}', wrongLead: 'x was {answer}, not {pick}' },
    },
  ],
}

// ---------------------------------------------------------------------------
// take(source(), 2): the third pull closes the source
// ---------------------------------------------------------------------------

export const TAKE_DISPLAY: DisplayRow[] = [
  { src: 2, wrap: [0, 0, 29] },
  { src: 3, wrap: [2, 0, 31] },
  { src: 3, wrap: [4, 32, 40] },
  { src: 4, wrap: [4, 0, 31] },
  { src: 4, wrap: [6, 32, 60] },
  { src: 5, wrap: [2, 0, 1] },
  { src: 6, wrap: [2, 0, 19] },
  { src: 7, wrap: [2, 0, 13] },
  { src: 8, wrap: [2, 0, 31] },
  { src: 9, wrap: [4, 0, 11] },
  { src: 10, wrap: [4, 0, 10] },
  { src: 11, wrap: [4, 0, 23] },
  { src: 12, wrap: [2, 0, 1] },
  { src: 13, wrap: [0, 0, 1] },
  { src: 14, text: '' },
  { src: 15, wrap: [0, 0, 14] },
  { src: 16, wrap: [0, 0, 14] },
  { src: 17, wrap: [0, 0, 20] },
  { src: 18, wrap: [2, 0, 5] },
  { src: 19, wrap: [4, 0, 14] },
  { src: 20, wrap: [6, 0, 11] },
  { src: 21, wrap: [6, 0, 12] },
  { src: 22, wrap: [4, 0, 1] },
  { src: 23, wrap: [2, 0, 11] },
  { src: 24, wrap: [4, 0, 11] },
  { src: 25, wrap: [2, 0, 1] },
  { src: 26, wrap: [0, 0, 1] },
  { src: 27, wrap: [0, 0, 33] },
  { src: 28, wrap: [0, 0, 23] },
  { src: 29, wrap: [0, 0, 34] },
  { src: 29, wrap: [2, 35, 59] },
  { src: 30, wrap: [0, 0, 34] },
  { src: 30, wrap: [2, 35, 59] },
  { src: 31, wrap: [0, 0, 23] },
  { src: 32, wrap: [0, 0, 33] },
  { src: 32, wrap: [2, 34, 39] },
  { src: 33, wrap: [0, 0, 23] },
  { src: 34, wrap: [0, 0, 23] },
]

function takeDrafts(r: FramesRecording, display: readonly DisplayRow[]): Draft[] {
  const w = new Walk(r.pauses)
  const st = (p: Pause, locals: FChip[]): FState => ({
    vars: [
      { id: varId('pulled'), name: 'pulled', value: String(p.vars.pulled) },
      { id: varId('closed'), name: 'closed', value: String(p.vars.closed) },
    ],
    lanes: [lane('take', 'limited = take(source(), 2)', statusOf(p.gens?.take, 2, display), locals), lane('source', 'source()', statusOf(p.gens?.source, 17, display))],
    output: [],
  })
  const count = (v: unknown) => chip('count', `count = ${fmt(v)}`)
  const value = (v: unknown) => chip('value', `value = ${fmt(v)}`)
  w.to('check')
  const start = w.peek(-1)!
  const pull1 = w.to('source-pull')
  const yield1 = w.to('take-yield')
  const back1 = w.to('call')
  const pull2 = w.to('source-pull')
  const take2 = w.to('take-yield')
  const back2 = w.to('check')
  const check3 = w.to('take-check')
  while (w.peek()?.probe === 'take-check') w.take('take-check')
  // The finally pause itself; the step shows its effect (closed 1), read at the next pause.
  w.to('source-finally')
  const after = w.to('check')
  // take's count as it read at its last pause before `p` (take's locals are watched only in its own frame).
  const countAt = (p: Pause) => {
    const k = r.pauses.indexOf(p)
    for (let i = k; i >= 0; i--) if (r.pauses[i].stack[0]?.fn === 'take' && r.pauses[i].vars.count !== undefined) return r.pauses[i].vars.count
    return undefined
  }
  const S = (p: Pause, g: 'take' | 'source') => rowOf(display, p.gens![g].line!)
  return [
    {
      state: st(start, []),
      focus: [],
      event: 'Two generators, not run',
      why: 'Both calls only create generators: neither body runs until the first next().',
      narration: 'limited and source are created; pulled and closed are 0.',
    },
    {
      state: st(pull1, [count(pull1.vars.count)]),
      src: 29,
      focus: [statusId('take'), statusId('source')],
      event: 'next(): take pulls source',
      why: 'next() starts take; its for...of starts source, so two frames run, one inside the other.',
      narration: 'take and source are both running; count is 0.',
    },
    {
      state: st(yield1, [count(countAt(yield1)), value(yield1.vars.value)]),
      src: 21,
      focus: [varId('pulled'), statusId('source')],
      event: `source yields ${fmt(yield1.vars.value)}`,
      why: 'source counts the pull, then yields, so its frame stays suspended inside the while loop.',
      narration: `pulled is ${fmt(yield1.vars.pulled)}. source is paused; take holds value ${fmt(yield1.vars.value)}.`,
    },
    {
      state: st(back1, [count(countAt(back1)), value(yield1.vars.value)]),
      src: 9,
      focus: [statusId('take'), 'value'],
      event: `take yields ${fmt(yield1.vars.value)}`,
      why: 'take hands the value on and suspends too, so next() returns { value: 1, done: false }.',
      narration: `take is paused at line ${S(back1, 'take')}; the assertion sees value 1.`,
    },
    {
      state: st(pull2, [count(pull2.vars.count)]),
      src: [10, 11],
      focus: ['count', statusId('source')],
      event: `next(): count ${fmt(pull2.vars.count)}, pull`,
      why: 'take resumes after its yield: count becomes 1, which is not n, so for...of resumes source.',
      narration: `count is ${fmt(pull2.vars.count)}. source is running again.`,
    },
    {
      state: st(take2, [count(countAt(take2)), value(take2.vars.value)]),
      src: 21,
      focus: [varId('pulled'), statusId('source')],
      event: `source yields ${fmt(take2.vars.value)}`,
      why: 'source loops back, so it counts the pull and suspends at the same yield with the next value.',
      narration: `pulled is ${fmt(take2.vars.pulled)}; take holds value ${fmt(take2.vars.value)}.`,
    },
    {
      state: st(back2, [count(countAt(back2)), value(take2.vars.value)]),
      src: 9,
      focus: [statusId('take'), 'value'],
      event: `take yields ${fmt(take2.vars.value)}`,
      why: 'take suspends after handing 2 on; closed is still 0 because source is only paused.',
      narration: `Both frames are paused. pulled is ${fmt(back2.vars.pulled)}, closed is ${fmt(back2.vars.closed)}.`,
    },
    {
      state: st(check3, [count(check3.vars.count), value(take2.vars.value)]),
      src: 11,
      focus: ['count', statusId('take')],
      event: `next(): count ${fmt(check3.vars.count)}, return`,
      why: 'take resumes, counts to 2, which is n, so it returns before asking source for a third value.',
      narration: `count is ${fmt(check3.vars.count)}, so take returns; source is still paused.`,
    },
    {
      state: st(after, []),
      src: 24,
      focus: [varId('closed'), statusId('source')],
      event: 'source closes: finally',
      why: 'Leaving for...of early calls source.return(), so its finally runs: closed is 1.',
      narration: `source's finally ran: closed is ${fmt(after.vars.closed)}, pulled stays ${fmt(after.vars.pulled)}. Both are closed.`,
    },
  ]
}

export const takeSpec: FramesSpec = {
  id: 'frames/take-closes-source',
  program: takeProgram,
  recording: rec[takeProgram.id],
  display: TAKE_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('next(): count 2')),
      prompt: 'Third next(): does source pull?',
      choices: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes' },
      ],
      answer: 'no',
      feedback: {
        correct: 'take returns once count reaches 2, before asking source again.',
        byChoice: { yes: 'take checks count after resuming and returns at 2, so source is never asked.' },
      },
      recap: { right: 'source pulled only {answer}', wrongLead: 'No third pull' },
    },
  ],
}

// ---------------------------------------------------------------------------
// take(filter(map(fibonacci(), double), over 10n), 3): how far each value gets
// ---------------------------------------------------------------------------

export const PIPELINE_DISPLAY: DisplayRow[] = [
  { src: 1, wrap: [0, 0, 23] },
  { src: 2, wrap: [2, 0, 10] },
  { src: 3, wrap: [2, 0, 10] },
  { src: 4, wrap: [2, 0, 14] },
  { src: 5, wrap: [4, 0, 7] },
  { src: 6, wrap: [4, 0, 18] },
  { src: 7, wrap: [4, 0, 5] },
  { src: 8, wrap: [4, 0, 8] },
  { src: 9, wrap: [2, 0, 1] },
  { src: 10, wrap: [0, 0, 1] },
  { src: 11, text: '' },
  { src: 12, wrap: [0, 0, 29] },
  { src: 13, wrap: [2, 0, 31] },
  { src: 13, wrap: [4, 32, 40] },
  { src: 14, wrap: [4, 0, 31] },
  { src: 14, wrap: [6, 32, 60] },
  { src: 15, wrap: [2, 0, 1] },
  { src: 16, wrap: [2, 0, 19] },
  { src: 17, wrap: [2, 0, 13] },
  { src: 18, wrap: [2, 0, 31] },
  { src: 19, wrap: [4, 0, 11] },
  { src: 20, wrap: [4, 0, 10] },
  { src: 21, wrap: [4, 0, 23] },
  { src: 22, wrap: [2, 0, 1] },
  { src: 23, wrap: [0, 0, 1] },
  { src: 24, text: '' },
  { src: 25, wrap: [0, 0, 29] },
  { src: 26, wrap: [2, 0, 29] },
  { src: 26, wrap: [4, 30, 45] },
  { src: 27, wrap: [0, 0, 1] },
  { src: 28, wrap: [0, 0, 26] },
  { src: 28, wrap: [2, 27, 39] },
  { src: 29, wrap: [2, 0, 32] },
  { src: 29, wrap: [4, 33, 63] },
  { src: 30, wrap: [0, 0, 1] },
  { src: 31, wrap: [0, 0, 16] },
  { src: 31, wrap: [2, 17, 45] },
  { src: 31, wrap: [2, 46, 78] },
  { src: 31, wrap: [2, 79, 81] },
  { src: 32, text: 'console.log([...pipeline])' },
]

const PIPELINE_HEADERS = { take: 12, filter: 28, map: 25, fibonacci: 1 } as const

function pipelineDrafts(r: FramesRecording, display: readonly DisplayRow[]): Draft[] {
  const w = new Walk(r.pauses)
  let got = 0
  let count: unknown = undefined
  const st = (p: Pause, cells: Partial<Record<'fibonacci' | 'map' | 'filter' | 'take', string>>, printed: string[] = []): FState => ({
    vars: [],
    lanes: [
      ...(['take', 'filter', 'map', 'fibonacci'] as const).map((g) =>
        lane(g, g === 'fibonacci' ? 'fibonacci()' : g, statusOf(p.gens?.[g], PIPELINE_HEADERS[g], display), cells[g] ? [chip(`${g}-value`, cells[g]!)] : []),
      ),
    ],
    output: printed,
  })
  const spread = w.to('spread')
  const drafts: Draft[] = [
    {
      state: st(spread, {}),
      focus: [],
      event: 'Four generators, not run',
      why: 'Each call only wraps the one inside it; the spread pulls from take, which pulls inward.',
      narration: 'take, filter, map and fibonacci are created and not started.',
    },
  ]
  let n = 0
  while (w.peek()?.probe === 'fib-yield') {
    const fib = w.take('fib-yield')
    const mapped = w.take('map-call')
    const test = w.take('filter-test')
    const a = fmt(fib.vars.a)
    const out = fmt(mapped.vars.out)
    const takeCell = count === undefined ? undefined : `count = ${fmt(count)}`
    n++
    if (!test.vars.pass) {
      drafts.push({
        state: st(test, { fibonacci: `a = ${a}`, map: `${a} → ${out}`, filter: `drops ${out}`, ...(takeCell ? { take: takeCell } : {}) }),
        src: 29,
        focus: ['fibonacci-value', 'filter-value'],
        event: `${a} → ${out}: dropped`,
        why: `${out} is not over 10n, so filter pulls again and take never sees it.`,
        narration: `Pull ${n}: fibonacci yielded ${a}, map made ${out}, filter dropped it.`,
      })
      continue
    }
    w.take('filter-yield')
    const took = w.take('take-yield')
    got++
    const resumed = w.take('take-check')
    count = resumed.vars.count
    drafts.push({
      state: st(took, { fibonacci: `a = ${a}`, map: `${a} → ${out}`, filter: `passes ${out}`, take: `yields ${out}` }),
      src: 19,
      focus: ['take-value', 'filter-value'],
      event: `${a} → ${out} reaches take`,
      why: `${out} is over 10n, so filter yields it and take passes it on to the spread.`,
      narration: `Pull ${n}: ${a} became ${out}, passed filter and reached the caller (${got} of 3).`,
    })
  }
  const exit = w.to('exit')
  drafts.push({
    state: st(exit, { take: `count = ${fmt(count)}` }, r.observed.slice(0, exit.out)),
    src: 21,
    focus: [statusId('fibonacci'), 'output'],
    event: `count is ${fmt(count)}: take returns`,
    why: 'take returns at count 3, so its for...of closes filter, which closes map, which closes fibonacci.',
    narration: `All four are closed after ${n} pulls. The spread printed [ 16n, 26n, 42n ].`,
  })
  return drafts
}

export const pipelineSpec: FramesSpec = {
  id: 'frames/lazy-pipeline-pull',
  program: pipelineProgram,
  recording: rec[pipelineProgram.id],
  display: PIPELINE_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('5n →')),
      prompt: 'Next, 5n. Where does it stop?',
      choices: [
        { id: 'filter', label: 'filter' },
        { id: 'take', label: 'take' },
      ],
      answer: 'filter',
      feedback: {
        correct: '5n doubles to 10n, and 10n is not over 10n.',
        byChoice: { take: '5n doubles to 10n, and filter keeps only values over 10n.' },
      },
      recap: { right: '5n stopped at filter', wrongLead: '5n stopped at filter' },
    },
  ],
}

// ---------------------------------------------------------------------------
// yield* forwards next(42) to inner
// ---------------------------------------------------------------------------

export const DELEGATION_DISPLAY: DisplayRow[] = [
  { src: 1, wrap: [0, 0, 19] },
  { src: 2, wrap: [2, 0, 26] },
  { src: 3, wrap: [2, 0, 17] },
  { src: 4, wrap: [0, 0, 1] },
  { src: 5, text: '' },
  { src: 6, wrap: [0, 0, 19] },
  { src: 7, wrap: [2, 0, 21] },
  { src: 8, wrap: [0, 0, 1] },
  { src: 9, text: '' },
  { src: 10, wrap: [0, 0, 17] },
  { src: 11, text: 'console.log(o.next())' },
  { src: 12, text: 'console.log(o.next(42))' },
]

function delegationDrafts(r: FramesRecording, display: readonly DisplayRow[]): Draft[] {
  const w = new Walk(r.pauses)
  // inner's generator object has no name to read, so its status follows the stack: running while its frame is
  // on it, paused at the line of its last pause once it has left, closed once outer has returned its value.
  let innerLast: number | null = null
  const innerStatus = (p: Pause) => {
    if (p.stack.some((f) => f.fn === 'inner')) {
      innerLast = p.stack.find((f) => f.fn === 'inner')!.line
      return 'running'
    }
    if (innerLast === null) return 'not created'
    return p.gens?.outer?.state === 'closed' ? 'closed' : `paused at ${rowOf(display, innerLast)}`
  }
  const st = (p: Pause, inner: FChip[] = []): FState => ({
    vars: [],
    lanes: [lane('outer', 'o = outer()', statusOf(p.gens?.outer, 6, display)), lane('inner', 'inner()', innerStatus(p), inner)],
    output: r.observed.slice(0, p.out),
  })
  w.to('create')
  const c1 = w.take('call')
  const o = w.take('outer-start')
  const i = w.take('inner-start')
  const c2 = w.take('call')
  const ret = w.take('inner-return')
  const exit = w.take('exit')
  const x = chip('x', `x = ${fmt(ret.vars.x)}`)
  return [
    {
      state: st(c1),
      focus: [],
      event: 'o = outer(): not started',
      why: 'outer() only creates the generator; inner() is not even called until outer runs.',
      narration: 'o is a generator that has not started.',
    },
    {
      state: st(o),
      src: 11,
      focus: [statusId('outer')],
      event: 'o.next() starts outer',
      why: 'The first next() runs outer from the top to its yield*, which calls inner() and delegates to it.',
      narration: 'outer is running at its yield*.',
    },
    {
      state: st(i),
      src: 7,
      focus: [statusId('inner')],
      event: 'yield* runs inner',
      why: 'yield* resumes inner for outer, so inner runs inside outer’s next() call, on top of it.',
      narration: 'inner is running inside outer.',
    },
    {
      state: st(c2),
      src: 2,
      focus: [statusId('inner'), 'output'],
      event: "inner yields 'awaiting'",
      why: 'yield* passes inner’s yield straight out, so both frames suspend.',
      narration: "Both are paused. o.next() returned { value: 'awaiting', done: false }.",
    },
    {
      state: st(ret, [x]),
      src: [3, 12],
      focus: ['x', statusId('inner')],
      event: `o.next(42): x is ${fmt(ret.vars.x)}`,
      why: 'yield* forwards next(42) to inner, so 42 becomes the value of inner’s paused yield.',
      narration: `inner resumed with x ${fmt(ret.vars.x)}; outer is still running its yield*.`,
    },
    {
      state: st(exit, [x]),
      src: 3,
      focus: [statusId('outer'), 'output'],
      event: "outer returns 'got 42'",
      why: 'inner’s return value becomes the value of yield*, so outer returns it and done is true.',
      narration: "Both are closed. o.next(42) returned { value: 'got 42', done: true }.",
    },
  ]
}

export const delegationSpec: FramesSpec = {
  id: 'frames/yield-star-forwarding',
  program: delegationProgram,
  recording: rec[delegationProgram.id],
  display: DELEGATION_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('o.next(42)')),
      prompt: 'o.next(42): where does 42 go?',
      choices: [
        { id: 'inner', label: 'inner’s x' },
        { id: 'outer', label: 'outer' },
      ],
      answer: 'inner',
      feedback: {
        correct: 'yield* forwards next(value) to the generator it delegates to.',
        byChoice: {
          outer: 'outer is paused at yield*, which forwards the value to inner.',
        },
      },
      recap: { right: '42 reached {answer}', wrongLead: '42 reached {answer}, not {pick}' },
    },
  ],
}

export const twoWayLog = assemble(twoWaySpec, twoWayDrafts(twoWaySpec.recording, TWO_WAY_DISPLAY))
export const takeLog = assemble(takeSpec, takeDrafts(takeSpec.recording, TAKE_DISPLAY))
export const pipelineLog = assemble(pipelineSpec, pipelineDrafts(pipelineSpec.recording, PIPELINE_DISPLAY))
export const delegationLog = assemble(delegationSpec, delegationDrafts(delegationSpec.recording, DELEGATION_DISPLAY))

/** Each preset's drafts from its recording: the truth test rebuilds them from a fresh run. */
export const GENERATOR_BUILDERS = {
  'twoWay-next-arg': (r: FramesRecording) => assemble({ ...twoWaySpec, recording: r }, twoWayDrafts(r, TWO_WAY_DISPLAY)),
  'take-closes-source': (r: FramesRecording) => assemble({ ...takeSpec, recording: r }, takeDrafts(r, TAKE_DISPLAY)),
  'lazy-pipeline-pull': (r: FramesRecording) => assemble({ ...pipelineSpec, recording: r }, pipelineDrafts(r, PIPELINE_DISPLAY)),
  'yield-star-forwarding': (r: FramesRecording) => assemble({ ...delegationSpec, recording: r }, delegationDrafts(r, DELEGATION_DISPLAY)),
}
