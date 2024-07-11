import { describe, it, expect, beforeEach } from 'vitest'
import { CyclicGraph } from './CyclicGraph'

describe('CyclicGraph', () => {
  let graph: CyclicGraph<string>

  beforeEach(() => {
    graph = new CyclicGraph<string>()
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
    expect(graph.getNeighbors('B')).toEqual([])
  })

  it('should remove edges', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.removeEdge('A', 'B')
    expect(graph.getNeighbors('A')).toEqual(['C'])
  })

  it('should remove vertices', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('A', 'C')
    graph.removeVertex('A')
    expect(graph.getVertices()).toEqual(['B', 'C'])
    expect(graph.getNeighbors('B')).toEqual([])
    expect(graph.getNeighbors('C')).toEqual([])
  })

  it('should detect cycle in a graph', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('B', 'C')
    graph.addEdge('C', 'A')
    expect(graph.hasCycle()).toBe(true)
  })

  it('should not detect cycle in a graph', () => {
    graph.addEdge('A', 'B')
    graph.addEdge('B', 'C')
    expect(graph.hasCycle()).toBe(false)
  })
})
