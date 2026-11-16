import type { TreeProgram } from './types'

/**
 * K-way Merge (dsa-track/common-techniques/k-way-merge, PREMIUM), practice
 * answer "Find K Pairs with Smallest Sums", TypeScript as written, run on
 * the register's input kSmallestPairs([1, 7, 11], [2, 4, 6], 3). The
 * harness prints the answer as JSON; nothing else. Probes (lines of the
 * answer): the heap once seeded (line 43, every loop test), each pop (line
 * 45: the popped i and j, the heap after the pop) and the heap after the
 * iteration's push (line 49).
 */
const ANSWER = {
  block: {
    path: 'content/dsa-track/common-techniques/_lessons.json',
    lesson: '/k-way-merge',
    problem: 'find-k-pairs-with-smallest-sums',
    lang: 'typescript',
  },
  lessonSha256: '88942b6c45dd3a082b3a742e1ecbb7960cbfcb24627a8d195815c580b84d1c4c',
} as const

export const kPairsProgram: TreeProgram = {
  id: 'k-pairs',
  lang: 'ts',
  source: [
    ANSWER,
    {
      code: 'console.log(JSON.stringify(kSmallestPairs([1, 7, 11], [2, 4, 6], 3)));',
    },
  ],
  probes: [
    { line: 43, as: 'test', read: ['heap', 'k', 'nums1', 'nums2'] },
    { line: 45, as: 'pop', read: ['i', 'j', 'heap'] },
    { line: 49, as: 'next', read: ['i', 'j', 'heap'] },
  ],
  watch: {
    heap: 'heap.map((h) => h.slice())',
    k: 'k',
    i: 'i',
    j: 'j',
    nums1: 'nums1.slice()',
    nums2: 'nums2.slice()',
  },
}
