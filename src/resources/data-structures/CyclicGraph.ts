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
}

export { CyclicGraph }
