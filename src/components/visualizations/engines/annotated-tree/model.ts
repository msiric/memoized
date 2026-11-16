/**
 * The annotated-tree substrate (R4 shared visual "annotated-tree", wave
 * 2D): static figures of trees whose nodes and edges carry recorded values.
 * Three panel kinds, one per lesson family, every value from a recorded
 * run (`./presets`):
 *
 * - `gain`: a binary tree whose edges carry what each recursive call
 *   returned and whose nodes carry the value recorded through them (Tree
 *   DFS, maximum path sum);
 * - `trie`: a trie drawn left to right, one character per node, end-of-word
 *   nodes double-ringed (Tries);
 * - `suffix`: a compressed suffix tree drawn left to right, edges labelled
 *   with their substring and [start, end] range, leaves read top to bottom
 *   as the suffix array, with the LCP beside it (Suffix Arrays and Suffix
 *   Trees).
 *
 * Each panel has at most one rest mark family, the neutral `changed` role
 * (H3 R2 Q9, never lime): the recorded path, the cleared flag, the deepest
 * repeat.
 */

export type GainNode = {
  id: string
  value: number
  left: string | null
  right: string | null
  /** What `dfs(node)` returned (the inspector's return value). */
  returned: number
  /** The child gains the call combined, after `max(0, ...)`: as recorded in the frame. */
  gainLeft: number
  gainRight: number
  /** left + right + value: the path through this node, which the call records and never returns. */
  through: number
  /** `ans` after this node's update. */
  ans: number
}

export type GainPanel = {
  kind: 'gain'
  id: string
  heading: string
  root: string
  nodes: Record<string, GainNode>
  /** The recorded best path (the through path that set `ans`), as node ids, left to right. */
  best?: string[]
  /** An edge whose child returned a negative value, labelled with the clamp. */
  clamp?: { child: string }
  /** Lines under the heading naming the notations the panel uses. */
  legend: string[]
  /** Short lines under the drawing (derived from the recording). */
  notes: string[]
}

export type TrieMark = 'path' | 'cleared' | 'pruned' | 'stop'

export type TrieNodeView = {
  id: string
  /** The edge character into this node ('' for the root). */
  char: string
  parent: string | null
  depth: number
  end: boolean
  /** The node's one mark in this panel, if any. */
  mark?: TrieMark
}

export type TriePanel = {
  kind: 'trie'
  id: string
  heading: string
  /** Nodes in insertion (DFS) order; a pruned node is drawn as a dashed ghost. */
  nodes: TrieNodeView[]
  /** Calls and what they returned (printed output), or what a delete did. */
  results: { call: string; value?: string; note?: string }[]
}

export type SuffixNodeView = {
  id: string
  parent: string | null
  /** The edge into this node: its substring and inclusive [start, end] range in the text. */
  edge: { text: string; start: number; end: number } | null
  /** Leaf only: the suffix's start index. */
  leaf?: number
  /** Internal only: the string from the root (a repeated substring). */
  path?: string
  /** On the marked path to the deepest internal node. */
  marked?: boolean
}

export type SuffixPanel = {
  kind: 'suffix'
  id: string
  heading: string
  text: string
  /** Children in character order, so leaves read top to bottom in suffix-array order. */
  nodes: SuffixNodeView[]
  /** The suffix array and LCP of the recorded run, rank by rank. */
  rows: { sa: number; suffix: string; lcp: number }[]
  /** The rank whose LCP is the maximum (the marked cell). */
  maxRank: number
  notes: string[]
}

export type TreePanel = GainPanel | TriePanel | SuffixPanel

export type TreeData = {
  panels: TreePanel[]
}
