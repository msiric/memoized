class CyclicGraph<T> {
  private adjacencyList: Map<T, T[]>

  constructor() {
    this.adjacencyList = new Map<T, T[]>()
  }

  addVertex(vertex: T): void {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, [])
    }
  }

  addEdge(vertex1: T, vertex2: T): void {
    if (!this.adjacencyList.has(vertex1)) {
      this.addVertex(vertex1)
    }
    if (!this.adjacencyList.has(vertex2)) {
      this.addVertex(vertex2)
    }
    this.adjacencyList.get(vertex1)!.push(vertex2)
  }

  removeEdge(vertex1: T, vertex2: T): void {
    if (this.adjacencyList.has(vertex1)) {
      this.adjacencyList.set(
        vertex1,
        this.adjacencyList.get(vertex1)!.filter((v) => v !== vertex2),
      )
    }
  }

  removeVertex(vertex: T): void {
    if (this.adjacencyList.has(vertex)) {
      this.adjacencyList.delete(vertex)
      for (const neighbors of this.adjacencyList.values()) {
        const index = neighbors.indexOf(vertex)
        if (index > -1) {
          neighbors.splice(index, 1)
        }
      }
    }
  }

  getVertices(): T[] {
    return Array.from(this.adjacencyList.keys())
  }

  getNeighbors(vertex: T): T[] {
    return this.adjacencyList.get(vertex) || []
  }

  hasEdge(vertex1: T, vertex2: T): boolean {
    return this.adjacencyList.get(vertex1)?.includes(vertex2) ?? false
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
    const recStack = new Set<T>()

    const dfs = (vertex: T): boolean => {
      if (!visited.has(vertex)) {
        visited.add(vertex)
        recStack.add(vertex)

        for (const neighbor of this.getNeighbors(vertex)) {
          if (!visited.has(neighbor) && dfs(neighbor)) {
            return true
          } else if (recStack.has(neighbor)) {
            return true
          }
        }
      }
      recStack.delete(vertex)
      return false
    }

    for (const vertex of this.adjacencyList.keys()) {
      if (dfs(vertex)) {
        return true
      }
    }
    return false
  }

  clear(): void {
    this.adjacencyList.clear()
  }
}

export { CyclicGraph }
