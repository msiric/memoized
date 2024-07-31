class UndirectedGraph<T> {
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
    this.adjacencyList.get(vertex2)!.add(vertex1)
  }

  removeEdge(vertex1: T, vertex2: T): void {
    this.adjacencyList.get(vertex1)?.delete(vertex2)
    this.adjacencyList.get(vertex2)?.delete(vertex1)
  }

  removeVertex(vertex: T): void {
    if (this.adjacencyList.has(vertex)) {
      for (const neighbor of this.adjacencyList.get(vertex)!) {
        this.adjacencyList.get(neighbor)!.delete(vertex)
      }
      this.adjacencyList.delete(vertex)
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

  hasCycle(): boolean {
    const visited = new Set<T>()

    const dfs = (vertex: T, parent: T | null): boolean => {
      visited.add(vertex)

      for (const neighbor of this.getNeighbors(vertex)) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, vertex)) {
            return true
          }
        } else if (neighbor !== parent) {
          return true
        }
      }

      return false
    }

    for (const vertex of this.adjacencyList.keys()) {
      if (!visited.has(vertex)) {
        if (dfs(vertex, null)) {
          return true
        }
      }
    }

    return false
  }

  clear(): void {
    this.adjacencyList.clear()
  }
}

export { UndirectedGraph }
