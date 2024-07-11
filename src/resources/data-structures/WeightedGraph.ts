class WeightedGraph<T> {
  private adjacencyList: Map<T, Map<T, number>>

  constructor() {
    this.adjacencyList = new Map<T, Map<T, number>>()
  }

  addVertex(vertex: T): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, new Map<T, number>())
    }
  }

  addEdge(vertex1: T, vertex2: T, weight: number): void {
    if (!this.adjacencyList.has(vertex1)) {
      this.addVertex(vertex1)
    }
    if (!this.adjacencyList.has(vertex2)) {
      this.addVertex(vertex2)
    }
    this.adjacencyList.get(vertex1)!.set(vertex2, weight)
    this.adjacencyList.get(vertex2)!.set(vertex1, weight) // For undirected graph
  }

  removeEdge(vertex1: T, vertex2: T): void {
    this.adjacencyList.get(vertex1)?.delete(vertex2)
    this.adjacencyList.get(vertex2)?.delete(vertex1)
  }

  removeVertex(vertex: T): void {
    if (this.adjacencyList.has(vertex)) {
      this.adjacencyList.delete(vertex)
      for (const neighbors of this.adjacencyList.values()) {
        neighbors.delete(vertex)
      }
    }
  }

  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys())
  }

  getNeighbors(vertex: T): [T, number][] {
    return Array.from(this.adjacencyList.get(vertex) ?? []).map(
      ([neighbor, weight]) => [neighbor, weight],
    )
  }

  getEdgeWeight(vertex1: T, vertex2: T): number | undefined {
    return this.adjacencyList.get(vertex1)?.get(vertex2)
  }
}

export { WeightedGraph }
