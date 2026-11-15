import type { PointerProgram } from '../program'

/**
 * Fast and Slow Pointers (dsa-track/common-techniques/fast-and-slow-pointers,
 * PREMIUM): "Finding the Start of a Cycle in a Linked List", the JavaScript
 * `detectCycle` (the block up to its example usage), after the lesson's
 * `ListNode` class (the first example's lines 1 to 6). The blocks are read
 * from a local content checkout (never committed) and checked by sha256.
 * The register's input replaces the lesson's three-node example: 1 to 6
 * with 6 linking back to 3 (tail a = 2, cycle c = 4), built and printed by
 * the harness after the function.
 */
export const detectCycleProgram: PointerProgram = {
  id: "detect-cycle",
  lang: "js",
  runtime: "node@24.x",
  source: [
    { block: { path: "content/dsa-track/common-techniques/fast-and-slow-pointers/page.mdx", heading: "## **Cycle Detection in a Linked List**", lang: "javascript" }, lessonSha256: "0f675b8fc13bdc7abc8cec506a8c1543ebd342dba0a09cdecab9fa249066ce98", lines: [1, 6] },
    { code: '' },
    { block: { path: "content/dsa-track/common-techniques/fast-and-slow-pointers/page.mdx", heading: "## **Finding the Start of a Cycle in a Linked List**", lang: "javascript" }, lessonSha256: "8b5608f97b246a5d8eab1c5419b876f6717ffa39fb1a7bf31dd2b4786e3263b3", lines: [1, 23] },
    { code: '' },
    // The harness: builds the register's input and prints the result (calls only).
    { code: "const nodes = [1, 2, 3, 4, 5, 6].map((v) => new ListNode(v));\nnodes.forEach((node, i) => { node.next = nodes[i + 1] ?? nodes[2]; });\nconst head = nodes[0];\nconsole.log(detectCycle(head).value);" },
  ],
  sha256: "33e889aa9cbf3b902582c5e45411e0847304a021f4f5cb8d7c0d37d74b38fa49",
  observed: ["3"],
  nodeClass: "ListNode",
  valueField: "value",
  classEnd: 6,
  harness: "The three lines after the function build 1 to 6 with 6 linking back to 3 and print the value detectCycle returns.",
  probes: [
    { id: "start", after: 34, vars: ["head"] },
    { id: "init", after: 9, vars: ["slow", "fast"] },
    { id: "stride", from: 12, after: 13, vars: ["slow", "fast"] },
    { id: "reset", from: 17, after: 18, vars: ["slow", "fast", "pointer1", "pointer2"] },
    { id: "walk", from: 21, after: 22, vars: ["slow", "fast", "pointer1", "pointer2"] },
  ],
}
