import type { BlockRef, ProgramSource } from '../../../step-log/lesson-source'
import type { FramesProgram, Probe } from '../program'

/**
 * Async/Await (js-track/advanced-concepts/async-await, PREMIUM): the lesson
 * body has no concurrency limit, so the visual steps through the answer to
 * its practice question implement-a-concurrency-limiter-maplimit-promise-pool
 * (the R4 register's preset). The answer is never committed: the recorder
 * and the truth test read it from a local content checkout, and the pane's
 * rows carry no text.
 *
 * Timing is the harness's, never a clock: every operation waits on a gate
 * the harness releases in the register's order, one release per turn of the
 * event loop (`setImmediate`), as the question's own checks release
 * "manually released Promises". The harness is the visual's own code:
 * gates, the callback (it upper-cases its item, or rejects), the releases
 * and one printed outcome.
 */

const LESSONS = 'content/js-track/advanced-concepts/_lessons.json'
const MAP_LIMIT: BlockRef = {
  path: LESSONS,
  lesson: '/async-await',
  problem: 'implement-a-concurrency-limiter-maplimit-promise-pool',
  lang: 'javascript',
}
const MAP_LIMIT_SHA256 = '718802f1771457795ed0b4aef82b052510104cd2db6b911ee38f11722f7c82e7'

/** One release: the operation at `index` settles, fulfilled (`true`) or rejected. */
export type Release = readonly [index: number, ok: boolean]

/**
 * The harness after the function under test: gates, a callback that waits on
 * its gate, and the releases in order, each on a fresh turn of the event loop
 * so every continuation of the previous release has run. It prints the
 * result, or the rejection.
 */
export function harness(call: string, releases: readonly Release[]): string[] {
  return [
    'const gates = []',
    'const asyncFn = (item, index) => new Promise((resolve, reject) => {',
    '  gates[index] = (ok) => (ok ? resolve(item.toUpperCase()) : reject(new Error(`${item} failed`)))',
    '})',
    'const tick = () => new Promise((r) => setImmediate(r))',
    ';(async () => {',
    `  const run = ${call}.then((r) => console.log(r), (e) => console.log('rejected:', e.message))`,
    `  for (const [i, ok] of ${JSON.stringify(releases)}) {`,
    '    await tick()',
    '    gates[i](ok)',
    '  }',
    '  await run',
    '})()',
  ]
}

const POOL_CALL = "mapLimit(['a', 'b', 'c', 'd'], 2, asyncFn)"

/** The answer as run: `export` dropped (a keyword), then the harness. */
export function poolSource(releases: readonly Release[]): ProgramSource {
  return [
    { block: MAP_LIMIT, lessonSha256: MAP_LIMIT_SHA256, replace: ['export async function', 'async function'] },
    { code: '' },
    ...harness(POOL_CALL, releases).map((code) => ({ code })),
  ]
}

/** Lines of the harness, after the answer's 26 and a blank line. */
const H = 28
/** The release line (`gates[i](ok)`), the harness's tenth. */
const RELEASE_LINE = H + 9

const W = { results: 'Array.from(results)', next: 'next', stopped: 'stopped' }

/**
 * The worker's loop: the condition (every pass, so the pause after a
 * resumption sees the written result), the claim, the call, the catch; the
 * return; and each release. Each worker frame reports its number (the
 * `Array.from` index it was called with) and the index it holds.
 */
const POOL_PROBES: readonly Probe[] = [
  { line: 13, as: 'check', watch: W },
  { line: 14, as: 'claim', watch: W },
  { line: 16, as: 'call', watch: { ...W, index: 'index' } },
  { line: 18, as: 'catch', watch: { ...W, index: 'index' }, optional: true },
  { line: 25, as: 'return', watch: W, optional: true },
  { line: RELEASE_LINE, as: 'release', watch: { i: 'i', ok: 'ok' } },
]

const poolProgram = (id: string, releases: readonly Release[], sha256: string, observed: string[]): FramesProgram => ({
  id,
  lang: 'js',
  runtime: 'node@24.x',
  source: poolSource(releases),
  sha256,
  observed,
  probes: POOL_PROBES,
  frameWatch: { worker: { worker: 'arguments[1]', index: 'index' } },
  harness: 'The lines after the function are the harness: gates the operations wait on, released in a fixed order, one per turn of the event loop, and the printed outcome.',
})

/** Release order 1, 0, 2, 3 (the question's check releases index 1 first). */
export const REFILL: readonly Release[] = [
  [1, true],
  [0, true],
  [2, true],
  [3, true],
]
/** Index 1 rejects; index 0 is released after the returned promise has rejected. */
export const FAILURE: readonly Release[] = [
  [1, false],
  [0, true],
]

export const refillProgram = poolProgram('refill-on-settle', REFILL, '30e643d5b0a28773c8e4864bdf56eaa672748c7c9a5b79bb0540b7ee03973901', ["[ 'A', 'B', 'C', 'D' ]"])
export const failureProgram = poolProgram('failure-stops-claims', FAILURE, '0eed339232ef06c490b23f681c8f6fb13aa624c2ddd09645de603c2f4e2e6f2a', ['rejected: b failed'])

/**
 * The contrast (register preset B): fixed batches, the wrong mental model
 * the question warns about ("Do not wait for an entire fixed batch"). This
 * is the visual's own code, not the lesson's, written to the pane as is; it
 * is recorded under the same harness and release order.
 */
export const BATCHES_CODE = [
  'async function mapBatches(items,',
  '  n, fn) {',
  '  const results = []',
  '  for (let i = 0; i < items.length;',
  '    i += n) {',
  '    const batch =',
  '      items.slice(i, i + n)',
  '    const done = await Promise.all(',
  '      batch.map((x, j) =>',
  '        fn(x, i + j)))',
  '    results.push(...done)',
  '  }',
  '  return results',
  '}',
]

export const batchesSource: ProgramSource = [
  ...BATCHES_CODE.map((code) => ({ code })),
  { code: '' },
  ...harness("mapBatches(['a', 'b', 'c', 'd'], 2, asyncFn)", REFILL).map((code) => ({ code })),
]

const BH = BATCHES_CODE.length + 2
const BW = { results: 'results', i: 'i' }

export const batchesProgram: FramesProgram = {
  id: 'fixed-batches-contrast',
  lang: 'js',
  runtime: 'node@24.x',
  source: batchesSource,
  sha256: '643ad75680a57d1ad7e056e1c7e305999f185782df2a05525ce4cafc04ae7b21',
  observed: ["[ 'A', 'B', 'C', 'D' ]"],
  probes: [
    { line: 4, as: 'loop', watch: BW },
    { line: 6, as: 'batch', watch: BW },
    { line: 11, as: 'push', watch: { ...BW, done: 'done' } },
    { line: 13, as: 'return', watch: BW },
    // The callback starting an operation (the harness's gate line).
    { line: BH + 2, as: 'start', watch: { index: 'index' } },
    { line: BH + 9, as: 'release', watch: { i: 'i', ok: 'ok' } },
  ],
  harness: 'The function is the visual’s own contrast, not the lesson’s; the lines after it are the harness, as for mapLimit.',
}
