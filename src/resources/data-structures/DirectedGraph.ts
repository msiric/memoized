class DirectedGraph<T> {
  private adjacencyList: Map<T, Set<T>>

  constructor() {
    this.adjacencyList = new Map<T, Set<T>>()
  }

  addVertex(vertex: T): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, new Set<T>())
    }
  }

  addEdge(vertex1: T, vertex2: T): void {
    if (!this.adjacencyList.has(vertex1)) {
      this.addVertex(vertex1)
    }
    if (!this.adjacencyList.has(vertex2)) {
      this.addVertex(vertex2)
    }
    this.adjacencyList.get(vertex1)!.add(vertex2)
  }

  removeEdge(vertex1: T, vertex2: T): void {
    this.adjacencyList.get(vertex1)?.delete(vertex2)
  }

  removeVertex(vertex: T): void {
    if (this.adjacencyList.has(vertex)) {
      this.adjacencyList.delete(vertex)
      for (const neighbors of this.adjacencyList.values()) {
        neighbors.delete(vertex)
      }
    }
  }

  hasEdge(vertex1: T, vertex2: T): boolean {
    return this.adjacencyList.get(vertex1)?.has(vertex2) ?? false
  }

  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys())
  }

  getNeighbors(vertex: T): T[] {
    return Array.from(this.adjacencyList.get(vertex) ?? [])
  }

  bfs(startVertex: T): T[] {
    const visited = new Set<T>()
    const queue: T[] = [startVertex]
    const result: T[] = []

    while (queue.length > 0) {
      const vertex = queue.shift()!
      if (!visited.has(vertex)) {
        visited.add(vertex)
        result.push(vertex)
        queue.push(
          ...this.getNeighbors(vertex).filter(
            (neighbor) => !visited.has(neighbor),
          ),
        )
      }
    }

    return result
  }

  dfs(startVertex: T): T[] {
    const visited = new Set<T>()
    const stack: T[] = [startVertex]
    const result: T[] = []

    while (stack.length > 0) {
      const vertex = stack.pop()!
      if (!visited.has(vertex)) {
        visited.add(vertex)
        result.push(vertex)
        stack.push(
          ...this.getNeighbors(vertex).filter(
            (neighbor) => !visited.has(neighbor),
          ),
        )
      }
    }

    return result
  }
}

export { DirectedGraph }
