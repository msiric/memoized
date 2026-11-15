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
  source: [
    { block: { path: "content/dsa-track/advanced-topics/_lessons.json", lesson: "/shortest-path-algorithms", problem: "path-with-minimum-effort", lang: "typescript" }, lessonSha256: "ab790ad8a8efdfb0abacf3a955a6bc8f458ca6c8239de8b8c41b5a5caca3e0db" },
    // The register's input: a call, never solution code.
    { code: "console.log(minimumEffortPath([[1, 2, 2], [3, 8, 2], [5, 3, 5]]))" },
  ],
  // The answer's rows as [indent, from, to]: its text is resolved from the content, never committed.
  display: [
    { src: 38, wrap: [0, 0, 31] },
    { src: 39, wrap: [0, 0, 21] },
    { src: 40, wrap: [2, 0, 29] },
    { src: 41, wrap: [2, 0, 31] },
    { src: 41, wrap: [4, 32, 46] },
    { src: 42, wrap: [2, 0, 24] },
    { src: 42, wrap: [4, 25, 34] },
    { src: 43, wrap: [2, 0, 29] },
    { src: 44, wrap: [4, 0, 22] },
    { src: 45, wrap: [4, 0, 26] },
    { src: 46, wrap: [4, 0, 22] },
    { src: 46, wrap: [8, 23, 41] },
    { src: 47, wrap: [6, 0, 26] },
    { src: 47, wrap: [8, 27, 51] },
    { src: 47, wrap: [10, 52, 68] },
    { src: 48, wrap: [6, 0, 21] },
    { src: 49, wrap: [8, 0, 15] },
    { src: 50, wrap: [8, 0, 16] },
    { src: 51, wrap: [6, 0, 1] },
    { src: 52, wrap: [4, 0, 1] },
    { src: 53, wrap: [2, 0, 1] },
    { src: 54, wrap: [0, 0, 1] },
    { src: 55, wrap: [0, 0, 26] },
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
