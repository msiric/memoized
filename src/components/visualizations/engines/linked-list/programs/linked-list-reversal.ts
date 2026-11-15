import type { PointerProgram } from '../program'

/**
 * In-Place Reversal of a Linked List
 * (dsa-track/common-techniques/linked-list-reversal, PREMIUM): "Reversing a
 * Part of the Linked List", the JavaScript tab, after the `ListNode` class
 * from the same lesson's first example (its lines 1 to 6), which it uses.
 * The blocks are read from a local content checkout (never committed) and
 * checked by sha256. The reader sees the function; the run is the whole
 * example, so its printed output is the lesson's own (1 4 3 2 5).
 * Probe lines are lines of the program as run.
 */
export const reverseBetweenProgram: PointerProgram = {
  id: "reverse-between",
  lang: "js",
  runtime: "node@24.x",
  source: [
    { block: { path: "content/dsa-track/common-techniques/linked-list-reversal/page.mdx", heading: "## **Reversing the Entire Linked List**", lang: "javascript" }, lessonSha256: "cd32eb2b8617ccc824e92e2bfaa36e8e5b5358871e7ff21d2fa191931014af07", lines: [1, 6] },
    { code: '' },
    { block: { path: "content/dsa-track/common-techniques/linked-list-reversal/page.mdx", heading: "## **Reversing a Part of the Linked List**", lang: "javascript" }, lessonSha256: "c173fcc53dba93600e1eb106efb564541566052f6b49c77f0cbd9584345617df" },
  ],
  sha256: "6957db42d3e39bf719f70e0c92a467ada867a82554fae1599af4d64cccc94696",
  observed: ["1", "4", "3", "2", "5"],
  nodeClass: "ListNode",
  valueField: "value",
  classEnd: 6,
  probes: [
    { id: "start", after: 46, vars: ["head"] },
    { id: "init", after: 11, vars: ["head", "previous", "current"] },
    { id: "walk", from: 13, after: 14, vars: ["head", "previous", "current"] },
    { id: "anchors", from: 17, after: 18, vars: ["head", "connection", "tail", "previous", "current"] },
    { id: "next-null", after: 20, vars: ["head", "connection", "tail", "previous", "current", "next"] },
    { id: "flip", from: 22, after: 23, vars: ["head", "connection", "tail", "previous", "current", "next"] },
    { id: "advance", from: 24, after: 25, vars: ["head", "connection", "tail", "previous", "current", "next"] },
    { id: "connect", after: 29, vars: ["head", "connection", "tail", "previous", "current", "next"] },
    { id: "reattach", after: 34, vars: ["head", "connection", "tail", "previous", "current", "next"] },
  ],
}

/**
 * "Reversing the Entire Linked List", the lesson's first example as
 * written: the class, the function and its example usage (5 4 3 2 1).
 */
export const reverseFullProgram: PointerProgram = {
  id: "reverse-full",
  lang: "js",
  runtime: "node@24.x",
  source: [
    { block: { path: "content/dsa-track/common-techniques/linked-list-reversal/page.mdx", heading: "## **Reversing the Entire Linked List**", lang: "javascript" }, lessonSha256: "cd32eb2b8617ccc824e92e2bfaa36e8e5b5358871e7ff21d2fa191931014af07" },
  ],
  sha256: "cd32eb2b8617ccc824e92e2bfaa36e8e5b5358871e7ff21d2fa191931014af07",
  observed: ["5", "4", "3", "2", "1"],
  nodeClass: "ListNode",
  valueField: "value",
  classEnd: 6,
  probes: [
    { id: "start", after: 27, vars: ["head"] },
    { id: "init", from: 9, after: 10, vars: ["previous", "current"] },
    { id: "iteration", from: 13, after: 16, vars: ["previous", "current", "next"] },
  ],
}
