import type { BlockRef, ProgramSource } from '../../../step-log/lesson-source'
import type { FramesProgram } from '../program'

/**
 * Generators (js-track/advanced-concepts/generators, PREMIUM): the lesson
 * body has no two-way `next(arg)`, no closing `take` and no forwarding
 * `yield*`, so the visual steps through its practice answers and the
 * question's visible checks (the R4 register's presets). None of it is
 * committed: the recorder and the truth test read the blocks from a local
 * content checkout, and the panes' rows carry no text. Harness lines (the
 * register's calls, printed) are the visual's own.
 */

const LESSONS = 'content/js-track/advanced-concepts/_lessons.json'
const lesson = '/generators'

/** "Generator Functions vs Regular Functions", the answer's two-way example (its second fence). */
const TWO_WAY: BlockRef = { path: LESSONS, lesson, problem: 'generator-functions-vs-regular-functions', lang: 'javascript', nth: 2 }
const TWO_WAY_SHA256 = '42af50ca3fb3b23f0d5f073fc8116499798826114e7abb83a67c523c15817a8e'
/** "Infinite Sequences with Generators", the reference answer (`fibonacci`, `take`). */
const REFERENCE: BlockRef = { path: LESSONS, lesson, problem: 'infinite-sequences-with-generators', lang: 'javascript' }
const REFERENCE_SHA256 = '77cb0d2ac037d56690ef732fba733396f0a5a89dbf39d503a5dd6bb4729d9acf'
/** The same question's visible checks (`check.mjs`): the `source` counters and the `map`/`filter` pipeline. */
const CHECKS: BlockRef = { path: LESSONS, lesson, problem: 'infinite-sequences-with-generators', lang: 'javascript', nth: 2, field: 'question' }
const CHECKS_SHA256 = 'aaa0ec25c8546cf9a4d14d001b7d60a635142b9810afd99712d83ee2f7db3281'
/** "`yield*` Delegation", the answer's forwarding example (its third fence). */
const DELEGATION: BlockRef = { path: LESSONS, lesson, problem: 'yield-delegation', lang: 'javascript', nth: 3 }
const DELEGATION_SHA256 = '9df731c0723f73394bb9b18751a2fc56387adb4567d8fa2582b219cb95dcbf78'

/** The reference exports its functions: run as a script, `export` is dropped (a keyword, never answer text). */
const unexport = ['export function*', 'function*'] as const

/**
 * twoWay with the register's calls: the answer's generator and `const g =
 * twoWay()` (lines 1-8), then three printed calls. next(99) starts the body,
 * which has no paused yield to receive 99; next(10) and next(20) each resume
 * a paused yield with their argument.
 */
export const twoWaySource: ProgramSource = [
  { block: TWO_WAY, lessonSha256: TWO_WAY_SHA256, lines: [1, 8] },
  { code: 'console.log(g.next(99))' },
  { code: 'console.log(g.next(10))' },
  { code: 'console.log(g.next(20))' },
]

export const twoWayProgram: FramesProgram = {
  id: 'two-way-next-arg',
  lang: 'js',
  runtime: 'node@24.x',
  source: twoWaySource,
  sha256: 'b32b3ef79172c59587787d4e7875a23694e7bf8f6837b2a7f92ba5787e2597fc',
  observed: ["{ value: 'first', done: false }", 'got: 10', "{ value: 'second', done: false }", 'got: 20', '{ value: undefined, done: true }'],
  probes: [
    { line: 2, as: 'start' },
    { line: 3, as: 'got-x', watch: { x: 'x' } },
    { line: 4, as: 'yield-2', watch: { x: 'x' } },
    { line: 5, as: 'got-y', watch: { x: 'x', y: 'y' } },
    { line: 6, as: 'end', watch: { x: 'x', y: 'y' } },
    { line: 8, as: 'create' },
    { line: 9, as: 'call' },
    { line: 10, as: 'call' },
    { line: 11, as: 'call' },
  ],
  gens: [{ id: 'g', expr: 'g' }],
  harness: 'The last three lines are the harness: the register’s calls, each result printed.',
}

/**
 * take(source(), 2): the reference's `take` (lines 12-23), then the visible
 * check's counters and source (check lines 23-42), which assert every
 * result. The first line requires `assert` (the check file imports it).
 */
export const takeSource: ProgramSource = [
  { code: "const assert = require('node:assert/strict')" },
  { block: REFERENCE, lessonSha256: REFERENCE_SHA256, lines: [12, 23], replace: unexport },
  { code: '' },
  { block: CHECKS, lessonSha256: CHECKS_SHA256, lines: [23, 42] },
]

/** The check's counters, and take's count once it is declared (absent before). */
const TAKE_WATCH = { pulled: 'pulled', closed: 'closed', count: 'count' }

export const takeProgram: FramesProgram = {
  id: 'take-closes-source',
  lang: 'js',
  runtime: 'node@24.x',
  source: takeSource,
  sha256: 'fb33104b93957fef3d1c28687ab52a11efbfafeb0d8002d73ef2e87755c94a40',
  observed: [],
  probes: [
    { line: 7, as: 'take-start', watch: TAKE_WATCH },
    { line: 9, as: 'take-yield', watch: { ...TAKE_WATCH, value: 'value' } },
    { line: 10, as: 'take-count', watch: TAKE_WATCH },
    { line: 11, as: 'take-check', watch: TAKE_WATCH },
    { line: 20, as: 'source-pull', watch: TAKE_WATCH },
    { line: 21, as: 'source-yield', watch: TAKE_WATCH },
    { line: 24, as: 'source-finally', watch: TAKE_WATCH },
    { line: 27, as: 'create', watch: TAKE_WATCH },
    { line: 28, as: 'check', watch: TAKE_WATCH },
    { line: 29, as: 'call', watch: TAKE_WATCH },
    { line: 30, as: 'call', watch: TAKE_WATCH },
    { line: 31, as: 'check', watch: TAKE_WATCH },
    { line: 32, as: 'call', watch: TAKE_WATCH },
    { line: 33, as: 'check', watch: TAKE_WATCH },
    { line: 34, as: 'check', watch: TAKE_WATCH },
  ],
  gens: [
    { id: 'take', expr: 'limited' },
    { id: 'source', of: 'take', name: 'iterable' },
  ],
  harness: 'The first line is the harness: it requires assert, which the check file imports.',
}

/**
 * take(filter(map(fibonacci(), double), over 10), 3): the reference (both
 * functions), then the check's map, filter and pipeline (check lines 84-90),
 * and one printed spread.
 */
export const pipelineSource: ProgramSource = [
  { block: REFERENCE, lessonSha256: REFERENCE_SHA256, lines: [1, 10], replace: unexport },
  { block: REFERENCE, lessonSha256: REFERENCE_SHA256, lines: [11, 11] },
  { block: REFERENCE, lessonSha256: REFERENCE_SHA256, lines: [12, 23], replace: unexport },
  { code: '' },
  { block: CHECKS, lessonSha256: CHECKS_SHA256, lines: [84, 90] },
  { code: 'console.log([...pipeline])' },
]

export const pipelineProgram: FramesProgram = {
  id: 'lazy-pipeline-pull',
  lang: 'js',
  runtime: 'node@24.x',
  source: pipelineSource,
  sha256: '97d1597f3bb32794e28c1c3881dd30d64c643ab0c5120bc475572770c13a21ed',
  observed: ['[ 16n, 26n, 42n ]'],
  probes: [
    { line: 5, as: 'fib-yield', watch: { a: 'a' } },
    { line: 19, as: 'take-yield', watch: { value: 'value', count: 'count' } },
    { line: 21, as: 'take-check', watch: { count: 'count' } },
    // map's and filter's loop bodies (a for...of line pauses once at its head otherwise).
    { line: 26, column: 38, as: 'map-call', watch: { value: 'value', out: 'fn(value)' } },
    { line: 29, column: 36, as: 'filter-test', watch: { value: 'value', pass: 'predicate(value)' } },
    { line: 29, column: 54, as: 'filter-yield', watch: { value: 'value' } },
    { line: 31, as: 'create' },
    { line: 32, as: 'spread' },
  ],
  gens: [
    { id: 'take', expr: 'pipeline' },
    { id: 'filter', of: 'take', name: 'iterable' },
    { id: 'map', of: 'filter', name: 'iterable' },
    { id: 'fibonacci', of: 'map', name: 'iterable' },
  ],
  harness: 'The last line is the harness: it spreads the pipeline and prints the result.',
}

/** outer delegating to inner (the answer's lines 1-10), then the two printed calls of its example. */
export const delegationSource: ProgramSource = [
  { block: DELEGATION, lessonSha256: DELEGATION_SHA256, lines: [1, 10] },
  { code: 'console.log(o.next())' },
  { code: 'console.log(o.next(42))' },
]

export const delegationProgram: FramesProgram = {
  id: 'yield-star-forwarding',
  lang: 'js',
  runtime: 'node@24.x',
  source: delegationSource,
  sha256: 'bc368e9a4af7a50951b7992034ff046a2028af61af8e9440ac695e08c9fce745',
  observed: ["{ value: 'awaiting', done: false }", "{ value: 'got 42', done: true }"],
  probes: [
    { line: 2, as: 'inner-start' },
    { line: 3, as: 'inner-return', watch: { x: 'x' } },
    { line: 7, as: 'outer-start' },
    { line: 10, as: 'create' },
    { line: 11, as: 'call' },
    { line: 12, as: 'call' },
  ],
  gens: [{ id: 'outer', expr: 'o' }],
  harness: 'The last two lines are the harness: the example’s calls, each result printed.',
}
