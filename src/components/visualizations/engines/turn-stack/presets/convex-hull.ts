import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint, Step } from '../../../step-log/types'
import { buildLog, type MoveContext, type PresetSpec, type StepWords } from '../build'
import { key, label, signed, turnWord, type HullState } from '../model'
import { fenceLeProgram, fenceLtProgram, lessonPointsProgram } from '../programs/convex-hull'
import type { HullProgram, HullRecording } from '../programs/types'
import recordings from '../recordings/convex-hull.json'

/**
 * Convex Hull, Erect the Fence (R4 `monotone-chain-turn-pops`): the practice
 * answer's monotone chain, one step per pop and per push. The lesson's seven
 * points first (the register's checkpoint: (2,1) arrives with (0,0), (1,1)
 * on the stack, and (1,1) is popped), then a fence with (1,0) and (2,0) on
 * its bottom edge, with the answer's `< 0` (both stay) and with `<= 0`
 * (both go): the register's toggle, each a real run.
 *
 * The pane is the answer's lines 20 to 49 reflowed to the pane. A practice
 * answer is never committed as text: each row is [indent, from, to] of a
 * line of the program as run, resolved from the content for a page. The
 * upper chain's callback body is shown at the lower chain's depth (only
 * whitespace changes), so both turn tests wrap the same way.
 */

/** The rows for the program with `op`: the same rows, the turn tests' last piece one character longer for `<=`. */
export function hullDisplay(op: '<' | '<='): DisplayRow[] {
  const tail = op === '<' ? 62 : 63
  const test = (src: number): DisplayRow[] => [
    { src, wrap: [4, 0, 30] },
    { src, wrap: [6, 31, 55] },
    { src, wrap: [6, 56, tail] },
  ]
  return [
    { src: 20, wrap: [0, 0, 25] },
    { src: 20, wrap: [2, 26, 38] },
    { src: 21, wrap: [0, 0, 22] },
    { src: 22, wrap: [2, 0, 7] },
    { src: 23, wrap: [4, 0, 20] },
    ...test(24),
    { src: 25, wrap: [2, 0, 3] },
    { src: 26, wrap: [4, 0, 12] },
    { src: 27, wrap: [2, 0, 1] },
    { src: 28, wrap: [2, 0, 14] },
    { src: 29, wrap: [0, 0, 3] },
    { src: 31, wrap: [0, 0, 25] },
    { src: 31, wrap: [2, 26, 38] },
    { src: 32, wrap: [0, 0, 5] },
    { src: 33, wrap: [2, 0, 8] },
    { src: 34, wrap: [2, 0, 10] },
    { src: 35, wrap: [2, 0, 17] },
    { src: 36, wrap: [2, 0, 7] },
    { src: 37, wrap: [4, 0, 20] },
    ...test(38),
    { src: 39, wrap: [2, 0, 3] },
    { src: 40, wrap: [4, 0, 12] },
    { src: 41, wrap: [2, 0, 1] },
    { src: 42, wrap: [2, 0, 14] },
    { src: 43, wrap: [0, 0, 3] },
    { src: 45, wrap: [0, 0, 12] },
    { src: 46, wrap: [0, 0, 12] },
    { src: 48, wrap: [0, 0, 24] },
    { src: 49, wrap: [0, 0, 17] },
    { src: 49, wrap: [2, 18, 47] },
  ]
}

const rec = recordings as unknown as Record<string, HullRecording>

/** The turn tests (lines 24 and 38), the pushes (28 and 42), the trimming pops (45, 46) and the return (49). */
const LINES: PresetSpec['lines'] = { test: { lower: 24, upper: 38 }, push: { lower: 28, upper: 42 }, trim: [45, 46], end: 49 }

const crossOf = (c: MoveContext) => `cross(${label(c.turn!.o)}, ${label(c.turn!.a)}, ${label(c.turn!.p)})`

const words = (c: MoveContext): StepWords => {
  const P = label(c.p)
  const chain = c.chain === 'lower' ? 'Lower' : 'Upper'
  if (c.kind === 'pop') {
    const t = c.turn!
    const A = label(t.a)
    const v = signed(t.cross)
    if (t.cross === 0)
      return {
        event: `Pop ${A}: straight on`,
        why: `${crossOf(c)} is 0 and <= 0 counts it, so ${A}, in the middle of a straight run, leaves.`,
        narration: `${chain} chain: ${P} lines up with ${label(t.o)} and ${A}. The cross product is 0, so ${A} is popped.`,
      }
    return {
      event: `Pop ${A}: right turn`,
      why: `${crossOf(c)} is ${v}, below 0, so ${A} bends the chain right and leaves.`,
      narration: `${chain} chain: going from ${label(t.o)} through ${A} to ${P} turns right. The cross product is ${v}, so ${A} is popped.`,
    }
  }
  if (!c.turn) {
    const only = c.stack.length - 1
    return {
      event: `Push ${P}`,
      why:
        only === 0
          ? `The ${c.chain} chain is empty, so ${P} goes on with no turn to test.`
          : `Only ${label(c.stack[0])} is on the stack, so there is no turn to test before ${P} joins.`,
      narration: `${chain} chain: ${P} is pushed.`,
    }
  }
  const t = c.turn
  const A = label(t.a)
  const w = turnWord(t.cross)
  return {
    event: `Push ${P}: ${w === 'straight' ? 'straight on' : 'left turn'}`,
    why:
      t.cross === 0
        ? `${crossOf(c)} is 0, not below 0, so ${A} stays on the line and ${P} joins.`
        : `${crossOf(c)} is ${signed(t.cross)}, ${c.op === '<' ? 'not below' : 'above'} 0, so ${A} stays and ${P} joins.`,
    narration: `${chain} chain: the turn at ${A} is ${w === 'left' ? 'a left turn' : 'straight'} (cross product ${signed(t.cross)}), so ${A} stays and ${P} is pushed.`,
  }
}

const START: StepWords = {
  event: 'Sorted by x, then y',
  why: 'The chains read the points left to right, ties broken by y, so (0,0) comes before (0,3).',
  narration: 'Seven points, sorted by x and then by y. Both chains are empty.',
}

const trim = (s: HullState): StepWords => ({
  event: 'Trim each chain’s end',
  why: 'Each chain ends where the other begins, so popping one end of each keeps every corner once.',
  narration: `The upper chain drops ${label(s.lower[0])}, where the lower chain starts, and the lower chain drops ${label(s.upper![0])}, where the upper starts.`,
})

const END = (out: string, why: string): StepWords => ({
  event: 'Return upper, then lower',
  why,
  narration: `outerTrees returns ${out.replace(/\],\[/g, '], [')}, and the harness prints it.`,
})

const spec = (id: string, program: HullProgram): Pick<PresetSpec, 'id' | 'program' | 'recording' | 'display' | 'lines' | 'words' | 'trim'> => ({
  id: `hull-turn-stack/${id}`,
  program,
  recording: rec[program.id],
  display: hullDisplay(program.op),
  lines: LINES,
  words,
  trim,
})

const stayOrPop = (prompt: string, answer: 'stays' | 'popped', correct: string, wrong: string, recap: string): Checkpoint[] => [
  {
    beforeStep: 0,
    prompt,
    choices: [
      { id: 'stays', label: 'It stays' },
      { id: 'popped', label: 'It is popped' },
    ],
    answer,
    feedback: { correct, byChoice: { [answer === 'stays' ? 'popped' : 'stays']: wrong } },
    recap: { right: recap, wrongLead: `${recap}, not ${answer === 'stays' ? 'popped' : 'kept'}` },
  },
]

/** The step whose turn test decides `a` with `p` arriving (the reveal), by the recorded points. */
const decides = (steps: readonly Step<HullState>[], a: string, p: string) =>
  steps.findIndex((s) => s.state.chain === 'lower' && s.state.turn !== null && key(s.state.turn.a) === a && key(s.state.turn.p) === p)

const at = (steps: readonly Step<HullState>[], cps: Checkpoint[], a: string, p: string) => cps.map((c) => ({ ...c, beforeStep: decides(steps, a, p) }))

export const lessonPointsSpec: PresetSpec = {
  ...spec('monotone-chain-turn-pops', lessonPointsProgram),
  start: START,
  end: END('[[3,3],[0,3],[0,0],[3,0]]', 'Upper then lower, each without its shared end: the four corners, and no point repeats, so the filter drops none.'),
  checkpoints: (steps) =>
    at(
      steps,
      stayOrPop(
        '(2,1) arrives next. Does (1,1) stay?',
        'popped',
        'From (0,0) through (1,1) to (2,1) turns right: cross is −1, so (1,1) leaves.',
        'The path (0,0), (1,1), (2,1) turns right (cross −1), so (1,1) is popped.',
        '(1,1) was popped',
      ),
      '1,1',
      '2,1',
    ),
}

const FENCE_START: StepWords = {
  event: 'Sorted by x, then y',
  why: 'The chains read the points left to right, ties broken by y, so (1,0) comes before (1,1).',
  narration: 'Seven fence posts, sorted by x and then by y; (1,0) and (2,0) lie on the bottom edge. Both chains are empty.',
}

export const fenceLtSpec: PresetSpec = {
  ...spec('fence-collinear-lt', fenceLtProgram),
  start: FENCE_START,
  end: END(
    '[[3,3],[0,3],[0,0],[1,0],[2,0],[3,0]]',
    'Six posts: with < 0 a straight run never pops, so (1,0) and (2,0) stay on the fence, as Erect the Fence asks.',
  ),
  checkpoints: (steps) =>
    at(
      steps,
      stayOrPop(
        '(2,0) is next, in line. Does (1,0) stay?',
        'stays',
        'cross is 0 on a straight line, and < 0 only pops a right turn, so (1,0) stays.',
        'cross is 0 here, and 0 is not below 0, so the loop stops and (1,0) stays.',
        '(1,0) stayed',
      ),
      '1,0',
      '2,0',
    ),
}

export const fenceLeSpec: PresetSpec = {
  ...spec('fence-collinear-le', fenceLeProgram),
  start: FENCE_START,
  end: END('[[3,3],[0,3],[0,0],[3,0]]', 'Only the four corners: <= 0 pops every straight run, so (1,0) and (2,0) are off the fence, which Erect the Fence forbids.'),
  checkpoints: (steps) =>
    at(
      steps,
      stayOrPop(
        '(2,0) is next, in line. Does (1,0) stay?',
        'popped',
        'cross is 0 on a straight line, and <= 0 pops it, so (1,0) leaves.',
        'cross is 0 here, and <= 0 counts 0, so the loop pops (1,0).',
        '(1,0) was popped',
      ),
      '1,0',
      '2,0',
    ),
}

export const lessonPointsLog = buildLog(lessonPointsSpec)
export const fenceLtLog = buildLog(fenceLtSpec)
export const fenceLeLog = buildLog(fenceLeSpec)
