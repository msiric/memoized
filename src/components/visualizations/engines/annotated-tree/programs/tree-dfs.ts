import type { TreeProgram } from './types'

/**
 * Tree DFS (dsa-track/common-techniques/tree-dfs, PREMIUM), practice answer
 * "Maximum Path Sum", TypeScript as written (its commented TreeNode
 * declaration uncommented, then the answer), run on the register's tree
 * [-10, 9, 20, null, null, 15, 7] and on the inset's, 9 replaced by -9. The
 * harness builds the tree with the answer's own TreeNode and prints the
 * answer; nothing else. One return probe on the line that returns from each
 * call reads what the call returns (the inspector's `returnValue`), the
 * clamped child gains it combined and `ans` after the update above it.
 */
const ANSWER = {
  block: { path: 'content/dsa-track/common-techniques/_lessons.json', lesson: '/tree-dfs', problem: 'maximum-path-sum', lang: 'typescript' },
  lessonSha256: '8fa46bcdf415ae16d71372b173d59ef71a19c0cbe5798868e29fbfa0b9ab6251',
} as const

const watch = {
  val: 'root.val',
  left: 'left',
  right: 'right',
  ans: 'ans',
  shape: '(function shape(n) { return n ? [n.val, shape(n.left), shape(n.right)] : null })(root)',
}

/** Program lines 1-10: the TreeNode declaration; 11-38: the answer (its line 24 returns from each call). */
const probes = [{ line: 34, at: 'return', as: 'call', read: ['val', 'left', 'right', 'ans', 'shape'] }] as const

const tree = (left: string) =>
  `const root = new TreeNode(-10, new TreeNode(${left}), new TreeNode(20, new TreeNode(15), new TreeNode(7)));\nconsole.log(maxPathSum(root));`

export const maxPathSumProgram: TreeProgram = {
  id: 'max-path-sum',
  lang: 'ts',
  source: [{ ...ANSWER, lines: [3, 12], uncomment: true }, ANSWER, { code: tree('9') }],
  probes,
  watch,
}

export const maxPathSumNegativeProgram: TreeProgram = {
  id: 'max-path-sum-negative',
  lang: 'ts',
  source: [{ ...ANSWER, lines: [3, 12], uncomment: true }, ANSWER, { code: tree('-9') }],
  probes,
  watch,
}
