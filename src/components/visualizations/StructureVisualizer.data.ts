/**
 * Server-safe data for the StructureVisualizer: the tree shape and the step-log
 * builders. Kept free of `'use client'` so server components can call the builders
 * and pass the result in as props (the same split the SequenceStepper uses).
 */

export type TreeNode = {
  id: string
  label: string
  /** For a binary tree, `[left, right]`; omit for a leaf. */
  children?: TreeNode[]
}

export type StructureFrame = {
  /** The node being visited on this frame, if any. */
  active: string | null
  /** Nodes already visited (rendered in the visited state). */
  visited: string[]
  note: string
}

/**
 * A small, full binary search tree. Every internal node has two children, so the
 * layout reads clearly as a BST (left < node < right) with no lopsided single
 * children.
 *
 *          8
 *        /   \
 *       3      10
 *      / \    /  \
 *     1   6  9    14
 */
const bst: TreeNode = {
  id: '8',
  label: '8',
  children: [
    { id: '3', label: '3', children: [{ id: '1', label: '1' }, { id: '6', label: '6' }] },
    { id: '10', label: '10', children: [{ id: '9', label: '9' }, { id: '14', label: '14' }] },
  ],
}

/** In-order sequence of a binary tree: left subtree, node, right subtree. */
function inorder(node: TreeNode | undefined, out: string[]): void {
  if (!node) return
  const [left, right] = node.children ?? []
  inorder(left, out)
  out.push(node.id)
  inorder(right, out)
}

/**
 * Builds the step-log for an in-order traversal of a binary search tree. Each frame
 * lights the current node and keeps every earlier node in the visited state, so the
 * viewer watches the nodes light up in sorted order.
 */
export function buildInorderTraversalSteps(root: TreeNode = bst): { tree: TreeNode; frames: StructureFrame[] } {
  const order: string[] = []
  inorder(root, order)

  const frames: StructureFrame[] = [
    { active: null, visited: [], note: 'In-order traversal: visit the left subtree, then the node, then the right subtree.' },
  ]
  order.forEach((id, i) => {
    frames.push({
      active: id,
      visited: order.slice(0, i),
      note: i === 0 ? `Visit ${id} — the leftmost node comes first.` : `Visit ${id}.`,
    })
  })
  frames.push({
    active: null,
    visited: order,
    note: `Done — in-order visits every node in sorted order: ${order.join(', ')}.`,
  })

  return { tree: root, frames }
}
