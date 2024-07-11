import { describe, it, expect, beforeEach } from 'vitest'
import { WeightedGraph } from './WeightedGraph'

describe('WeightedGraph', () => {
  let graph: WeightedGraph<string>

  beforeEach(() => {
    graph = new WeightedGraph<string>()
  })

  it('should add vertices', () => {
    graph.addVertex('A')
    graph.addVertex('B')
    expect(graph.getVertices()).toEqual(['A', 'B'])
  })

  it('should add edges with weights', () => {
    graph.addEdge('A', 'B', 5)
    graph.addEdge('A', 'C', 10)
    expect(graph.getNeighbors('A')).toEqual([
      ['B', 5],
      ['C', 10],
    ])
    expect(graph.getNeighbors('B')).toEqual([['A', 5]])
    expect(graph.getNeighbors('C')).toEqual([['A', 10]])
  })

  it('should remove edges', () => {
    graph.addEdge('A', 'B', 5)
    graph.addEdge('A', 'C', 10)
    graph.removeEdge('A', 'B')
    expect(graph.getNeighbors('A')).toEqual([['C', 10]])
    expect(graph.getNeighbors('B')).toEqual([])
  })

  it('should remove vertices', () => {
    graph.addEdge('A', 'B', 5)
    graph.addEdge('A', 'C', 10)
    graph.removeVertex('A')
    expect(graph.getVertices()).toEqual(['B', 'C'])
    expect(graph.getNeighbors('B')).toEqual([])
    expect(graph.getNeighbors('C')).toEqual([])
  })

  it('should get edge weight', () => {
    graph.addEdge('A', 'B', 5)
    graph.addEdge('A', 'C', 10)
    expect(graph.getEdgeWeight('A', 'B')).toBe(5)
    expect(graph.getEdgeWeight('A', 'C')).toBe(10)
    expect(graph.getEdgeWeight('B', 'C')).toBeUndefined()
  })
})
