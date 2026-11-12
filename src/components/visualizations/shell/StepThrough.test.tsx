import { act, cleanup, configure, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
// Narration waits for input to settle (one burst window), so tests drive the clock.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(300)
  })

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
    settle()
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
    settle()
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

  it('Space plays (advancing at once, D10) and Escape pauses without resetting (D13)', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    key('ArrowRight')
    key(' ')
    expect(frame.dataset.vizStep).toBe('2')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    key('Escape')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    expect(frame.dataset.vizStep).toBe('2')
    // Esc with nothing playing does nothing at all.
    key('Escape')
    expect(frame.dataset.vizStep).toBe('2')
  })

  it('announces a burst once, for the step the reader settles on (M21)', () => {
    const { slider, key } = setup()
    slider.focus()
    const live = screen.getByTestId('viz-live')
    for (let i = 0; i < 4; i++) key('ArrowRight')
    expect(live).toHaveTextContent('')
    settle()
    expect(live).toHaveTextContent(/^Step 4 of 8\./)
  })

  it('keeps the control row in shape at a checkpoint: Next and Play stay, unavailable; Skip is in the dock (D9)', () => {
    const { frame, slider, key, container } = setup()
    slider.focus()
    const bar = container.querySelector('[data-viz-region="bar"]')!
    const names = () => [...bar.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    const before = names()
    for (let i = 0; i < 5; i++) key('ArrowRight')
    expect(frame.dataset.vizMode).toBe('ask')
    expect(names()).toEqual(before)
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(next.className).not.toMatch(/\b(invisible|hidden)\b/)
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-disabled', 'true')
    const dock = container.querySelector('[data-viz-region="dock"]')!
    expect(within(dock as HTMLElement).getByRole('button', { name: 'Skip, show me' })).toBeVisible()
    // Number slots become the marks after the answer.
    key('1')
    expect(document.querySelector('[data-choice="b"] [data-choice-slot]')).toHaveTextContent('×')
    expect(document.querySelector('[data-choice="c"] [data-choice-slot]')).toHaveTextContent('✓')
  })

  it('reserves the dock with a ghost of every caption and checkpoint of every preset (D15)', () => {
    const { container } = setup()
    const ghosts = container.querySelector('[data-viz-part="dock-ghosts"]')!
    expect(ghosts).toHaveAttribute('aria-hidden', 'true')
    expect(ghosts.className).toMatch(/\binvisible\b/)
    // Every caption of both presets is in the stack; ghosts carry no ids, roles or parts.
    expect(ghosts.textContent).toContain('The promise is already fulfilled')
    expect(ghosts.querySelectorAll('[data-viz-part], [data-choice], [role="radio"], [id]')).toHaveLength(0)
  })
})
