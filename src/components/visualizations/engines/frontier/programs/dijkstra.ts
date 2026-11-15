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
  source: { path: "content/dsa-track/advanced-topics/shortest-path-algorithms/page.mdx", at: "### **Dijkstra's Algorithm** (javascript)" },
  // Byte for byte (a JSON string, so no character is reinterpreted).
  lesson: "class MinHeap {\n    constructor() {\n        this.heap = [];\n    }\n\n    insert(key, value) {\n        this.heap.push({ key, value });\n        this.bubbleUp();\n    }\n\n    extractMin() {\n        if (this.heap.length === 0) return null;\n        if (this.heap.length === 1) return this.heap.pop();\n\n        const min = this.heap[0];\n        this.heap[0] = this.heap.pop();\n        this.bubbleDown();\n        return min;\n    }\n\n    bubbleUp() {\n        let index = this.heap.length - 1;\n        while (index > 0) {\n            const parentIndex = Math.floor((index - 1) / 2);\n            if (this.heap[index].key >= this.heap[parentIndex].key) break;\n            [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];\n            index = parentIndex;\n        }\n    }\n\n    bubbleDown() {\n        let index = 0;\n        const length = this.heap.length;\n        const element = this.heap[0];\n\n        while (true) {\n            const leftChildIndex = 2 * index + 1;\n            const rightChildIndex = 2 * index + 2;\n            let leftChild, rightChild;\n            let swapIndex = null;\n\n            if (leftChildIndex < length) {\n                leftChild = this.heap[leftChildIndex];\n                if (leftChild.key < element.key) {\n                    swapIndex = leftChildIndex;\n                }\n            }\n\n            if (rightChildIndex < length) {\n                rightChild = this.heap[rightChildIndex];\n                if (\n                    (swapIndex === null && rightChild.key < element.key) ||\n                    (swapIndex !== null && rightChild.key < leftChild.key)\n                ) {\n                    swapIndex = rightChildIndex;\n                }\n            }\n\n            if (swapIndex === null) break;\n            [this.heap[index], this.heap[swapIndex]] = [this.heap[swapIndex], this.heap[index]];\n            index = swapIndex;\n        }\n    }\n\n    isEmpty() {\n        return this.heap.length === 0;\n    }\n}\n\nclass Graph {\n    constructor(vertices) {\n        this.V = vertices;\n        this.adj = new Map();\n    }\n\n    addEdge(u, v, w) {\n        if (!this.adj.has(u)) this.adj.set(u, []);\n        this.adj.get(u).push([v, w]);\n    }\n\n    dijkstra(src) {\n        const dist = Array(this.V).fill(Infinity);\n        dist[src] = 0;\n        const minHeap = new MinHeap();\n        minHeap.insert(0, src);\n\n        while (!minHeap.isEmpty()) {\n            const { key: uDist, value: u } = minHeap.extractMin();\n\n            if (uDist > dist[u]) continue;\n\n            if (this.adj.has(u)) {\n                for (const [v, weight] of this.adj.get(u)) {\n                    if (dist[u] + weight < dist[v]) {\n                        dist[v] = dist[u] + weight;\n                        minHeap.insert(dist[v], v);\n                    }\n                }\n            }\n        }\n\n        return dist;\n    }\n}\n\n// Example usage:\nconst graph = new Graph(5);\ngraph.addEdge(0, 1, 9);\ngraph.addEdge(0, 2, 6);\ngraph.addEdge(0, 3, 5);\ngraph.addEdge(0, 4, 3);\ngraph.addEdge(2, 1, 2);\ngraph.addEdge(2, 3, 4);\n\nconsole.log(graph.dijkstra(0));\n// Output: [ 0, 8, 6, 5, 3 ]",
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
