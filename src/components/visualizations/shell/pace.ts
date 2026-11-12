import { motionRules } from '../primitives/tokens-v3'

/**
 * Input pacing shared by every visual (D13): one burst window and one Esc
 * behavior. StepThrough uses it; explorables adopt it so a burst of commands
 * and the Esc key mean the same thing everywhere.
 *
 * - A command that arrives within `BURST_WINDOW_MS` (250 ms) of the previous
 *   one renders instantly: the frame jumps to the settled state of the last
 *   command instead of queueing transitions.
 * - Esc pauses playback and never resets, never leaves a prediction and
 *   never moves focus. When nothing plays it does nothing (the event goes on
 *   to the page).
 */

export const BURST_WINDOW_MS = motionRules.burstWindowMs

export function isBurst(previousAt: number, now: number): boolean {
  return now - previousAt < BURST_WINDOW_MS
}

/** The motion decision for one command, with an epoch that counts instant renders. */
export type Pace = { at: number; instant: boolean; epoch: number }

export const INITIAL_PACE: Pace = { at: -Infinity, instant: true, epoch: 0 }

export function pace(prev: Pace, now: number, force = false): Pace {
  const instant = force || isBurst(prev.at, now)
  return { at: now, instant, epoch: instant ? prev.epoch + 1 : prev.epoch }
}

/** D13 Esc: pause if playing, otherwise let the key through. Returns true when it handled the key. */
export function escapePauses(
  e: { key: string; preventDefault: () => void },
  playing: boolean,
  pause: () => void,
): boolean {
  if (e.key !== 'Escape' || !playing) return false
  e.preventDefault()
  pause()
  return true
}
