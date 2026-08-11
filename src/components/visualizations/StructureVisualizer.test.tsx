import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StructureVisualizer } from './StructureVisualizer'
import { buildInorderTraversalSteps, buildPrototypeChainSteps } from './StructureVisualizer.data'

afterEach(cleanup)

describe('StructureVisualizer', () => {
  it('builds an in-order traversal that visits nodes in sorted order', () => {
    const { tree, frames } = buildInorderTraversalSteps()
    expect(tree.id).toBe('8')
    // intro + 7 nodes + outro
    expect(frames).toHaveLength(9)
    const order = frames.filter((f) => f.active !== null).map((f) => f.active)
    expect(order).toEqual(['1', '3', '6', '8', '9', '10', '14'])
    const last = frames[frames.length - 1]
    expect(last.active).toBeNull()
    expect(last.visited).toEqual(['1', '3', '6', '8', '9', '10', '14'])
  })

  it('renders every node of the tree', () => {
    const { tree, frames } = buildInorderTraversalSteps()
    render(<StructureVisualizer tree={tree} frames={frames} label="BST in-order" />)
    const svg = screen.getByTestId('structure-svg')
    expect(screen.getAllByTestId('node')).toHaveLength(7)
    const labels = [...svg.querySelectorAll('text')].map((t) => t.textContent).sort()
    expect(labels).toEqual(['1', '10', '14', '3', '6', '8', '9'])
  })

  it('marks every node visited once it has stepped to the end', () => {
    const { tree, frames } = buildInorderTraversalSteps()
    render(<StructureVisualizer tree={tree} frames={frames} label="BST in-order" />)
    const next = screen.getByLabelText('Next step')
    for (let i = 0; i < frames.length - 1; i++) fireEvent.click(next)
    expect(screen.getByTestId('step-counter').textContent).toBe(`${frames.length - 1} / ${frames.length - 1}`)
    // The final frame has nothing active, so every node label is in the visited colour.
    const texts = [...screen.getByTestId('structure-svg').querySelectorAll('text')]
    for (const text of texts) {
      expect(text.getAttribute('class')).toContain('fill-lime')
    }
  })

  it('builds a prototype chain that ends at null and resolves own before inherited', () => {
    const { tree, frames } = buildPrototypeChainSteps()
    // A chain is a degenerate tree: every node has exactly one child until null.
    const ids: string[] = []
    for (let node: typeof tree | undefined = tree; node; node = node.children?.[0]) ids.push(node.id)
    expect(ids).toEqual(['john', 'person', 'objproto', 'null'])
    // The first lookup resolves on john itself (own property, nothing walked yet).
    expect(frames[1].active).toBe('john')
    expect(frames[1].visited).toEqual([])
    // The failed lookup walks the whole chain and stops at null.
    const last = frames.filter((f) => f.active !== null).pop()
    expect(last?.active).toBe('null')
  })

  it('renders box nodes with a rect instead of a circle', () => {
    const { tree, frames } = buildPrototypeChainSteps()
    render(<StructureVisualizer tree={tree} frames={frames} nodeShape="box" label="Prototype chain" />)
    const svg = screen.getByTestId('structure-svg')
    expect(svg.querySelectorAll('rect')).toHaveLength(4)
    expect(svg.querySelectorAll('circle')).toHaveLength(0)
    // Long labels render in full rather than being clipped to a circle.
    const labels = [...svg.querySelectorAll('text')].map((t) => t.textContent)
    expect(labels).toContain('Object.prototype')
  })

  it('still renders circles by default, so existing tree visuals are unchanged', () => {
    const { tree, frames } = buildInorderTraversalSteps()
    render(<StructureVisualizer tree={tree} frames={frames} label="BST in-order" />)
    const svg = screen.getByTestId('structure-svg')
    expect(svg.querySelectorAll('circle')).toHaveLength(7)
    expect(svg.querySelectorAll('rect')).toHaveLength(0)
  })

  it('draws edges between node boundaries so they never show through a node', () => {
    const { tree, frames } = buildPrototypeChainSteps()
    render(<StructureVisualizer tree={tree} frames={frames} nodeShape="box" label="Prototype chain" />)
    const lines = [...screen.getByTestId('structure-svg').querySelectorAll('line')]
    expect(lines).toHaveLength(3)
    // Some node states are semi-transparent, so a centre-to-centre edge would be visible
    // through the node. Every edge must start below its parent and end above its child.
    for (const line of lines) {
      const y1 = Number(line.getAttribute('y1'))
      const y2 = Number(line.getAttribute('y2'))
      expect(y2).toBeGreaterThan(y1)
      // The visible span is strictly the gap between levels, never the full 58px pitch.
      expect(y2 - y1).toBeLessThan(58)
    }
  })
})
