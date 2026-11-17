import type { TreeProgram } from './types'

/**
 * Minimum Spanning Trees (dsa-track/advanced-topics/minimum-spanning-trees,
 * PREMIUM), practice answer "Optimize Water Distribution in a Village",
 * TypeScript as written (the UnionFind class, then the function), run on
 * the register's village (n = 3, wells [1, 2, 2], pipes [[1, 2, 1],
 * [2, 3, 1]]) and on the caption's variant, every well 5. The harness
 * prints the answer; nothing else. Probes (lines of the answer): the edge
 * list once the wells are edges to node 0 and sorted (line 41), every edge
 * the loop tries (line 44), every edge union accepts (line 45) and the
 * return (line 51).
 */
const ANSWER = {
  block: {
    path: 'content/dsa-track/advanced-topics/_lessons.json',
    lesson: '/minimum-spanning-trees',
    problem: 'optimize-water-distribution-in-a-village',
    lang: 'typescript',
  },
  lessonSha256: '749f6720c5e0419e5d8c79bee9748d4644928862f2c45de2edb3ca5ecdfca47f',
} as const

const probes = [
  { line: 41, as: 'edges', read: ['pipes', 'n'] },
  { line: 44, as: 'try', read: ['a', 'b', 'c', 'ans'] },
  { line: 45, as: 'accept', read: ['a', 'b', 'c', 'ans'] },
  { line: 51, as: 'return', read: ['ans'] },
] as const

const watch = {
  pipes: 'pipes.map((e) => e.slice())',
  n: 'n',
  a: 'a',
  b: 'b',
  c: 'c',
  ans: 'ans',
}

const call = (wells: string) => `console.log(minCostToSupplyWater(3, ${wells}, [[1, 2, 1], [2, 3, 1]]));`

export const waterProgram: TreeProgram = {
  id: 'water-wells-122',
  lang: 'ts',
  source: [ANSWER, { code: call('[1, 2, 2]') }],
  probes,
  watch,
}
export const waterAllFiveProgram: TreeProgram = {
  id: 'water-wells-555',
  lang: 'ts',
  source: [ANSWER, { code: call('[5, 5, 5]') }],
  probes,
  watch,
}
