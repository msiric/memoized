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
  source: { path: "content/dsa-track/common-techniques/graph-bfs/page.mdx", at: "## **Graph BFS for Finding Shortest Path** (javascript)" },
  // Byte for byte (a JSON string, so no character is reinterpreted).
  lesson: "function bfsShortestPath(graph, start) {\n    let distances = {};\n    let queue = [start];\n    distances[start] = 0;\n\n    while (queue.length > 0) {\n        let vertex = queue.shift();\n\n        for (let neighbor of graph[vertex]) {\n            if (!(neighbor in distances)) {\n                distances[neighbor] = distances[vertex] + 1;\n                queue.push(neighbor);\n            }\n        }\n    }\n\n    return distances;\n}\n\n// Example usage:\nconst graph = {\n    A: ['B', 'C'],\n    B: ['A', 'D', 'E'],\n    C: ['A', 'F'],\n    D: ['B'],\n    E: ['B', 'F'],\n    F: ['C', 'E']\n};\nconsole.log(bfsShortestPath(graph, 'A'));  // Output: { A: 0, B: 1, C: 1, D: 2, E: 2, F: 2 }",
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
