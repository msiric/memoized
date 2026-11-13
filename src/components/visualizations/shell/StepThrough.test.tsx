import { act, cleanup, configure, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import EventLoopViz from '../engines/event-loop'
import { basicOrdering } from '../engines/event-loop/presets/basic-ordering'
import { RECAP_NONE, allRecaps, recapText } from './feedback'

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

/** Answers the Start prediction (R7) with key `pick` (1 to 4), or skips it. */
function start(key: (k: string) => void, pick: '1' | '2' | '3' | '4' | 'skip' = '2') {
  if (pick === 'skip')
    act(() => {
      fireEvent.click(screen.getByTestId('viz-skip'))
    })
  else key(pick)
}

describe('StepThrough (event-loop specimen)', () => {
  it('loads paused at Start with nothing announced, asking for a prediction (R7)', () => {
    const { frame, slider } = setup()
    expect(frame.dataset.vizStep).toBe('0')
    expect(frame.dataset.vizMode).toBe('ask')
    expect(slider).toHaveAttribute('aria-valuetext', 'Start')
    expect(screen.getByTestId('viz-prompt')).toHaveTextContent('Which logs last?')
    expect(screen.getByTestId('viz-live')).toHaveTextContent('')
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
  })

  it('locks the Start prediction in without a verdict, and the run continues from Start (R5, R7)', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    key('4') // D
    expect(frame.dataset.vizStep).toBe('0')
    expect(frame.dataset.vizMode).toBe('reveal')
    expect(screen.getByTestId('viz-feedback')).toHaveTextContent('Locked in: D. Watch the console.')
    // No mark gives the answer away: the numbers stay, only the pick is selected.
    expect(document.querySelector('[data-choice="d"]')).toHaveAttribute('aria-checked', 'true')
    for (const id of ['a', 'b', 'c', 'd'])
      expect(document.querySelector(`[data-choice="${id}"] [data-choice-slot]`)).toHaveAttribute('data-choice-slot', 'key')
    expect(document.activeElement).toBe(slider)
    expect(screen.getByRole('button', { name: 'Next' })).not.toHaveAttribute('aria-disabled')
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('1')
    expect(frame.dataset.vizMode).toBe('controls')
  })

  it('skipping the Start prediction stays on Start with its caption', () => {
    const { frame, key } = setup()
    start(key, 'skip')
    expect(frame.dataset.vizStep).toBe('0')
    expect(frame.dataset.vizMode).toBe('controls')
    expect(screen.getByTestId('viz-caption')).toHaveTextContent(/^The script runs to the end as one task/)
  })

  it('steps with the arrow keys and narrates each step once in a polite status', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    start(key)
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('1')
    expect(slider).toHaveAttribute('aria-valuetext', 'Step 1 of 8')
    const live = screen.getByTestId('viz-live')
    expect(live).toHaveAttribute('role', 'status')
    settle()
    expect(live).toHaveTextContent('Step 1 of 8. The script starts on the call stack and logs A.')
    // R3: the step's name, sentence case, with the counter beside it.
    expect(screen.getByTestId('viz-event')).toHaveTextContent('Run the script')
    expect(screen.getByTestId('viz-counter')).toHaveTextContent('1 of 8')
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
    start(key)
    for (let i = 0; i < 5; i++) key('ArrowRight')
    expect(frame.dataset.vizMode).toBe('ask')
    expect(document.activeElement).toBe(slider)
    settle()
    expect(screen.getByTestId('viz-live')).toHaveTextContent('Checkpoint: What logs after D?')
    key('ArrowRight')
    const group = screen.getByRole('radiogroup', { name: 'What logs after D?' })
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
    start(key)
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

  it('puts the controls bar before the dock in the DOM, so Tab from the stepper reaches the question (R1M-16)', () => {
    const { container } = setup()
    const bar = container.querySelector('[data-viz-region="bar"]')!
    const dock = container.querySelector('[data-viz-region="dock"]')!
    expect(bar.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Drawn the other way round.
    expect(dock.className).toMatch(/\border-1\b/)
    expect(bar.className).toMatch(/\border-2\b/)
  })

  it('switches presets instantly back to Start', () => {
    const { frame, slider, key } = setup()
    slider.focus()
    start(key)
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
    start(key)
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
    start(key)
    const live = screen.getByTestId('viz-live')
    for (let i = 0; i < 4; i++) key('ArrowRight')
    settle()
    expect(live).toHaveTextContent(/^Step 4 of 8\./)
  })

  it('keeps the control row in shape at a checkpoint: Next waits as the outline variant, Play is unavailable; Skip is in the dock (D9, R4)', () => {
    const { frame, slider, key, container } = setup()
    slider.focus()
    const bar = container.querySelector('[data-viz-region="bar"]')!
    const names = () => [...bar.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    start(key)
    const before = names()
    for (let i = 0; i < 5; i++) key('ArrowRight')
    expect(frame.dataset.vizMode).toBe('ask')
    expect(names()).toEqual(before)
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(next.className).not.toMatch(/\b(invisible|hidden|opacity-50)\b/)
    expect(next.className).toContain('ring-white/10')
    expect(next.className).not.toContain('bg-lime-500')
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('aria-disabled', 'true')
    const dock = container.querySelector('[data-viz-region="dock"]')!
    const skip = within(dock as HTMLElement).getByRole('button', { name: 'Skip, show me' })
    expect(skip).toBeVisible()
    expect(skip).toHaveTextContent('Skip')
    expect(skip.className).toContain('text-zinc-400')
    // Number slots become the marks after the answer.
    key('1')
    expect(document.querySelector('[data-choice="b"] [data-choice-slot]')).toHaveTextContent('×')
    expect(document.querySelector('[data-choice="c"] [data-choice-slot]')).toHaveTextContent('✓')
  })

  it('reserves the dock with a ghost of every caption and checkpoint of the preset on screen (D15, R2)', () => {
    const { container } = setup()
    const ghosts = container.querySelector('[data-viz-part="dock-ghosts"]')!
    expect(ghosts).toHaveAttribute('aria-hidden', 'true')
    expect(ghosts.className).toMatch(/\binvisible\b/)
    expect(ghosts.textContent).toContain('The promise is already fulfilled')
    // Per preset: Drain's captions are not reserved while Basics is on screen.
    expect(ghosts.textContent).not.toContain('queueMicrotask adds to the queue')
    expect(ghosts.querySelectorAll('[data-viz-part], [data-choice], [role="radio"], [id]')).toHaveLength(0)
  })

  it('ends on Replay in the same slot with a recap of the predictions (D21)', () => {
    const { frame, slider, key, container } = setup()
    slider.focus()
    const bar = container.querySelector('[data-viz-region="bar"]')!
    const names = () => [...bar.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    start(key, '2') // B logs last: right
    for (let i = 0; i < 5; i++) key('ArrowRight')
    key('2') // C, the answer
    key('ArrowRight')
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('8')
    const replay = screen.getByRole('button', { name: 'Replay' })
    expect(replay).not.toHaveAttribute('aria-disabled')
    expect(replay).toHaveAttribute('aria-keyshortcuts', 'Home')
    expect(names()).toEqual(['Restart', 'Back', 'Replay', 'Play'])
    expect(screen.getByTestId('viz-recap')).toHaveTextContent('B logs last, as you said. C ran next, as you predicted.')
    expect(screen.getByTestId('viz-caption')).toHaveTextContent(/predicted\. The order is always sync code first/)
    settle()
    expect(screen.getByTestId('viz-live')).toHaveTextContent('B logs last, as you said.')
    // A press that lands on Replay right after the step does not start over.
    act(() => {
      fireEvent.click(replay)
    })
    expect(frame.dataset.vizStep).toBe('8')
    const now = performance.now()
    const spy = vi.spyOn(performance, 'now').mockReturnValue(now + 2_000)
    act(() => {
      fireEvent.click(replay)
    })
    spy.mockRestore()
    expect(frame.dataset.vizStep).toBe('0')
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
    // The answer is kept: the Start question marks it as last time.
    expect(frame.dataset.vizMode).toBe('ask')
    expect(document.querySelector('[data-choice="b"]')).toHaveTextContent('last time')
  })

  it('recaps wrong predictions with what happened, and skipped ones neutrally', () => {
    const { slider, key } = setup()
    slider.focus()
    start(key, '4') // D: wrong
    for (let i = 0; i < 5; i++) key('ArrowRight')
    key('1') // B: wrong
    key('ArrowRight')
    key('ArrowRight')
    expect(screen.getByTestId('viz-recap')).toHaveTextContent('You said D logs last; it was B. You predicted B next; it was C.')
    key('Home')
    key('End')
    expect(screen.getByTestId('viz-recap')).toHaveTextContent(RECAP_NONE)
  })

  it('reserves every recap in the dock ghosts', () => {
    const { container } = setup()
    const ghosts = container.querySelector('[data-viz-part="dock-ghosts"]')!
    for (const r of allRecaps(basicOrdering.checkpoints)) expect(ghosts.textContent).toContain(r)
  })

  it('holds the previous name and caption until the playback lands, then the recap; Replay waits (R5, R1M-11, R1M-12)', () => {
    let t = 10_000
    const spy = vi.spyOn(performance, 'now').mockImplementation(() => (t += 1_000))
    const { frame, slider, key } = setup()
    slider.focus()
    start(key, '2')
    for (let i = 0; i < 5; i++) key('ArrowRight')
    key('2')
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('7')
    key('ArrowRight')
    expect(frame.dataset.vizStep).toBe('8')
    // The reveal plays: the previous step's words stay, Next waits.
    expect(screen.getByTestId('viz-event')).toHaveTextContent('Run the next task')
    expect(screen.getByTestId('viz-caption')).toHaveTextContent(/^Only with no microtasks left/)
    expect(screen.queryByTestId('viz-recap')).toBeNull()
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    act(() => {
      fireEvent.click(next)
    })
    expect(frame.dataset.vizStep).toBe('8')
    // The playback has landed: the recap replaces the caption, Replay arrives.
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('viz-event')).toHaveTextContent('Done')
    expect(screen.getByTestId('viz-recap')).toHaveTextContent('B logs last, as you said.')
    const replay = screen.getByRole('button', { name: 'Replay' })
    expect(replay).toHaveAttribute('aria-disabled', 'true')
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(replay).not.toHaveAttribute('aria-disabled')
    spy.mockRestore()
  })
})

describe('recapText (D21)', () => {
  const cps = basicOrdering.checkpoints
  it('names each prediction and how it went', () => {
    expect(recapText(cps, ['b', 'c'])).toBe('B logs last, as you said. C ran next, as you predicted.')
    expect(recapText(cps, [null, 'b'])).toBe('You predicted B next; it was C.')
    expect(recapText(cps, ['a', null])).toBe('You said A logs last; it was B.')
    expect(recapText(cps, [null, null])).toBeNull()
  })
})
