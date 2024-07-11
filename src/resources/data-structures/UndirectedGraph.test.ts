import { describe, it, expect, beforeEach } from 'vitest'
import { UndirectedGraph } from './UndirectedGraph'

describe('UndirectedGraph', () => {
  let graph: UndirectedGraph<string>

  beforeEach(() => {
    graph = new UndirectedGraph<string>()
  })

  it('should add vertices', () => {
    graph.addVertex('A')
    graph.addVertex('B')
    expect(graph.getVertices()).toEqual(['A', 'B'])
  })

  it('should add edges', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    expect(graph.getNeighbors('A')).toEqual(['B', 'C'])
    expect(graph.getNeighbors('B')).toEqual(['A'])
    expect(graph.getNeighbors('C')).toEqual(['A'])
  })

  it('should remove edges', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.removeEdge('A', 'B')
    expect(graph.getNeighbors('A')).toEqual(['C'])
    expect(graph.getNeighbors('B')).toEqual([])
  })

  it('should remove vertices', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.removeVertex('A')
    expect(graph.getVertices()).toEqual(['B', 'C'])
    expect(graph.getNeighbors('B')).toEqual([])
    expect(graph.getNeighbors('C')).toEqual([])
  })

  it('should check for edges', () => {
    graph.addEdge('A', 'B')
    expect(graph.hasEdge('A', 'B')).toBe(true)
    expect(graph.hasEdge('A', 'C')).toBe(false)
  })

  it('should perform BFS traversal', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.addEdge('B', 'D')
    graph.addEdge('C', 'E')
    expect(graph.bfs('A')).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('should perform DFS traversal', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.addEdge('B', 'D')
    graph.addEdge('C', 'E')
    expect(graph.dfs('A')).toEqual(['A', 'C', 'E', 'B', 'D'])
  })
})
