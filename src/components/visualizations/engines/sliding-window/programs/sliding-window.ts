import type { SourcePart } from '../../../step-log/lesson-source'
import type { Probe, WindowProgram } from '../program'

/**
 * Sliding Window Technique (dsa-track/common-techniques/sliding-window,
 * PREMIUM): "Variable Size Sliding Window", its JavaScript example, run as
 * written: longestSubstringWithKDistinct and its example usage on "araaci"
 * with K = 2, which prints 4. The block is read from a local content
 * checkout (never committed) and checked by sha256.
 *
 * The `if` program is the same block with the shrink loop's `while` written
 * as `if` (line 13, the one keyword changed; every line keeps its number):
 * the R2 calibration's contrast, run for real.
 */

const BLOCK = {
  path: 'content/dsa-track/common-techniques/sliding-window/page.mdx',
  heading: '## **Variable Size Sliding Window**',
  lang: 'javascript',
}
const BLOCK_SHA256 = '3340bf1a65e80dc2a9c082fe6bb905ff8cb54c3e9f2a127d1c4bc7950200c672'

/** Lines of the program as run: each iteration's first line, the shrink check, the record, the return. */
const PROBES: readonly Probe[] = [
  { line: 6, as: 'iter' },
  { line: 13, as: 'check' },
  { line: 23, as: 'record' },
  { line: 26, as: 'return' },
]

const program = (id: string, source: SourcePart[], sha256: string): WindowProgram => ({
  id,
  lang: 'js',
  runtime: 'node@24.x',
  source,
  sha256,
  observed: ['4'],
  names: { left: 'windowStart', right: 'windowEnd', store: 'charFrequency', storeKind: 'map', best: 'maxLength' },
  probes: PROBES,
  watch: {
    s: 's',
    k: 'K',
    left: 'windowStart',
    right: 'windowEnd',
    best: 'maxLength',
    store: 'Object.entries(charFrequency)',
  },
})

/** The lesson's example as written: the shrink is a `while`. */
export const kDistinctWhileProgram = program(
  'k-distinct-araaci-while',
  [{ block: BLOCK, lessonSha256: BLOCK_SHA256 }],
  BLOCK_SHA256,
)

/** The same example with `if` for `while` on line 13: one keyword, every line number kept. */
export const kDistinctIfProgram = program(
  'k-distinct-araaci-if',
  [
    { block: BLOCK, lessonSha256: BLOCK_SHA256, lines: [1, 12] },
    { block: BLOCK, lessonSha256: BLOCK_SHA256, lines: [13, 13], replace: ['while', 'if'] },
    { block: BLOCK, lessonSha256: BLOCK_SHA256, lines: [14] },
  ],
  '6fc2a6e8c0746914521f991a8f7febc8b186fbcb190f669fafaa466f81150e33',
)
