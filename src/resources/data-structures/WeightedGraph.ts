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
          ...this.getNeighbors(vertex)
            .map(([neighbor]) => neighbor)
            .filter((neighbor) => !visited.has(neighbor)),
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
          ...this.getNeighbors(vertex)
            .map(([neighbor]) => neighbor)
            .filter((neighbor) => !visited.has(neighbor)),
        )
      }
    }

    return result
  }

  dijkstra(
    startVertex: T,
    endVertex: T,
  ): { distance: number; path: T[] } | null {
    const distances = new Map<T, number>()
    const previous = new Map<T, T | null>()
    const pq: [number, T][] = []

    distances.set(startVertex, 0)
    this.getVertices().forEach((vertex) => {
      if (vertex !== startVertex) {
        distances.set(vertex, Infinity)
      }
      previous.set(vertex, null)
    })

    pq.push([0, startVertex])

    while (pq.length > 0) {
      pq.sort((a, b) => a[0] - b[0])
      const [currentDistance, currentVertex] = pq.shift()!

      if (currentVertex === endVertex) {
        const path: T[] = []
        let vertex: T | null = endVertex
        while (vertex !== null) {
          path.push(vertex)
          vertex = previous.get(vertex) ?? null
        }
        return { distance: currentDistance, path: path.reverse() }
      }

      if (currentDistance > distances.get(currentVertex)!) {
        continue
      }

      for (const [neighbor, weight] of this.getNeighbors(currentVertex)) {
        const distance = currentDistance + weight
        if (distance < distances.get(neighbor)!) {
          distances.set(neighbor, distance)
          previous.set(neighbor, currentVertex)
          pq.push([distance, neighbor])
        }
      }
    }

    return null
  }

  clear(): void {
    this.adjacencyList.clear()
  }
}

export { WeightedGraph }
