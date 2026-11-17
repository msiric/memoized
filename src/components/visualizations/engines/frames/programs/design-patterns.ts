import type { BlockRef, ProgramSource } from '../../../step-log/lesson-source'
import type { FramesProgram, Probe } from '../program'

/**
 * Advanced Patterns (js-track/advanced-concepts/design-patterns, PREMIUM):
 * the lesson's Observer fragment has one flat dispatch loop, so the visual
 * steps through the answer to its practice question
 * observer-pub-sub-pattern-implement-eventemitter, run on the question's own
 * visible checks (the R4 register's presets). Neither is committed: the
 * recorder and the truth test read both from a local content checkout, and
 * the pane's rows carry no text.
 *
 * The program as run: two harness lines (the checks import `assert` and
 * `test`; here `test` just calls its body), the reference class (its
 * `export` dropped, a keyword), a blank line, then one visible check.
 */

const LESSONS = 'content/js-track/advanced-concepts/_lessons.json'
const problem = 'observer-pub-sub-pattern-implement-eventemitter'
const EMITTER: BlockRef = { path: LESSONS, lesson: '/design-patterns', problem, lang: 'javascript' }
const EMITTER_SHA256 = '5d3053f4e1ffd095a92f260cd95b0dacc5a045c238512fe3e4d1f2f0704712eb'
/** The question's visible checks (`checks.mjs`, its second JavaScript fence). */
const CHECKS: BlockRef = { path: LESSONS, lesson: '/design-patterns', problem, lang: 'javascript', nth: 2, field: 'question' }
const CHECKS_SHA256 = '0af08f149d812c93f2edc647981ba8c1ba748d782547243f3cc9758589d091dd'

/** The class's lines as run start after the two harness lines. */
const C = 2
/** The check's first line as run: after the class (45 lines) and a blank line. */
const T = C + 45 + 2

export function emitterSource(check: readonly [number, number]): ProgramSource {
  return [
    { code: "const assert = require('node:assert/strict')" },
    { code: 'const test = (name, fn) => fn()' },
    { block: EMITTER, lessonSha256: EMITTER_SHA256, replace: ['export class', 'class'] },
    { code: '' },
    { block: CHECKS, lessonSha256: CHECKS_SHA256, lines: check },
  ]
}

/** The registration Set for 'tick', as record numbers with their once flags, from any frame that can see it. */
const RECORD_LIST = "(m) => [...(m.get('tick') ?? [])].map((e) => [__vzId(e), e.once])"
const RECORDS = ['bus.#listeners', RECORD_LIST] as const
const RECORDS_IN_EMIT = ['this.#listeners', RECORD_LIST] as const
const W = { records: RECORDS, order: 'order' }

/**
 * emit's lines (class lines 36-44): the snapshot (before the copy is made,
 * so the Set read there is exactly what is copied), the membership check of
 * every turn, the once check, the call and the return. Each emit frame on
 * the stack reports the record its loop holds (its cursor).
 */
const EMIT_PROBES: readonly Probe[] = [
  { line: C + 38, as: 'snapshot', watch: { ...W, records: RECORDS_IN_EMIT, snapshot: '[...entries].map(__vzId)' } },
  { line: C + 39, as: 'turn', watch: { ...W, records: RECORDS_IN_EMIT, entry: '__vzId(entry)', member: 'entries.has(entry)' } },
  { line: C + 40, as: 'once', watch: { ...W, records: RECORDS_IN_EMIT, entry: '__vzId(entry)' } },
  { line: C + 42, as: 'call', watch: { ...W, records: RECORDS_IN_EMIT, entry: '__vzId(entry)' } },
  { line: C + 44, as: 'emit-end', watch: { ...W, records: RECORDS_IN_EMIT } },
]

const FRAME_WATCH = { emit: { entry: '__vzId(entry)' } }

/** A line of the check as run, from its line in `checks.mjs`, given the first line taken. */
const at = (from: number) => (line: number) => T + line - from

/**
 * "a once consumed by a nested emission is skipped by an older snapshot"
 * (check lines 84-99): A logs outer, emits again (A logs inner, the once
 * record O is removed, then logs once), and the outer loop's turn for O
 * fails its membership check. Expected order [outer, inner, once].
 */
const n = at(84)
export const nestedOnceProgram: FramesProgram = {
  id: 'once-consumed-by-nested-emit',
  lang: 'js',
  runtime: 'node@24.x',
  source: emitterSource([84, 99]),
  sha256: '02484cb60c564899cc652f661e8d38fbeab6e9629b7f1cc96cf90072e4a0f7a1',
  observed: [],
  probes: [
    ...EMIT_PROBES,
    { line: n(88), as: 'register', watch: W },
    { line: n(89), as: 'handler', watch: { ...W, nested: 'nested' } },
    { line: n(92), as: 'nested-emit', watch: W },
    { line: n(93), as: 'nested-done', watch: W },
    { line: n(96), as: 'register', watch: W },
    // The once handler's body, on its registration line.
    { line: n(96), column: 25, as: 'handler', watch: W },
    { line: n(97), as: 'emit', watch: W },
    { line: n(98), as: 'assert', watch: W },
  ],
  frameWatch: FRAME_WATCH,
  harness: 'The first two lines are the harness: assert, and a test that calls its body.',
}

/**
 * "snapshot additions wait and removals before a turn cancel it" (check
 * lines 54-69): the first handler removes `removed` and adds `late` during
 * the first emit; `removed` is skipped at its turn and `late` waits. The
 * second emit snapshots [first, late] (and the first handler adds another
 * late, which waits again). Expected [first], then [first, first, late].
 */
const s = at(54)
export const snapshotProgram: FramesProgram = {
  id: 'snapshot-add-remove',
  lang: 'js',
  runtime: 'node@24.x',
  source: emitterSource([54, 69]),
  sha256: 'f4706fdfbcedb79da60615fa7e7ae2cdb63c3756cb0445ee00c2cb8be4eb69c1',
  observed: [],
  probes: [
    ...EMIT_PROBES,
    { line: s(57), column: 21, as: 'handler', watch: W },
    { line: s(58), column: 24, as: 'handler', watch: W },
    { line: s(59), as: 'register', watch: W },
    { line: s(60), as: 'handler', watch: W },
    { line: s(61), as: 'off', watch: W },
    { line: s(62), as: 'on', watch: W },
    { line: s(63), as: 'handler-end', watch: W },
    { line: s(64), as: 'register', watch: W },
    { line: s(65), as: 'emit', watch: W },
    { line: s(66), as: 'assert', watch: W },
    { line: s(67), as: 'emit', watch: W },
    { line: s(68), as: 'assert', watch: W },
  ],
  frameWatch: FRAME_WATCH,
  harness: 'The first two lines are the harness: assert, and a test that calls its body.',
}
