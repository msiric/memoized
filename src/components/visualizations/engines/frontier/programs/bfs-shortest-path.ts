import type { FrontierProgram } from './types'

/**
 * Graph BFS (dsa-track/common-techniques/graph-bfs, PREMIUM): "Graph BFS for
 * Finding Shortest Path", its JavaScript example, run as written (the
 * example usage prints the distances). The register's assertion: final
 * A 0, B 1, C 1, D 2, E 2, F 2.
 */
export const bfsShortestPath: FrontierProgram = {
  id: "bfs-shortest-path",
  lang: "js",
  source: [
    { block: { path: "content/dsa-track/common-techniques/graph-bfs/page.mdx", heading: "## **Graph BFS for Finding Shortest Path**", lang: "javascript" }, lessonSha256: "6f493663e73930157902c7cb20a6e5243e50eea50bd304530baac030fbe314e1" },
  ],
  display: [
    { text: "function bfsShortestPath(graph,", src: 1 },
    { text: "    start) {", src: 1 },
    { text: "  let distances = {};", src: 2 },
    { text: "  let queue = [start];", src: 3 },
    { text: "  distances[start] = 0;", src: 4 },
    { text: "  while (queue.length > 0) {", src: 6 },
    { text: "    let vertex = queue.shift();", src: 7 },
    { text: "    for (let neighbor of", src: 9 },
    { text: "        graph[vertex]) {", src: 9 },
    { text: "      if (!(neighbor in", src: 10 },
    { text: "          distances)) {", src: 10 },
    { text: "        distances[neighbor] =", src: 11 },
    { text: "          distances[vertex] + 1;", src: 11 },
    { text: "        queue.push(neighbor);", src: 12 },
    { text: "      }", src: 13 },
    { text: "    }", src: 14 },
    { text: "  }", src: 15 },
    { text: "  return distances;", src: 17 },
    { text: "}", src: 18 },
  ],
  probes: [
    { line: 7, as: "dequeue", read: ["queue","distances","graph"] },
    { line: 10, as: "check", read: ["queue","distances","vertex","neighbor"] },
    { line: 17, as: "return", read: ["queue","distances"] },
  ],
  watch: {
    graph: "graph",
    queue: "queue",
    distances: "distances",
    vertex: "vertex",
    neighbor: "neighbor",
  },
}
