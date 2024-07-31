import { describe, it, expect, beforeEach } from 'vitest'
import { UndirectedGraph } from './UndirectedGraph'

describe('UndirectedGraph', () => {
  let graph: UndirectedGraph<number>

  beforeEach(() => {
    graph = new UndirectedGraph<number>()
  })

  it('should add vertices to the graph', () => {
    graph.addVertex(1)
    graph.addVertex(2)
    expect(graph.getVertices()).toEqual([1, 2])
  })

  it('should add edges to the graph', () => {
    graph.addEdge(1, 2)
    expect(graph.hasEdge(1, 2)).toBe(true)
    expect(graph.hasEdge(2, 1)).toBe(true)
  })

  it('should remove edges from the graph', () => {
    graph.addEdge(1, 2)
    expect(graph.hasEdge(1, 2)).toBe(true)
    graph.removeEdge(1, 2)
    expect(graph.hasEdge(1, 2)).toBe(false)
    expect(graph.hasEdge(2, 1)).toBe(false)
  })

  it('should remove vertices from the graph', () => {
    graph.addEdge(1, 2)
    graph.addEdge(2, 3)
    graph.removeVertex(2)
    expect(graph.getVertices()).toEqual([1, 3])
    expect(graph.hasEdge(1, 2)).toBe(false)
    expect(graph.hasEdge(2, 3)).toBe(false)
  })

  it('should return the correct neighbors for a vertex', () => {
    graph.addEdge(1, 2)
    graph.addEdge(1, 3)
    expect(graph.getNeighbors(1)).toEqual([2, 3])
  })

  it('should perform BFS traversal', () => {
    graph.addEdge(1, 2)
    graph.addEdge(1, 3)
    graph.addEdge(2, 4)
    graph.addEdge(3, 4)
    expect(graph.bfs(1)).toEqual([1, 2, 3, 4])
  })

  it('should perform DFS traversal', () => {
    graph.addEdge(1, 2)
    graph.addEdge(1, 3)
    graph.addEdge(2, 4)
    graph.addEdge(3, 4)
    expect(graph.dfs(1)).toEqual([1, 3, 4, 2])
  })

  it('should detect cycles in the graph', () => {
    graph.addEdge(1, 2)
    graph.addEdge(2, 3)
    graph.addEdge(3, 1)
    expect(graph.hasCycle()).toBe(true)
    graph.removeEdge(3, 1)
    expect(graph.hasCycle()).toBe(false)
  })

  it('should clear the graph', () => {
    graph.addEdge(1, 2)
    graph.addEdge(2, 3)
    graph.clear()
    expect(graph.getVertices()).toEqual([])
  })
})
