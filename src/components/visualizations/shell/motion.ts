import type { Transition } from 'framer-motion'
import { motion, type MotionTokenName } from '../primitives/tokens-v2'

/**
 * The motion gate (spec §4). Engines never pick durations: they ask the gate
 * for a token, and the gate answers with the full, reduced or instant value.
 *
 * - `reduce`: the reader prefers reduced motion (right-hand column of §4).
 * - `instant`: this render must land in one frame: an interrupt mid-transition,
 *   a burst of commands, a scrub, a preset switch, or the static first render.
 *   Values already in flight snap too: glyphs are keyed by `epoch`.
 */
export type MotionGate = {
  reduce: boolean
  instant: boolean
  /**
   * Increments on every instant render. Engines add it to glyph keys, so an
   * interrupted glyph remounts at its end state in the same frame (§4 rule 3).
   */
  epoch: number
}

export const STATIC_GATE: MotionGate = { reduce: true, instant: true, epoch: 0 }

export function transitionFor(kind: MotionTokenName, gate: MotionGate): Transition {
  if (gate.instant) return { duration: 0 }
  const t = gate.reduce ? motion[kind].reduced : motion[kind].full
  if (t.type === 'spring') return { type: 'spring', stiffness: t.stiffness, damping: t.damping, mass: t.mass }
  if (t.duration === 0) return { duration: 0 }
  return { type: 'tween', duration: t.duration, ease: t.ease ? [...t.ease] : 'linear' }
}

/** Translate distance (px) for enter/exit; zero under reduced or instant motion. */
export function travel(kind: 'enter' | 'exit', gate: MotionGate): number {
  if (gate.instant || gate.reduce) return 0
  const t = motion[kind].full
  return t.type === 'tween' ? (t.distance ?? 0) : 0
}
