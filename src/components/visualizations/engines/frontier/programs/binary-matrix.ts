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
  source: { path: "content/dsa-track/common-techniques/_lessons.json", at: "/graph-bfs > shortest-path-in-binary-matrix (answer)" },
  // Byte for byte (a JSON string, so no character is reinterpreted).
  lesson: "function shortestPathBinaryMatrix(grid: number[][]): number {\n    if (grid[0][0]) {\n        return -1;\n    }\n    const max = grid.length - 1;\n    grid[0][0] = 1;\n    let q: number[][] = [[0, 0]];\n    for (let ans = 1; q.length > 0; ++ans) {\n        const nq: number[][] = [];\n        for (const [i, j] of q) {\n            if (i === max && j === max) {\n                return ans;\n            }\n            for (let x = i - 1; x <= i + 1; ++x) {\n                for (let y = j - 1; y <= j + 1; ++y) {\n                    if (grid[x]?.[y] === 0) {\n                        grid[x][y] = 1;\n                        nq.push([x, y]);\n                    }\n                }\n            }\n        }\n        q = nq;\n    }\n    return -1;\n}",
  harness: "console.log(shortestPathBinaryMatrix([[0, 0, 0], [1, 1, 0], [1, 1, 0]]))",
  display: [
    { text: "function", src: 1 },
    { text: "    shortestPathBinaryMatrix(grid:", src: 1 },
    { text: "    number[][]): number {", src: 1 },
    { text: "  if (grid[0][0]) {", src: 2 },
    { text: "    return -1;", src: 3 },
    { text: "  }", src: 4 },
    { text: "  const max = grid.length - 1;", src: 5 },
    { text: "  grid[0][0] = 1;", src: 6 },
    { text: "  let q: number[][] = [[0, 0]];", src: 7 },
    { text: "  for (let ans = 1; q.length > 0;", src: 8 },
    { text: "      ++ans) {", src: 8 },
    { text: "    const nq: number[][] = [];", src: 9 },
    { text: "    for (const [i, j] of q) {", src: 10 },
    { text: "      if (i === max && j === max) {", src: 11 },
    { text: "        return ans;", src: 12 },
    { text: "      }", src: 13 },
    { text: "      for (let x = i - 1;", src: 14 },
    { text: "          x <= i + 1; ++x) {", src: 14 },
    { text: "        for (let y = j - 1;", src: 15 },
    { text: "            y <= j + 1; ++y) {", src: 15 },
    { text: "          if (grid[x]?.[y] === 0) {", src: 16 },
    { text: "            grid[x][y] = 1;", src: 17 },
    { text: "            nq.push([x, y]);", src: 18 },
    { text: "          }", src: 19 },
    { text: "        }", src: 20 },
    { text: "      }", src: 21 },
    { text: "    }", src: 22 },
    { text: "    q = nq;", src: 23 },
    { text: "  }", src: 24 },
    { text: "  return -1;", src: 25 },
    { text: "}", src: 26 },
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
