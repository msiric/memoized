import type { DisplayRow } from '../../../step-log/lesson-source'
import type { FrontierProgram } from './types'

/**
 * Graph DFS (dsa-track/common-techniques/graph-dfs, PREMIUM), wave 4B: the
 * lesson's dfsCycleDetection and topologicalSort examples, run as written
 * (each example usage prints its result), plus one variant of the cycle
 * example with E's list emptied (`replace`), so the run reaches A -> C and
 * meets a vertex that is visited but no longer on the recursion stack. The
 * register's assertions: the lesson graph (E -> A) prints true, the variant
 * false; topologicalSort prints [ 'B', 'D', 'A', 'C', 'E', 'F' ].
 */

const CYCLE_BLOCK = {
  block: { path: 'content/dsa-track/common-techniques/graph-dfs/page.mdx', heading: '## **Graph DFS for Detecting Cycles**', lang: 'javascript' },
  lessonSha256: '090c696c1d8e036b4a2c912ff5c728fce45e0410ae0b8dc589b06eade3cf7e56',
} as const

/** The function's rows (lines 1-25), rewrapped to 35 columns at their own spaces. */
const CYCLE_DISPLAY: readonly DisplayRow[] = [
  { src: 1, text: 'function dfsCycleDetection(graph) {' },
  { src: 2, text: '  let visited = new Set();' },
  { src: 3, text: '  let recStack = new Set();' },
  { src: 5, text: '  function dfs(vertex) {' },
  { src: 6, text: '    if (recStack.has(vertex))' },
  { src: 6, text: '        return true;' },
  { src: 7, text: '    if (visited.has(vertex))' },
  { src: 7, text: '        return false;' },
  { src: 9, text: '    visited.add(vertex);' },
  { src: 10, text: '    recStack.add(vertex);' },
  { src: 12, text: '    for (let neighbor of' },
  { src: 12, text: '        graph[vertex]) {' },
  { src: 13, text: '      if (dfs(neighbor))' },
  { src: 13, text: '          return true;' },
  { src: 14, text: '    }' },
  { src: 16, text: '    recStack.delete(vertex);' },
  { src: 17, text: '    return false;' },
  { src: 18, text: '  }' },
  { src: 20, text: '  for (let vertex in graph) {' },
  { src: 21, text: '    if (dfs(vertex)) return true;' },
  { src: 22, text: '  }' },
  { src: 24, text: '  return false;' },
  { src: 25, text: '}' },
]

const CYCLE_PROBES = [
  // Every call, before its two checks: the vertex and both sets.
  { line: 6, as: 'enter', read: ['graph', 'vertex', 'visited', 'recStack'] },
  // Every edge examined, before the call it makes.
  { line: 13, as: 'edge', read: ['vertex', 'neighbor', 'visited', 'recStack'] },
  // A vertex finished: every neighbor is done.
  { line: 16, as: 'finish', read: ['vertex', 'visited', 'recStack'] },
  // The outer loop, before each top-level call.
  { line: 21, as: 'outer', read: ['vertex', 'visited', 'recStack'] },
  { line: 24, as: 'return', read: ['visited', 'recStack'] },
] as const

const CYCLE_WATCH = {
  graph: 'graph',
  vertex: 'vertex',
  neighbor: 'neighbor',
  visited: '[...visited]',
  recStack: '[...recStack]',
}

/** The lesson's example as written: E -> A closes a cycle. */
export const dfsCycle: FrontierProgram = {
  id: 'dfs-cycle',
  lang: 'js',
  source: [CYCLE_BLOCK],
  display: CYCLE_DISPLAY,
  // The run returns true from inside the first call: no vertex finishes and line 24 never runs.
  probes: CYCLE_PROBES.filter((p) => p.as !== 'finish' && p.as !== 'return'),
  watch: CYCLE_WATCH,
}

/** The same example with E's list emptied (one token changed, `replace`): no cycle, so the run reaches A -> C. */
export const dfsCycleNoBackEdge: FrontierProgram = {
  id: 'dfs-cycle-no-back-edge',
  lang: 'js',
  source: [{ ...CYCLE_BLOCK, replace: ["E: ['A']", 'E: []'] }],
  display: CYCLE_DISPLAY,
  probes: CYCLE_PROBES,
  watch: CYCLE_WATCH,
}

/** topologicalSort on the lesson's A-F DAG, as written. */
export const dfsTopological: FrontierProgram = {
  id: 'dfs-topological',
  lang: 'js',
  source: [
    {
      block: { path: 'content/dsa-track/common-techniques/graph-dfs/page.mdx', heading: '## **Topological Sorting of a Directed Acyclic Graph (DAG)**', lang: 'javascript' },
      lessonSha256: 'b31a3445753460bb8f1d66dfeb8a9ec8609c72a9cf6b2565d292dc19aadff56b',
    },
  ],
  display: [
    { src: 1, text: 'function topologicalSort(graph) {' },
    { src: 2, text: '  let visited = new Set();' },
    { src: 3, text: '  let stack = [];' },
    { src: 5, text: '  function dfs(vertex) {' },
    { src: 6, text: '    visited.add(vertex);' },
    { src: 8, text: '    for (let neighbor of' },
    { src: 8, text: '        graph[vertex]) {' },
    { src: 9, text: '      if (!visited.has(neighbor)) {' },
    { src: 10, text: '        dfs(neighbor);' },
    { src: 11, text: '      }' },
    { src: 12, text: '    }' },
    { src: 14, text: '    stack.push(vertex);' },
    { src: 15, text: '  }' },
    { src: 17, text: '  for (let vertex in graph) {' },
    { src: 18, text: '    if (!visited.has(vertex)) {' },
    { src: 19, text: '      dfs(vertex);' },
    { src: 20, text: '    }' },
    { src: 21, text: '  }' },
    { src: 23, text: '  return stack.reverse();' },
    { src: 24, text: '}' },
  ],
  probes: [
    { line: 6, as: 'enter', read: ['graph', 'vertex', 'visited', 'stack'] },
    { line: 9, as: 'check', read: ['vertex', 'neighbor', 'visited', 'stack'] },
    { line: 14, as: 'push', read: ['vertex', 'visited', 'stack'] },
    { line: 23, as: 'return', read: ['visited', 'stack'] },
  ],
  watch: {
    graph: 'graph',
    vertex: 'vertex',
    neighbor: 'neighbor',
    visited: '[...visited]',
    stack: 'stack.slice()',
  },
}
