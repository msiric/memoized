import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { StructureVisualizer } from './StructureVisualizer'
import { buildInorderTraversalSteps } from './StructureVisualizer.data'

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
})
