import { suffixArrayProgram, suffixTreeProgram } from './suffix'
import { maxPathSumNegativeProgram, maxPathSumProgram } from './tree-dfs'
import { trieDeleteProgram, trieSearchProgram } from './tries'
import type { TreeProgram } from './types'

/** Every annotated-tree program, by recording file. */
export const TREE_LESSONS: Record<string, readonly TreeProgram[]> = {
  'tree-dfs': [maxPathSumProgram, maxPathSumNegativeProgram],
  tries: [trieSearchProgram, trieDeleteProgram],
  'suffix-arrays-and-suffix-trees': [suffixTreeProgram, suffixArrayProgram],
}
