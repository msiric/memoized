'use client'

import type { Stepper } from './useStepper'
import { viz } from './tokens'

/**
 * The shared controls bar for stepped visualizations: Reset, Back, Step, Play,
 * and a step counter. Identical across every visual so the interaction model is
 * consistent. Driven by a `useStepper` instance.
 */

export function VizControls({ stepper, showPlay = true }: { stepper: Stepper; showPlay?: boolean }) {
  const { index, total, atStart, atEnd, playing, next, back, reset, togglePlay } = stepper
  // Reserve the counter's widest value so it never changes width as the index grows
  // (e.g. "1 / 14" -> "14 / 14"). Otherwise a mid-playthrough widening could push the
  // bar to wrap at borderline widths, jumping the controls height. font-mono => 1ch/char.
  const maxLabel = `${total - 1} / ${total - 1}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={reset} className={viz.button.base}>
        Reset
      </button>
      <button
        type="button"
        onClick={back}
        disabled={atStart}
        aria-label="Previous step"
        className={viz.button.base}
      >
        Back
      </button>
      <button
        type="button"
        onClick={next}
        disabled={atEnd}
        aria-label="Next step"
        className={viz.button.primary}
      >
        Step
      </button>
      {showPlay ? (
        <button
          type="button"
          onClick={togglePlay}
          disabled={atEnd}
          aria-label={playing ? 'Pause' : 'Play'}
          className={viz.button.base}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      ) : null}
      <span className={viz.counter} style={{ minWidth: `${maxLabel.length}ch` }} data-testid="step-counter">
        {index} / {total - 1}
      </span>
    </div>
  )
}
