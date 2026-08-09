import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SequenceStepper } from './SequenceStepper'
import { buildEventLoopSteps } from './SequenceStepper.data'

afterEach(cleanup)

describe('SequenceStepper', () => {
  it('builds an event-loop step-log ending in the verified console order', () => {
    const { frames } = buildEventLoopSteps()
    expect(frames.length).toBeGreaterThan(10)
    expect(frames[frames.length - 1].console).toEqual(['Start', 'End', 'Promise', 'setTimeout'])
  })

  it('renders every lane and the code panel', () => {
    const { frames, code } = buildEventLoopSteps()
    render(<SequenceStepper frames={frames} code={code} />)
    expect(screen.getByTestId('lanes')).toBeInTheDocument()
    expect(screen.getByTestId('code-panel')).toBeInTheDocument()
    expect(screen.getByTestId('console')).toBeInTheDocument()
    expect(screen.getByText('Call stack')).toBeInTheDocument()
    expect(screen.getByText('Microtask queue')).toBeInTheDocument()
    expect(screen.getByText('Macrotask queue')).toBeInTheDocument()
  })

  it('reaches the verified console order by stepping to the end', () => {
    const { frames, code } = buildEventLoopSteps()
    render(<SequenceStepper frames={frames} code={code} />)
    const next = screen.getByLabelText('Next step')
    for (let i = 0; i < frames.length - 1; i++) fireEvent.click(next)
    expect(screen.getByTestId('step-counter').textContent).toBe(`${frames.length - 1} / ${frames.length - 1}`)
    // The console log shows Start, End, Promise, setTimeout in that order.
    const consoleText = screen.getByTestId('console').textContent ?? ''
    expect(consoleText).toContain('Start')
    expect(consoleText).toContain('End')
    expect(consoleText.indexOf('Promise')).toBeLessThan(consoleText.indexOf('setTimeout'))
  })

  it('keeps every "empty" label a stable, always-mounted absolute overlay across all steps', () => {
    const { frames, code } = buildEventLoopSteps()
    render(<SequenceStepper frames={frames} code={code} />)
    const next = screen.getByLabelText('Next step')
    const labels = () => screen.getAllByText('empty')
    // The four lanes (stack, web APIs, micro, macro) each render an always-mounted
    // "empty" overlay whose visibility is toggled by opacity — never conditionally
    // unmounted. So the count is invariant and every label stays absolutely
    // positioned at frame 0 and after every single step (no reflow, no stale
    // in-flow className regression).
    const assertStableOverlays = () => {
      const els = labels()
      expect(els).toHaveLength(4)
      for (const el of els) {
        expect(el.className).toContain('absolute')
        expect(el.className).toContain('left-0')
        expect(el.className).not.toMatch(/(^|\s)static(\s|$)/)
      }
    }
    assertStableOverlays()
    for (let i = 0; i < frames.length - 1; i++) {
      fireEvent.click(next)
      assertStableOverlays()
    }
  })

  it('scopes keyboard control to the focused frame, not the control buttons', () => {
    const { frames, code } = buildEventLoopSteps()
    render(<SequenceStepper frames={frames} code={code} />)
    const frame = screen.getByRole('group', { name: 'Event loop step-through' })

    // Space on a focused control button must NOT toggle play — the button owns its
    // own activation. If the container hijacked it, Play would flip to Pause here.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Reset' }), { key: ' ' })
    expect(screen.getByLabelText('Play')).toBeInTheDocument()

    // Space on the frame itself does drive the stepper.
    fireEvent.keyDown(frame, { key: ' ' })
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()

    // Arrow keys on the frame step it.
    fireEvent.keyDown(frame, { key: 'ArrowRight' })
    expect(screen.getByTestId('step-counter').textContent).toBe(`1 / ${frames.length - 1}`)
  })
})
