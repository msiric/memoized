import type { FrontierProgram } from './types'

/**
 * Graph BFS (PREMIUM), practice answer "Shortest Path in Binary Matrix",
 * TypeScript as written, run on the register's input (LeetCode example 2,
 * the answer has no example usage): 4. The answer marks a cell visited by
 * writing 1 into the grid, the same value as a wall.
 */
export const binaryMatrix: FrontierProgram = {
  id: "binary-matrix",
  lang: "ts",
  source: [
    { block: { path: "content/dsa-track/common-techniques/_lessons.json", lesson: "/graph-bfs", problem: "shortest-path-in-binary-matrix", lang: "typescript" }, lessonSha256: "517c02afcdfd491d62b84a44f56d39ed796e26087f2c8f7f7065cbd1f61094d2" },
    // The register's input: a call, never solution code.
    { code: "console.log(shortestPathBinaryMatrix([[0, 0, 0], [1, 1, 0], [1, 1, 0]]))" },
  ],
  // The answer's rows as [indent, from, to]: its text is resolved from the content, never committed.
  display: [
    { src: 1, wrap: [0, 0, 8] },
    { src: 1, wrap: [4, 9, 39] },
    { src: 1, wrap: [4, 40, 61] },
    { src: 2, wrap: [2, 0, 17] },
    { src: 3, wrap: [4, 0, 10] },
    { src: 4, wrap: [2, 0, 1] },
    { src: 5, wrap: [2, 0, 28] },
    { src: 6, wrap: [2, 0, 15] },
    { src: 7, wrap: [2, 0, 29] },
    { src: 8, wrap: [2, 0, 31] },
    { src: 8, wrap: [6, 32, 40] },
    { src: 9, wrap: [4, 0, 26] },
    { src: 10, wrap: [4, 0, 25] },
    { src: 11, wrap: [6, 0, 29] },
    { src: 12, wrap: [8, 0, 11] },
    { src: 13, wrap: [6, 0, 1] },
    { src: 14, wrap: [6, 0, 19] },
    { src: 14, wrap: [10, 20, 38] },
    { src: 15, wrap: [8, 0, 19] },
    { src: 15, wrap: [12, 20, 38] },
    { src: 16, wrap: [10, 0, 25] },
    { src: 17, wrap: [12, 0, 15] },
    { src: 18, wrap: [12, 0, 16] },
    { src: 19, wrap: [10, 0, 1] },
    { src: 20, wrap: [8, 0, 1] },
    { src: 21, wrap: [6, 0, 1] },
    { src: 22, wrap: [4, 0, 1] },
    { src: 23, wrap: [4, 0, 7] },
    { src: 24, wrap: [2, 0, 1] },
    { src: 25, wrap: [2, 0, 10] },
    { src: 26, wrap: [0, 0, 1] },
  ],
  probes: [
    { line: 2, as: "enter", read: ["grid"] },
    { line: 9, as: "level", read: ["ans","q","grid"] },
    { line: 11, as: "expand", read: ["ans","q","nq","grid","i","j"] },
    { line: 23, as: "swap", read: ["ans","nq","grid"] },
  ],
  watch: {
    ans: "ans",
    q: "q",
    nq: "nq",
    grid: "grid",
    i: "i",
    j: "j",
  },
}
