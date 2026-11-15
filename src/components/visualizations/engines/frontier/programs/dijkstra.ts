import type { FrontierProgram } from './types'

/**
 * Shortest Path Algorithms (dsa-track/advanced-topics/shortest-path-
 * algorithms, PREMIUM): "Dijkstra's Algorithm", its JavaScript example, run
 * as written. The pane shows the dijkstra method; MinHeap and the graph
 * set-up run unchanged. The register's assertion: pops 0@0 4@3 3@5 2@6 1@8,
 * then the stale (9, 1) is skipped; result [0, 8, 6, 5, 3].
 */
export const dijkstra: FrontierProgram = {
  id: "dijkstra",
  lang: "js",
  source: [
    { block: { path: "content/dsa-track/advanced-topics/shortest-path-algorithms/page.mdx", heading: "### **Dijkstra's Algorithm**", lang: "javascript" }, lessonSha256: "a45296260215abd47f799e798483dfa5e5153f88f27f4b2bdd9c1f103d38a84b" },
  ],
  display: [
    { text: "dijkstra(src) {", src: 81 },
    { text: "  const dist =", src: 82 },
    { text: "    Array(this.V).fill(Infinity);", src: 82 },
    { text: "  dist[src] = 0;", src: 83 },
    { text: "  const minHeap = new MinHeap();", src: 84 },
    { text: "  minHeap.insert(0, src);", src: 85 },
    { text: "  while (!minHeap.isEmpty()) {", src: 87 },
    { text: "    const { key: uDist, value: u }", src: 88 },
    { text: "      = minHeap.extractMin();", src: 88 },
    { text: "    if (uDist > dist[u]) continue;", src: 90 },
    { text: "    if (this.adj.has(u)) {", src: 92 },
    { text: "      for (const [v, weight] of", src: 93 },
    { text: "          this.adj.get(u)) {", src: 93 },
    { text: "        if (dist[u] + weight <", src: 94 },
    { text: "            dist[v]) {", src: 94 },
    { text: "          dist[v] =", src: 95 },
    { text: "            dist[u] + weight;", src: 95 },
    { text: "          minHeap.insert(dist[v],", src: 96 },
    { text: "            v);", src: 96 },
    { text: "        }", src: 97 },
    { text: "      }", src: 98 },
    { text: "    }", src: 99 },
    { text: "  }", src: 100 },
    { text: "  return dist;", src: 102 },
    { text: "}", src: 103 },
  ],
  probes: [
    { line: 88, as: "pop", read: ["heap","dist","adj"] },
    { line: 90, as: "popped", read: ["heap","dist","u","uDist"] },
    { line: 94, as: "relax", read: ["heap","dist","u","v","weight"] },
    { line: 102, as: "return", read: ["heap","dist"] },
  ],
  watch: {
    heap: "minHeap.heap.map((e) => [e.key, e.value])",
    dist: "dist",
    adj: "[...this.adj].map(([u, es]) => [u, es])",
    u: "u",
    uDist: "uDist",
    v: "v",
    weight: "weight",
  },
}
