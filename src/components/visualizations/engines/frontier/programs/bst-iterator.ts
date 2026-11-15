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
  source: { path: "content/dsa-track/user-defined-data-structures/_lessons.json", at: "/trees > binary-search-tree-iterator (answer)" },
  // Byte for byte (a JSON string, so no character is reinterpreted).
  lesson: "class TreeNode {\n    val: number\n    left: TreeNode | null\n    right: TreeNode | null\n    constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null) {\n        this.val = (val===undefined ? 0 : val)\n        this.left = (left===undefined ? null : left)\n        this.right = (right===undefined ? null : right)\n    }\n}\n\nclass BSTIterator {\n    stack: TreeNode[]\n    constructor(root: TreeNode | null) {\n        this.stack = [];\n        let cur = root;\n        while(cur) {\n            this.stack.push(cur);\n            cur = cur.left\n        }\n    }\n\n    next(): number {\n        let res = this.stack.pop();\n        if(res.right) {\n            let cur = res.right;\n            while(cur) {\n                this.stack.push(cur);\n                cur = cur.left\n            }\n        }        \n        return res.val;\n    }\n\n    hasNext(): boolean {\n        return this.stack.length !== 0;\n    }\n}",
  harness: "const root = new TreeNode(20,\n    new TreeNode(10, new TreeNode(5), new TreeNode(15)),\n    new TreeNode(30, new TreeNode(25), new TreeNode(35)));\nconst it = new BSTIterator(root);\nwhile (it.hasNext()) console.log(it.next());",
  display: [
    { text: "class BSTIterator {", src: 12 },
    { text: "  stack: TreeNode[]", src: 13 },
    { text: "  constructor(root:", src: 14 },
    { text: "      TreeNode | null) {", src: 14 },
    { text: "    this.stack = [];", src: 15 },
    { text: "    let cur = root;", src: 16 },
    { text: "    while(cur) {", src: 17 },
    { text: "      this.stack.push(cur);", src: 18 },
    { text: "      cur = cur.left", src: 19 },
    { text: "    }", src: 20 },
    { text: "  }", src: 21 },
    { text: "  next(): number {", src: 23 },
    { text: "    let res = this.stack.pop();", src: 24 },
    { text: "    if(res.right) {", src: 25 },
    { text: "      let cur = res.right;", src: 26 },
    { text: "      while(cur) {", src: 27 },
    { text: "        this.stack.push(cur);", src: 28 },
    { text: "        cur = cur.left", src: 29 },
    { text: "      }", src: 30 },
    { text: "    }", src: 31 },
    { text: "    return res.val;", src: 32 },
    { text: "  }", src: 33 },
    { text: "  hasNext(): boolean {", src: 35 },
    { text: "    return this.stack.length !== 0;", src: 36 },
    { text: "  }", src: 37 },
    { text: "}", src: 38 },
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
