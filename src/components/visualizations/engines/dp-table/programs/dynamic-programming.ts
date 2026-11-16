import type { ProgramSource, SourcePart } from '../../../step-log/lesson-source'
import type { DpProgram } from './types'

/**
 * Dynamic Programming (dsa-track/advanced-topics/dynamic-programming,
 * PREMIUM): the R4 preset steps through the answer to the practice question
 * partition-equal-subset-sum, run as TypeScript (Node 24 strips the types),
 * on the register's input [1, 2, 5] (target 4). The answer is never
 * committed: the recorder and the truth test read it from a local content
 * checkout and check its sha256, and the pane's rows carry no text.
 *
 * The program as run is the answer, a blank line, then the harness: one
 * call, printed. The `up` program counts the inner loop up instead of down
 * (line 10 of the answer, four operator and bound swaps; every line keeps
 * its number): the register's contrast, run for real.
 */

const ANSWER = {
  path: 'content/dsa-track/advanced-topics/_lessons.json',
  lesson: '/dynamic-programming',
  problem: 'partition-equal-subset-sum',
  lang: 'typescript',
}
const ANSWER_SHA256 = '85be289e479a01e5a1f2224877b4ec2acda4b058e25a760d4cff2e67f8206e7f'

export const HARNESS = 'The last line is the harness: it calls the answer on the input and prints the result.'

/** The swaps that turn the inner loop's header from counting down to counting up (applied in order, each once). */
export const UP_SWAPS = [
  ['>=', '<='],
  ['--j', '++j'],
  ['= m;', '= x;'],
  ['<= x', '<= m'],
] as const

/** The answer as run, counting j down (as written) or up, then the call. */
export function canPartitionSource(nums: readonly number[], order: 'down' | 'up'): ProgramSource {
  const answer: SourcePart[] =
    order === 'down'
      ? [{ block: ANSWER, lessonSha256: ANSWER_SHA256 }]
      : [
          { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [1, 9] },
          {
            block: ANSWER,
            lessonSha256: ANSWER_SHA256,
            lines: [10, 10],
            swaps: UP_SWAPS,
          },
          { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [11] },
        ]
  return [...answer, { code: '' }, { code: `console.log(canPartition(${JSON.stringify(nums)}));` }]
}

/**
 * Where the run pauses (lines of the program as run): before the item loop
 * (the table after `f[0] = true`), at each item's inner loop header (once
 * per item, so an item whose loop never runs is still seen), before every
 * write, and before the return.
 */
const PROBES = [
  { line: 9, as: 'start', read: ['nums', 'm', 'f'] },
  { line: 10, as: 'item', read: ['x', 'm', 'f'] },
  { line: 11, as: 'write', read: ['x', 'j', 'f'] },
  { line: 14, as: 'return', read: ['m', 'f'] },
] as const

const WATCH = { nums: 'nums', m: 'm', x: 'x', j: 'j', f: 'f' }

const program = (id: string, order: 'down' | 'up', sha256: string, observed: string[]): DpProgram => ({
  id,
  lang: 'ts',
  runtime: 'node@24.x',
  source: canPartitionSource([1, 2, 5], order),
  sha256,
  observed,
  probes: PROBES,
  watch: WATCH,
  names: { table: 'f', item: 'x', index: 'j', target: 'm' },
  harness: HARNESS,
})

export const canPartitionDownProgram = program('can-partition-125-down', 'down', 'ad23a8548065e1b5ef7b5d3dd71886ed8ce5e482e3154923fb113edc979ca642', ['false'])
export const canPartitionUpProgram = program('can-partition-125-up', 'up', '7de3b7b2c01f6aaa8bc2372f97876d571e9594f2a349cccf750c792aa18fc7e0', ['true'])
