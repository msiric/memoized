import type { FrontierProgram } from './types'

/**
 * Shortest Path Algorithms (PREMIUM), practice answer "Path With Minimum
 * Effort", TypeScript as written, run on the register's input (the answer
 * has no example usage): 2. The pane shows the search loop; the heap helpers
 * run unchanged.
 */
export const minEffort: FrontierProgram = {
  id: "min-effort",
  lang: "ts",
  source: { path: "content/dsa-track/advanced-topics/_lessons.json", at: "/shortest-path-algorithms > path-with-minimum-effort (answer)" },
  // Byte for byte (a JSON string, so no character is reinterpreted).
  lesson: "function minimumEffortPath(heights: number[][]): number {\n    const m = heights.length;\n    const n = heights[0].length;\n    const dist = Array.from({ length: m }, () => new Array(n).fill(Infinity));\n    dist[0][0] = 0;\n\n    // Min-heap of [effort, row, col]\n    const heap: [number, number, number][] = [[0, 0, 0]];\n    const up = (i: number) => {\n        while (i > 0) {\n            const parent = (i - 1) >> 1;\n            if (heap[parent][0] <= heap[i][0]) break;\n            [heap[parent], heap[i]] = [heap[i], heap[parent]];\n            i = parent;\n        }\n    };\n    const down = (i: number) => {\n        const size = heap.length;\n        while (true) {\n            let smallest = i;\n            const l = 2 * i + 1;\n            const r = 2 * i + 2;\n            if (l < size && heap[l][0] < heap[smallest][0]) smallest = l;\n            if (r < size && heap[r][0] < heap[smallest][0]) smallest = r;\n            if (smallest === i) break;\n            [heap[smallest], heap[i]] = [heap[i], heap[smallest]];\n            i = smallest;\n        }\n    };\n    const push = (v: [number, number, number]) => { heap.push(v); up(heap.length - 1); };\n    const pop = (): [number, number, number] => {\n        const top = heap[0];\n        const last = heap.pop()!;\n        if (heap.length) { heap[0] = last; down(0); }\n        return top;\n    };\n\n    const dirs = [-1, 0, 1, 0, -1];\n    while (heap.length) {\n        const [effort, i, j] = pop();\n        if (i === m - 1 && j === n - 1) return effort;\n        if (effort > dist[i][j]) continue;\n        for (let k = 0; k < 4; ++k) {\n            const x = i + dirs[k];\n            const y = j + dirs[k + 1];\n            if (x >= 0 && x < m && y >= 0 && y < n) {\n                const d = Math.max(effort, Math.abs(heights[x][y] - heights[i][j]));\n                if (d < dist[x][y]) {\n                    dist[x][y] = d;\n                    push([d, x, y]);\n                }\n            }\n        }\n    }\n    return dist[m - 1][n - 1];\n}",
  harness: "console.log(minimumEffortPath([[1, 2, 2], [3, 8, 2], [5, 3, 5]]))",
  display: [
    { text: "const dirs = [-1, 0, 1, 0, -1];", src: 38 },
    { text: "while (heap.length) {", src: 39 },
    { text: "  const [effort, i, j] = pop();", src: 40 },
    { text: "  if (i === m - 1 && j === n - 1)", src: 41 },
    { text: "    return effort;", src: 41 },
    { text: "  if (effort > dist[i][j])", src: 42 },
    { text: "    continue;", src: 42 },
    { text: "  for (let k = 0; k < 4; ++k) {", src: 43 },
    { text: "    const x = i + dirs[k];", src: 44 },
    { text: "    const y = j + dirs[k + 1];", src: 45 },
    { text: "    if (x >= 0 && x < m &&", src: 46 },
    { text: "        y >= 0 && y < n) {", src: 46 },
    { text: "      const d = Math.max(effort,", src: 47 },
    { text: "        Math.abs(heights[x][y] -", src: 47 },
    { text: "          heights[i][j]));", src: 47 },
    { text: "      if (d < dist[x][y]) {", src: 48 },
    { text: "        dist[x][y] = d;", src: 49 },
    { text: "        push([d, x, y]);", src: 50 },
    { text: "      }", src: 51 },
    { text: "    }", src: 52 },
    { text: "  }", src: 53 },
    { text: "}", src: 54 },
    { text: "return dist[m - 1][n - 1];", src: 55 },
  ],
  probes: [
    { line: 40, as: "pop", read: ["heap","dist","heights"] },
    { line: 41, as: "popped", read: ["heap","dist","effort","i","j"] },
    { line: 42, as: "check", read: ["effort","i","j","dist"] },
    { line: 48, as: "relax", read: ["heap","dist","i","j","x","y","d"] },
  ],
  watch: {
    heap: "heap",
    dist: "dist",
    heights: "heights",
    effort: "effort",
    i: "i",
    j: "j",
    x: "x",
    y: "y",
    d: "d",
  },
}
