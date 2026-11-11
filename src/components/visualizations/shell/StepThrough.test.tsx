import { act, cleanup, configure, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import EventLoopViz from '../engines/event-loop'

beforeAll(() => {
  // jsdom has no matchMedia (framer-motion's reduced-motion probe).
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }) as unknown as MediaQueryList
})

configure({ testIdAttribute: 'data-viz-part' })
afterEach(cleanup)

function setup() {
  const utils = render(<EventLoopViz />)
  const frame = utils.container.querySelector('section')!
  const slider = screen.getByRole('slider')
  const key = (k: string, target: Element = document.activeElement ?? slider) =>
    act(() => {
      fireEvent.keyDown(target, { key: k })
    })
  return { ...utils, frame, slider, key }
}

describe('StepThrough (event-loop specimen)', () => {
  it('loads paused at Start with nothing announced', () => {
    const { frame, slider } = setup()
    expect(frame.dataset.vizStep).toBe('0')
    expect(slider).toHaveAttribute('aria-valuetext', 'Start')
    expect(screen.getByTestId('viz-live')).toHaveTextContent('')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('steps with the arrow keys and narrates each step once in a polite status', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('1')
    expect(slider).toHaveAttribute('aria-valuetext', 'Step 1 of 8')
    const live = screen.getByTestId('viz-live')
    expect(live).toHaveAttribute('role', 'status')
    expect(live).toHaveTextContent('Step 1 of 8. The script starts on the call stack and logs A.')
    key('ArrowLeft')
    expect(frame.dataset.vizStep).toBe('0')
    key('End')
    expect(frame.dataset.vizStep).toBe('8')
    key('Home')
    expect(frame.dataset.vizStep).toBe('0')
  })

  it('asks before the reveal, moves focus to the choices on →, and returns it after answering', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    for (let i = 0; i < 5; i++) key('ArrowRight')
    expect(frame.dataset.vizMode).toBe('ask')
    expect(document.activeElement).toBe(slider)
    expect(screen.getByTestId('viz-live')).toHaveTextContent('Checkpoint: D has logged. What logs next?')
    key('ArrowRight')
    const group = screen.getByRole('radiogroup', { name: 'D has logged. What logs next?' })
    expect(document.activeElement).toBe(within(group).getAllByRole('radio')[0])
    key('2')
    expect(frame.dataset.vizMode).toBe('reveal')
    expect(frame.dataset.vizStep).toBe('6')
    expect(screen.getByTestId('viz-feedback')).toHaveTextContent('Right.')
    expect(document.activeElement).toBe(slider)
    key('ArrowRight')
    expect(frame.dataset.vizMode).toBe('controls')
    expect(frame.dataset.vizStep).toBe('7')
  })

  it('explains a wrong pick and labels the answer', () => {
    const { slider, key } = setup()
    slider.focus()
    for (let i = 0; i < 5; i++) key('ArrowRight')
    key('1')
    expect(screen.getByTestId('viz-feedback')).toHaveTextContent('Not quite.')
    const picked = document.querySelector('[data-choice="b"]')!
    expect(picked).toHaveAttribute('aria-checked', 'true')
    expect(picked).toHaveTextContent('×')
    expect(document.querySelector('[data-choice="c"]')).toHaveTextContent('answer')
  })

  it('never uses the disabled attribute and keeps buttons out of the tab order', () => {
    const { container } = setup()
    for (const b of container.querySelectorAll('[data-viz-region="bar"] button')) {
      expect(b).not.toHaveAttribute('disabled')
      expect(b).toHaveAttribute('tabindex', '-1')
    }
    expect(screen.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
  })

  it('switches presets instantly back to Start', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    key('ArrowRight')
    act(() => {
      fireEvent.click(screen.getByRole('radio', { name: 'Drain' }))
    })
    expect(frame.dataset.vizPreset).toBe('microtask-queued-during-drain')
    expect(frame.dataset.vizStep).toBe('0')
  })

  it('Space toggles play and Escape pauses without resetting', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    key('ArrowRight')
    key(' ')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    key('Escape')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(frame.dataset.vizStep).toBe('1')
  })
})
