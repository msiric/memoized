import type { FrontierProgram } from './types'

/**
 * Trees (dsa-track/user-defined-data-structures/trees, PREMIUM), practice
 * answer "Binary Search Tree Iterator", TypeScript as written, run on the
 * lesson's BST (the Lowest Common Ancestor example inserts 20, 10, 30, 5, 15,
 * 25, 35; the harness builds that tree with the answer's own TreeNode) and
 * drained with hasNext and next. The register's assertion: the constructor
 * leaves [20, 10, 5]; after next() returns 20 the stack is [30, 25].
 */
export const bstIterator: FrontierProgram = {
  id: "bst-iterator",
  lang: "ts",
  source: [
    { block: { path: "content/dsa-track/user-defined-data-structures/_lessons.json", lesson: "/trees", problem: "binary-search-tree-iterator", lang: "typescript" }, lessonSha256: "d437b32ad3f7ec51ecdfe9c5255d38bf114fd197539e2f5838280e779d78ea41" },
    // The register's input: a call, never solution code.
    { code: "const root = new TreeNode(20,\n    new TreeNode(10, new TreeNode(5), new TreeNode(15)),\n    new TreeNode(30, new TreeNode(25), new TreeNode(35)));\nconst it = new BSTIterator(root);\nwhile (it.hasNext()) console.log(it.next());" },
  ],
  // The answer's rows as [indent, from, to]: its text is resolved from the content, never committed.
  display: [
    { src: 12, wrap: [0, 0, 19] },
    { src: 13, wrap: [2, 0, 17] },
    { src: 14, wrap: [2, 0, 17] },
    { src: 14, wrap: [6, 18, 36] },
    { src: 15, wrap: [4, 0, 16] },
    { src: 16, wrap: [4, 0, 15] },
    { src: 17, wrap: [4, 0, 12] },
    { src: 18, wrap: [6, 0, 21] },
    { src: 19, wrap: [6, 0, 14] },
    { src: 20, wrap: [4, 0, 1] },
    { src: 21, wrap: [2, 0, 1] },
    { src: 23, wrap: [2, 0, 16] },
    { src: 24, wrap: [4, 0, 27] },
    { src: 25, wrap: [4, 0, 15] },
    { src: 26, wrap: [6, 0, 20] },
    { src: 27, wrap: [6, 0, 12] },
    { src: 28, wrap: [8, 0, 21] },
    { src: 29, wrap: [8, 0, 14] },
    { src: 30, wrap: [6, 0, 1] },
    { src: 31, wrap: [4, 0, 1] },
    { src: 32, wrap: [4, 0, 15] },
    { src: 33, wrap: [2, 0, 1] },
    { src: 35, wrap: [2, 0, 20] },
    { src: 36, wrap: [4, 0, 31] },
    { src: 37, wrap: [2, 0, 1] },
    { src: 38, wrap: [0, 0, 1] },
  ],
  probes: [
    { line: 18, as: "push", read: ["stack","cur","tree"] },
    { line: 24, as: "pop", read: ["stack"] },
    { line: 25, as: "popped", read: ["stack","res"] },
    { line: 28, as: "spine", read: ["stack","cur"] },
    { line: 32, as: "return", read: ["stack","res"] },
  ],
  watch: {
    tree: "(function shape(n) { return n ? [n.val, shape(n.left), shape(n.right)] : null })(root)",
    stack: "this.stack.map((n) => n.val)",
    cur: "cur.val",
    res: "res.val",
  },
}
