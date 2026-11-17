import type { TreeProbe, TreeProgram } from './types'

/**
 * Maximum Flow and Network Flow Algorithms (dsa-track/advanced-topics,
 * PREMIUM), wave 4B: the residual-graph figures. Both lessons carry the
 * same JavaScript Ford-Fulkerson and Edmonds-Karp blocks (byte-identical:
 * the truth test checks both hashes). The diamond (S, A, B, T as 0 to 3,
 * unit capacities) runs the Ford-Fulkerson class (lines 1-63: the class,
 * without its example usage) under the register's call; the lesson's
 * S/A/B/T network runs it too; the CLRS network is the Edmonds-Karp
 * example as written (it prints 23); the diamond under Edmonds-Karp is the
 * contrast the truth test checks (BFS takes the two short paths and never
 * needs the reverse edge). Probes: the residual lists at the start, after
 * each augmentation (with the path's parents and edge indices) and at the
 * return. Values only are recorded.
 */

const BLOCK = (lesson: 'maximum-flow' | 'network-flow-algorithms', heading: string, sha: string) => ({
  block: { path: `content/dsa-track/advanced-topics/${lesson}/page.mdx`, heading, lang: 'javascript' },
  lessonSha256: sha,
})
const FF_SHA = 'f728159b068c6bd5a0e873a42df646a6fbbd854e472fa77a6e586d7e20c6f8eb'
const EK_SHA = '162a81b902fb4ff16e16c644baadf7f78f1d9abb0dd326840914dfd6a67f897c'
const FF = (lesson: 'maximum-flow' | 'network-flow-algorithms') => ({ ...BLOCK(lesson, '### **Ford-Fulkerson Method**', FF_SHA), lines: [1, 63] as const })
const EK = (lesson: 'maximum-flow' | 'network-flow-algorithms') => BLOCK(lesson, '### **Edmonds-Karp Algorithm**', EK_SHA)

/** The same three pauses in both classes (lines 37, 58 and 61 of either block). */
const probes: readonly TreeProbe[] = [
  { line: 37, as: 'start', read: ['graph'] },
  { line: 58, as: 'augment', read: ['graph', 'parent', 'parentEdge', 'pathFlow', 'maxFlow'] },
  { line: 61, as: 'return', read: ['graph', 'maxFlow'] },
]
const watch = {
  graph: 'this.graph.map((l) => l.map((e) => e.slice()))',
  parent: 'parent.slice()',
  parentEdge: 'parentEdge.slice()',
  pathFlow: 'pathFlow',
  maxFlow: 'maxFlow',
}

/** A harness: the register's network, then the call that prints the flow (calls only). */
const net = (cls: string, n: number, edges: readonly (readonly [number, number, number])[], call: string, sink: number) => ({
  code: [`const g = new ${cls}(${n});`, ...edges.map(([u, v, c]) => `g.addEdge(${u}, ${v}, ${c});`), `console.log(g.${call}(0, ${sink}));`].join('\n'),
})

export const DIAMOND_EDGES = [
  [0, 1, 1],
  [0, 2, 1],
  [1, 2, 1],
  [1, 3, 1],
  [2, 3, 1],
] as const
/** The maximum-flow lesson's "Visual Representation" network: S 0, A 1, B 2, T 3. */
export const SABT_EDGES = [
  [0, 1, 10],
  [1, 2, 4],
  [2, 3, 10],
  [0, 2, 10],
  [1, 3, 2],
] as const

export const ffDiamondProgram: TreeProgram = {
  id: 'ff-diamond',
  lang: 'js',
  source: [FF('maximum-flow'), net('FordFulkerson', 4, DIAMOND_EDGES, 'fordFulkerson', 3)],
  probes,
  watch,
}

export const ffSabtProgram: TreeProgram = {
  id: 'ff-sabt',
  lang: 'js',
  source: [FF('maximum-flow'), net('FordFulkerson', 4, SABT_EDGES, 'fordFulkerson', 3)],
  probes,
  watch,
}

export const ekDiamondProgram: TreeProgram = {
  id: 'ek-diamond',
  lang: 'js',
  source: [{ ...EK('maximum-flow'), lines: [1, 63] as const }, net('EdmondsKarp', 4, DIAMOND_EDGES, 'edmondsKarp', 3)],
  probes,
  watch,
}

/** The network-flow lesson's Edmonds-Karp block as written: its example is the CLRS network, 23. */
export const ekClrsProgram: TreeProgram = {
  id: 'ek-clrs',
  lang: 'js',
  source: [EK('network-flow-algorithms')],
  probes,
  watch,
}

/** The network-flow lesson's Ford-Fulkerson class on the diamond: the shared figure holds for both lessons. */
export const ffDiamondNetworkProgram: TreeProgram = {
  id: 'ff-diamond-network',
  lang: 'js',
  source: [FF('network-flow-algorithms'), net('FordFulkerson', 4, DIAMOND_EDGES, 'fordFulkerson', 3)],
  probes,
  watch,
}
