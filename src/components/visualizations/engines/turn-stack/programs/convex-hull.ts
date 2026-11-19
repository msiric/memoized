import type { ProgramSource, SourcePart } from '../../../step-log/lesson-source'
import type { HullProgram, Pt } from './types'

/**
 * Convex Hull (dsa-track/advanced-topics/convex-hull, PREMIUM): the R4
 * preset steps through the answer to the practice question Erect the Fence
 * (Andrew's monotone chain), run as TypeScript (Node 24 strips the types).
 * The answer is never committed: the recorder and the truth test read it
 * from a local content checkout and check its sha256, and the pane's rows
 * carry no text.
 *
 * The program as run is the answer, a blank line, then the harness: one
 * call on the input, its result printed as JSON. Two inputs: the lesson's
 * seven points (the register's first preset), and a fence whose bottom edge
 * holds two collinear points, (1,0) and (2,0) (the register's second). The
 * `<=` program turns both turn tests from `< 0` into `<= 0` (lines 24 and
 * 38 of the answer, one token swap each; every line keeps its number): the
 * register's contrast, run for real.
 */

const ANSWER = {
  path: 'content/dsa-track/advanced-topics/_lessons.json',
  lesson: '/convex-hull',
  problem: 'erect-the-fence',
  lang: 'typescript',
}
const ANSWER_SHA256 = '4272120960d0d859de579c0e36593ee2bbf64c347003b184bcf6b96375a3a688'

export const HARNESS = 'The last line is the harness: it calls the answer on the input and prints the result as JSON.'

/** The swap that turns a turn test from keeping collinear points to dropping them (each applied once, on its own line). */
export const LE_SWAP = [['< 0', '<= 0']] as const
/** The answer's two turn-test lines (the lower chain's, the upper chain's). */
export const TURN_LINES = [24, 38] as const

/** The lesson's seven points, in the lesson's order (Visual Representation, Graham Scan and Jarvis March examples). */
export const LESSON_POINTS: readonly Pt[] = [
  [0, 3],
  [2, 2],
  [1, 1],
  [2, 1],
  [3, 0],
  [0, 0],
  [3, 3],
]
/** A fence with (1,0) and (2,0) on its bottom edge, between (0,0) and (3,0), and (1,1) inside. */
export const FENCE_POINTS: readonly Pt[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
  [1, 1],
  [3, 3],
  [0, 3],
]

/** The answer as run, with `< 0` (as written) or `<= 0`, then the call. */
export function outerTreesSource(points: readonly Pt[], op: '<' | '<='): ProgramSource {
  const part = (lines: readonly [number, number?], swap = false): SourcePart => ({
    block: ANSWER,
    lessonSha256: ANSWER_SHA256,
    lines,
    ...(swap ? { swaps: LE_SWAP } : {}),
  })
  const [a, b] = TURN_LINES
  const answer: SourcePart[] =
    op === '<'
      ? [{ block: ANSWER, lessonSha256: ANSWER_SHA256 }]
      : [part([1, a - 1]), part([a, a], true), part([a + 1, b - 1]), part([b, b], true), part([b + 1])]
  return [...answer, { code: '' }, { code: `console.log(JSON.stringify(outerTrees(${JSON.stringify(points)})));` }]
}

/**
 * Where the run pauses (lines of the program as run): after the sort (the
 * points in the order the chains read them), before every pop and every
 * push of each chain (the stack, the arriving point and the turn test the
 * loop last evaluated, read by calling the answer's own `cross` in the
 * paused frame), before the two trimming pops, and after them.
 */
const PROBES = [
  { line: 20, as: 'sorted', read: ['trees'] },
  { line: 26, as: 'lower-pop', read: ['lower', 'p', 'cl'] },
  { line: 28, as: 'lower-push', read: ['lower', 'p', 'cl'] },
  { line: 40, as: 'upper-pop', read: ['lower', 'upper', 'p', 'cu'] },
  { line: 42, as: 'upper-push', read: ['lower', 'upper', 'p', 'cu'] },
  { line: 45, as: 'trim', read: ['lower', 'upper'] },
  { line: 48, as: 'join', read: ['lower', 'upper'] },
] as const

/** Side-effect free reads; the turn value calls the answer's own `cross` on the stack's top two and the arriving point. */
const WATCH = {
  trees: 'trees',
  lower: 'lower',
  upper: 'upper',
  p: 'p',
  cl: 'lower.length > 1 ? cross(lower.at(-2), lower.at(-1), p) : null',
  cu: 'upper.length > 1 ? cross(upper.at(-2), upper.at(-1), p) : null',
}

const program = (id: string, points: readonly Pt[], op: '<' | '<=', sha256: string, observed: string[]): HullProgram => ({
  id,
  lang: 'ts',
  runtime: 'node@24.x',
  source: outerTreesSource(points, op),
  sha256,
  observed,
  probes: PROBES,
  watch: WATCH,
  op,
  harness: HARNESS,
})

export const lessonPointsProgram = program('outer-trees-lesson-points', LESSON_POINTS, '<', '35fbe1cd57b320df1a76fd4847192d1fad82d00d3f4bc3befc200daffc24bd29', ['[[3,3],[0,3],[0,0],[3,0]]'])
export const fenceLtProgram = program('outer-trees-fence-lt', FENCE_POINTS, '<', '55b518952d998f14579ddf5fd480838add894f4fd80c76ca433c868137ffa52f', ['[[3,3],[0,3],[0,0],[1,0],[2,0],[3,0]]'])
export const fenceLeProgram = program('outer-trees-fence-le', FENCE_POINTS, '<=', '8c9687fd2085f8097ad06e1bc80b9a55144e1dbe1478481545b5d36ecc07c307', ['[[3,3],[0,3],[0,0],[3,0]]'])
