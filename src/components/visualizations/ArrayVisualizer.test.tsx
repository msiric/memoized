import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ArrayVisualizer, buildSlidingWindowSteps } from './ArrayVisualizer'

afterEach(cleanup)

describe('ArrayVisualizer', () => {
  it('generates a correct sliding-window step-log from data alone', () => {
    const steps = buildSlidingWindowSteps([2, 1, 5, 1, 3, 2], 3)
    expect(steps[0].sum).toBe(8) // first window 2 + 1 + 5
    expect(steps[steps.length - 1].max).toBe(9) // best window [5, 1, 3]
    expect(steps[steps.length - 1].win).toBe(true)
  })

  it('renders every array element with auto-layout', () => {
    render(<ArrayVisualizer data={[2, 1, 5, 1, 3, 2]} windowSize={3} />)
    const cells = screen.getAllByTestId('cell')
    expect(cells).toHaveLength(6)
    expect(cells.map((c) => c.textContent)).toEqual(['2', '1', '5', '1', '3', '2'])
    expect(screen.getByTestId('sum').textContent).toContain('8')
  })

  it('steps through the window and reaches the correct max', () => {
    render(<ArrayVisualizer data={[2, 1, 5, 1, 3, 2]} windowSize={3} />)
    const next = screen.getByLabelText('Next step')
    for (let i = 0; i < 4; i++) fireEvent.click(next)
    expect(screen.getByTestId('max').textContent).toContain('9')
    expect(screen.getByTestId('narration').textContent).toContain('9')
  })

  it('handles an invalid window size without crashing', () => {
    render(<ArrayVisualizer data={[1, 2]} windowSize={5} />)
    expect(screen.getByTestId('narration').textContent).toContain('Window size')
  })
})
