import { combinationSumProgram } from './backtracking'
import { fibMemoProgram, fibProgram, heapProgram, lazyProgram, lpsAnswerProgram, lpsProgram, segmentProgram, unionChainProgram, unionRankProgram, unionSizeProgram } from './dsa'
import { ekClrsProgram, ekDiamondProgram, ffDiamondNetworkProgram, ffDiamondProgram, ffSabtProgram } from './flow'
import { kPairsProgram } from './k-way-merge'
import { waterAllFiveProgram, waterProgram } from './minimum-spanning-trees'
import { suffixArrayProgram, suffixTreeProgram } from './suffix'
import { maxPathSumNegativeProgram, maxPathSumProgram } from './tree-dfs'
import { trieDeleteProgram, trieSearchProgram } from './tries'
import type { TreeProgram } from './types'

/** Every annotated-tree program, by recording file. */
export const TREE_LESSONS: Record<string, readonly TreeProgram[]> = {
  'tree-dfs': [maxPathSumProgram, maxPathSumNegativeProgram],
  tries: [trieSearchProgram, trieDeleteProgram],
  'suffix-arrays-and-suffix-trees': [suffixTreeProgram, suffixArrayProgram],
  backtracking: [combinationSumProgram],
  'minimum-spanning-trees': [waterProgram, waterAllFiveProgram],
  'k-way-merge': [kPairsProgram],
  'segment-trees': [segmentProgram, lazyProgram],
  'union-find': [unionRankProgram, unionSizeProgram, unionChainProgram],
  heaps: [heapProgram],
  'recursion-and-memoization': [fibProgram, fibMemoProgram],
  'palindromic-subsequence': [lpsProgram, lpsAnswerProgram],
  // Wave 4B: the residual-graph figures.
  'maximum-flow': [ffDiamondProgram, ffSabtProgram, ekDiamondProgram],
  'network-flow-algorithms': [ffDiamondNetworkProgram, ekClrsProgram],
}
