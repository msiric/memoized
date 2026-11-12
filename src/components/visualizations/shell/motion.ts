import type { Transition } from 'framer-motion'
import { motion, motionRules, type MotionTokenName } from '../primitives/tokens-v3'

/**
 * The motion gate (spec §4, VIZ-H D7, D8). Engines never pick durations: they
 * ask the gate for a token, and the gate answers with the full, reduced or
 * instant value.
 *
 * - `reduce`: the reader prefers reduced motion (right-hand column of §4).
 * - `instant`: this render must land in one frame: a burst of commands, a
 *   scrub, Home, End, Restart, a preset switch, or the static first render.
 *   Instant covers enter, exit, move and path alike: nothing from the
 *   previous state may still be visible or moving in the next frame (D7).
 * - `direction`: 1 for Next, Play, an answer or Skip; -1 for Back. Back is
 *   the exact mirror of Next (D8): what entered from a side leaves toward it.
 * - `allow`: the stage glyphs that may animate on this render (the per-step
 *   budget, `motionBudget`); every other change lands instantly. `null`
 *   allows every glyph (explorables that budget their own reveal).
 */
export type MotionGate = {
  reduce: boolean
  instant: boolean
  /**
   * Increments on every instant render. Engines add it to glyph keys, so an
   * interrupted glyph remounts at its end state in the same frame (§4 rule 3).
   */
  epoch: number
  /** Defaults to 1 (forward). */
  direction?: 1 | -1
  /** Defaults to `null` (every glyph may animate). */
  allow?: ReadonlySet<string> | null
  /**
   * This render is the visual's one designed reveal (D21): a forward,
   * non-instant arrival at the step that pays the visual off. The engine may
   * play its reveal sequence on this render only; it is the single
   * exception to `allow`. Never set on load, on Back or on an instant render.
   */
  reveal?: boolean
}

export const STATIC_GATE: MotionGate = {
  reduce: true,
  instant: true,
  epoch: 0,
  direction: 1,
  allow: null,
}

export function transitionFor(kind: MotionTokenName, gate: Pick<MotionGate, 'instant' | 'reduce'>): Transition {
  if (gate.instant) return { duration: 0 }
  const t = gate.reduce ? motion[kind].reduced : motion[kind].full
  if (t.type === 'spring')
    return {
      type: 'spring',
      stiffness: t.stiffness,
      damping: t.damping,
      mass: t.mass,
    }
  if (t.duration === 0) return { duration: 0 }
  return {
    type: 'tween',
    duration: t.duration,
    ease: t.ease ? [...t.ease] : 'linear',
  }
}

/** Translate distance (px) for enter/exit; zero under reduced or instant motion. */
export function travel(kind: 'enter' | 'exit', gate: Pick<MotionGate, 'instant' | 'reduce'>): number {
  if (gate.instant || gate.reduce) return 0
  const t = motion[kind].full
  return t.type === 'tween' ? (t.distance ?? 0) : 0
}

/** Whether the glyph `id` may animate on this render (D7 budget, instant renders). */
export function animates(gate: MotionGate, id: string): boolean {
  return !gate.instant && (!gate.allow || gate.allow.has(id))
}

/**
 * The per-step motion budget (spec §4 rule 1, S-1, M06). The rule, exactly:
 *
 * - It counts **stage glyphs** only: elements on the stage that carry an id
 *   (chips, stack frames, console lines). Chrome (caption, code line, step
 *   bar, scrubber) follows the `caption` and `highlight` tokens and is exempt.
 * - A glyph animates when it enters, exits, or changes place. Per step at
 *   most `motionRules.maxAnimatedPerStep` (2) glyphs animate.
 * - Priority: the step's `focus` (the authored change, in order: the glyph
 *   that moves, then the line it prints), then other arrivals, then
 *   departures. Anything past the budget, and any glyph that only shifts
 *   inside its region, lands instantly.
 * - Back uses the focus of the step it undoes, so it plays the same glyphs
 *   mirrored (D8).
 */
export function motionBudget(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  focus: readonly string[],
  max: number = motionRules.maxAnimatedPerStep,
): ReadonlySet<string> {
  const ranked: string[] = []
  const add = (id: string) => {
    if (!ranked.includes(id)) ranked.push(id)
  }
  // The authored change: a focused glyph that arrives, leaves or stays (moves).
  for (const id of focus) if (before.has(id) || after.has(id)) add(id)
  for (const id of after) if (!before.has(id)) add(id)
  for (const id of before) if (!after.has(id)) add(id)
  return new Set(ranked.slice(0, max))
}

export type Vector = { x?: number; y?: number }

/** A signed offset along one axis, without negative zero. */
const along = (unit: number | undefined, distance: number) => (unit ?? 0) * distance || 0

/** What AnimatePresence hands to exiting children: the live gate and the ids still on stage. */
export type PresenceCustom = { gate: MotionGate; present?: ReadonlySet<string> }

/**
 * Enter and exit props for one stage glyph (an `m.*` element inside an
 * `AnimatePresence` whose `custom` is `{ gate, present }`).
 *
 * Forward, a glyph enters from `from` and exits toward `to`. Back mirrors it:
 * it enters from `to` and exits toward `from` (D8). The exit is resolved from
 * the presence `custom`, which carries the *current* gate, so an instant
 * render (scrub, Home, preset) snaps glyphs that are leaving too (M01). A
 * glyph still present elsewhere (it moved) leaves its old place at once.
 */
export function presence(
  id: string,
  gate: MotionGate,
  vectors: { from: Vector; to: Vector },
  opts: { moved?: boolean } = {},
) {
  const live = animates(gate, id)
  const dIn = live ? travel('enter', gate) : 0
  const enterFrom = gate.direction === -1 ? vectors.to : vectors.from
  return {
    initial:
      opts.moved || !live
        ? (false as const)
        : {
            opacity: 0,
            x: along(enterFrom.x, dIn),
            y: along(enterFrom.y, dIn),
          },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: live ? transitionFor('enter', gate) : { duration: 0 },
    },
    exit: 'leave',
    custom: { gate } as PresenceCustom,
    variants: {
      leave: (c: PresenceCustom | undefined) => {
        const g = c?.gate ?? gate
        if (c?.present?.has(id) || !animates(g, id)) return { opacity: 0, transition: { duration: 0 } }
        const dOut = travel('exit', g)
        const toward = g.direction === -1 ? vectors.from : vectors.to
        return {
          opacity: 0,
          x: along(toward.x, dOut),
          y: along(toward.y, dOut),
          transition: transitionFor('exit', g),
        }
      },
    },
  }
}
