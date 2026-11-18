import type { DisplayRow } from '../../../step-log/lesson-source'
import type { FrontierProgram } from './types'

/**
 * Topological Sort (dsa-track/common-techniques/topological-sort, PREMIUM),
 * wave 4B: the lesson's Kahn example as written (prints [ 4, 5, 2, 0, 3, 1 ]),
 * the same example with one edge turned back into a cycle (`replace` [3, 1]
 * with [3, 5]: the queue empties with in-degrees left and it returns []),
 * and two practice answers run on the register's inputs: Course Schedule II
 * (findOrder(4, [[1,0],[2,1],[3,2]]) is [0, 1, 2, 3], each pair [a, b] an
 * edge b -> a) and Minimum Height Trees (LeetCode's second example, roots
 * [3, 4]). The answers' text is never committed: `wrap` rows only.
 */

const KAHN_BLOCK = {
  block: {
    path: 'content/dsa-track/common-techniques/topological-sort/page.mdx',
    heading: '## **Topological Sort using Kahn’s Algorithm (BFS)**',
    lang: 'javascript',
  },
  lessonSha256: '6f98d2f225d87f0953aeeda0f58293ce3d68ba8fdb3ef5d29f9ab0949682341e',
} as const

/** The function's rows (lines 1-37), rewrapped to 35 columns at their own spaces. */
const KAHN_DISPLAY: readonly DisplayRow[] = [
  { src: 1, text: 'function topologicalSort(vertices,' },
  { src: 1, text: '    edges) {' },
  { src: 2, text: '  const inDegree =' },
  { src: 2, text: '      Array(vertices).fill(0);' },
  { src: 3, text: '  const graph = Array.from({' },
  { src: 3, text: '      length: vertices }, () =>' },
  { src: 3, text: '      []);' },
  { src: 5, text: '  // Build the graph and calculate' },
  { src: 5, text: '      in-degrees' },
  { src: 6, text: '  for (const [u, v] of edges) {' },
  { src: 7, text: '    graph[u].push(v);' },
  { src: 8, text: '    inDegree[v]++;' },
  { src: 9, text: '  }' },
  { src: 11, text: '  const queue = [];' },
  { src: 12, text: '  for (let i = 0; i < vertices;' },
  { src: 12, text: '      i++) {' },
  { src: 13, text: '    if (inDegree[i] === 0) {' },
  { src: 14, text: '      queue.push(i);' },
  { src: 15, text: '    }' },
  { src: 16, text: '  }' },
  { src: 18, text: '  const topologicalOrder = [];' },
  { src: 19, text: '  while (queue.length > 0) {' },
  { src: 20, text: '    const u = queue.shift();' },
  { src: 21, text: '    topologicalOrder.push(u);' },
  { src: 23, text: '    for (const v of graph[u]) {' },
  { src: 24, text: '      inDegree[v]--;' },
  { src: 25, text: '      if (inDegree[v] === 0) {' },
  { src: 26, text: '        queue.push(v);' },
  { src: 27, text: '      }' },
  { src: 28, text: '    }' },
  { src: 29, text: '  }' },
  { src: 31, text: '  if (topologicalOrder.length ===' },
  { src: 31, text: '      vertices) {' },
  { src: 32, text: '    return topologicalOrder;' },
  { src: 33, text: '  } else {' },
  { src: 34, text: '    // There is a cycle in the' },
  { src: 34, text: '        graph' },
  { src: 35, text: '    return [];' },
  { src: 36, text: '  }' },
  { src: 37, text: '}' },
]

const KAHN_PROBES = [
  { line: 11, as: 'built', read: ['graph', 'inDegree'] },
  { line: 18, as: 'seeded', read: ['queue', 'inDegree'] },
  // Each loop test: the queue before the next shift.
  { line: 19, as: 'loop', read: ['queue', 'order', 'inDegree'] },
  { line: 21, as: 'pop', read: ['u', 'queue', 'order', 'inDegree'] },
  // After inDegree[v]-- (the check reads the new value).
  { line: 25, as: 'dec', read: ['u', 'v', 'queue', 'order', 'inDegree'] },
  { line: 31, as: 'end', read: ['queue', 'order', 'inDegree'] },
] as const

const KAHN_WATCH = {
  graph: 'graph.map((l) => l.slice())',
  inDegree: 'inDegree.slice()',
  queue: 'queue.slice()',
  order: 'topologicalOrder.slice()',
  u: 'u',
  v: 'v',
}

export const kahn: FrontierProgram = {
  id: 'kahn',
  lang: 'js',
  source: [KAHN_BLOCK],
  display: KAHN_DISPLAY,
  probes: KAHN_PROBES,
  watch: KAHN_WATCH,
}

/** The example with its last edge [3, 1] turned into [3, 5]: 5 -> 2 -> 3 -> 5 is a cycle. */
export const kahnCycle: FrontierProgram = {
  id: 'kahn-cycle',
  lang: 'js',
  source: [{ ...KAHN_BLOCK, replace: ['[3, 1]', '[3, 5]'] }],
  display: KAHN_DISPLAY,
  probes: KAHN_PROBES,
  watch: KAHN_WATCH,
}

const ANSWERS = 'content/dsa-track/common-techniques/_lessons.json'

/** Course Schedule II, TypeScript as written; the harness is the register's call. */
export const courseScheduleII: FrontierProgram = {
  id: 'course-schedule-ii',
  lang: 'ts',
  source: [
    {
      block: { path: ANSWERS, lesson: '/topological-sort', problem: 'course-schedule-ii', lang: 'typescript' },
      lessonSha256: '2b99eb933dd32a66290b99cf83b70b2a3375d1e747adfe9a083d051999d49fed',
    },
    // The register's input: a call, never solution code.
    { code: 'console.log(findOrder(4, [[1, 0], [2, 1], [3, 2]]));' },
  ],
  // The answer's rows as [indent, from, to]: its text is resolved from the content, never committed.
  display: [
    { src: 1, wrap: [0, 0, 30] },
    { src: 1, wrap: [4, 31, 53] },
    { src: 1, wrap: [4, 54, 77] },
    { src: 2, wrap: [2, 0, 21] },
    { src: 2, wrap: [6, 22, 42] },
    { src: 2, wrap: [6, 43, 67] },
    { src: 3, wrap: [2, 0, 27] },
    { src: 3, wrap: [6, 28, 54] },
    { src: 4, wrap: [2, 0, 20] },
    { src: 4, wrap: [6, 21, 37] },
    { src: 5, wrap: [4, 0, 13] },
    { src: 6, wrap: [4, 0, 11] },
    { src: 7, wrap: [2, 0, 1] },
    { src: 8, wrap: [2, 0, 23] },
    { src: 9, wrap: [2, 0, 31] },
    { src: 9, wrap: [6, 32, 38] },
    { src: 10, wrap: [4, 0, 21] },
    { src: 11, wrap: [6, 0, 10] },
    { src: 12, wrap: [4, 0, 1] },
    { src: 13, wrap: [2, 0, 1] },
    { src: 14, wrap: [2, 0, 25] },
    { src: 15, wrap: [2, 0, 18] },
    { src: 16, wrap: [4, 0, 21] },
    { src: 17, wrap: [4, 0, 12] },
    { src: 18, wrap: [4, 0, 23] },
    { src: 19, wrap: [6, 0, 23] },
    { src: 20, wrap: [8, 0, 10] },
    { src: 21, wrap: [6, 0, 1] },
    { src: 22, wrap: [4, 0, 1] },
    { src: 23, wrap: [2, 0, 1] },
    { src: 24, wrap: [2, 0, 32] },
    { src: 24, wrap: [6, 33, 44] },
    { src: 25, wrap: [0, 0, 1] },
  ],
  probes: [
    // Each prerequisite pair, before its edge is added.
    { line: 5, as: 'pair', read: ['a', 'b'] },
    { line: 8, as: 'built', read: ['g', 'indeg'] },
    { line: 14, as: 'seeded', read: ['q', 'indeg'] },
    // Each loop test: q before the next shift.
    { line: 15, as: 'loop', read: ['q', 'ans', 'indeg'] },
    { line: 17, as: 'pop', read: ['i', 'q', 'ans', 'indeg'] },
    // Before --indeg[j]: the decremented value is read at the next pause.
    { line: 19, as: 'dec', read: ['i', 'j', 'q', 'ans', 'indeg'] },
    { line: 24, as: 'end', read: ['q', 'ans', 'indeg'] },
  ],
  watch: {
    a: 'a',
    b: 'b',
    g: 'g.map((l) => l.slice())',
    indeg: 'indeg.slice()',
    q: 'q.slice()',
    ans: 'ans.slice()',
    i: 'i',
    j: 'j',
  },
}

/** Minimum Height Trees, TypeScript as written, on LeetCode's second example (n = 6). */
export const minHeightTrees: FrontierProgram = {
  id: 'min-height-trees',
  lang: 'ts',
  source: [
    {
      block: { path: ANSWERS, lesson: '/topological-sort', problem: 'minimum-height-trees', lang: 'typescript' },
      lessonSha256: '57af737e8b21a622285b61e7a692c37c75e8b06d6df88b90377829c766c9f33a',
    },
    // The register's input: a call, never solution code.
    { code: 'console.log(findMinHeightTrees(6, [[3, 0], [3, 1], [3, 2], [3, 4], [5, 4]]));' },
  ],
  // The answer's rows as [indent, from, to]: its text is resolved from the content, never committed.
  display: [
    { src: 1, wrap: [0, 0, 30] },
    { src: 1, wrap: [4, 31, 58] },
    { src: 1, wrap: [4, 59, 69] },
    { src: 2, wrap: [2, 0, 14] },
    { src: 3, wrap: [4, 0, 11] },
    { src: 4, wrap: [2, 0, 1] },
    { src: 5, wrap: [2, 0, 21] },
    { src: 5, wrap: [6, 22, 50] },
    { src: 5, wrap: [6, 51, 58] },
    { src: 6, wrap: [2, 0, 24] },
    { src: 6, wrap: [6, 25, 42] },
    { src: 7, wrap: [2, 0, 29] },
    { src: 8, wrap: [4, 0, 13] },
    { src: 9, wrap: [4, 0, 13] },
    { src: 10, wrap: [4, 0, 12] },
    { src: 11, wrap: [4, 0, 12] },
    { src: 12, wrap: [2, 0, 1] },
    { src: 13, wrap: [2, 0, 23] },
    { src: 14, wrap: [2, 0, 29] },
    { src: 15, wrap: [4, 0, 22] },
    { src: 16, wrap: [6, 0, 10] },
    { src: 17, wrap: [4, 0, 1] },
    { src: 18, wrap: [2, 0, 1] },
    { src: 19, wrap: [2, 0, 25] },
    { src: 20, wrap: [2, 0, 22] },
    { src: 21, wrap: [4, 0, 15] },
    { src: 22, wrap: [4, 0, 23] },
    { src: 23, wrap: [4, 0, 20] },
    { src: 24, wrap: [6, 0, 12] },
    { src: 25, wrap: [6, 0, 23] },
    { src: 26, wrap: [8, 0, 24] },
    { src: 27, wrap: [10, 0, 10] },
    { src: 28, wrap: [8, 0, 1] },
    { src: 29, wrap: [6, 0, 1] },
    { src: 30, wrap: [4, 0, 1] },
    { src: 31, wrap: [4, 0, 28] },
    { src: 32, wrap: [2, 0, 1] },
    { src: 33, wrap: [2, 0, 11] },
    { src: 34, wrap: [0, 0, 1] },
  ],
  probes: [
    { line: 13, as: 'built', read: ['g', 'degree'] },
    { line: 19, as: 'seeded', read: ['q', 'degree'] },
    { line: 21, as: 'round', read: ['q', 'ans', 'degree'] },
    { line: 24, as: 'peel', read: ['a', 'q', 't', 'ans', 'degree'] },
    // Before --degree[b]: the decremented value is read at the next pause.
    { line: 26, as: 'dec', read: ['a', 'b', 't', 'degree'] },
    { line: 31, as: 'splice', read: ['q', 't', 'ans', 'degree'] },
    { line: 33, as: 'end', read: ['q', 'ans', 'degree'] },
  ],
  watch: {
    g: 'g.map((l) => l.slice())',
    degree: 'degree.slice()',
    q: 'q.slice()',
    t: 't.slice()',
    ans: 'ans.slice()',
    a: 'a',
    b: 'b',
  },
}
