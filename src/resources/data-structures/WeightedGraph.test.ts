import { describe, it, expect, beforeEach } from 'vitest'
import { WeightedGraph } from './WeightedGraph'

describe('WeightedGraph', () => {
  let graph: WeightedGraph<number>

  beforeEach(() => {
    graph = new WeightedGraph<number>()
  })

  it('should add vertices to the graph', () => {
    graph.addVertex(1)
    graph.addVertex(2)
    expect(graph.getVertices()).toEqual([1, 2])
  })

  it('should add edges to the graph', () => {
    graph.addEdge(1, 2, 5)
    expect(graph.getEdgeWeight(1, 2)).toBe(5)
    expect(graph.getEdgeWeight(2, 1)).toBe(5)
  })

  it('should remove edges from the graph', () => {
    graph.addEdge(1, 2, 5)
    expect(graph.getEdgeWeight(1, 2)).toBe(5)
    graph.removeEdge(1, 2)
    expect(graph.getEdgeWeight(1, 2)).toBeUndefined()
  })

  it('should remove vertices from the graph', () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(2, 3, 10)
    graph.removeVertex(2)
    expect(graph.getVertices()).toEqual([1, 3])
    expect(graph.getEdgeWeight(1, 2)).toBeUndefined()
    expect(graph.getEdgeWeight(2, 3)).toBeUndefined()
  })

  it('should return the correct neighbors for a vertex', () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(1, 3, 10)
    expect(graph.getNeighbors(1)).toEqual([
      [2, 5],
      [3, 10],
    ])
  })

  it('should perform BFS traversal', () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(1, 3, 10)
    graph.addEdge(2, 4, 1)
    graph.addEdge(3, 4, 2)
    expect(graph.bfs(1)).toEqual([1, 2, 3, 4])
  })

  it('should perform DFS traversal', () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(1, 3, 10)
    graph.addEdge(2, 4, 1)
    graph.addEdge(3, 4, 2)
    expect(graph.dfs(1)).toEqual([1, 3, 4, 2])
  })

  it("should find the shortest path using Dijkstra's algorithm", () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(1, 3, 10)
    graph.addEdge(2, 4, 1)
    graph.addEdge(3, 4, 2)
    const result = graph.dijkstra(1, 4)
    expect(result).toEqual({ distance: 6, path: [1, 2, 4] })
  })

  it('should clear the graph', () => {
    graph.addEdge(1, 2, 5)
    graph.addEdge(2, 3, 10)
    graph.clear()
    expect(graph.getVertices()).toEqual([])
  })
})
