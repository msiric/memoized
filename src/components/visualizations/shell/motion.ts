import type { Transition } from 'framer-motion'
import { motion, motionRules, type MotionTokenName, type StepBeats } from '../primitives/tokens-v3'

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
  /**
   * Glyphs leaving the place a moving glyph arrives at on this render: they
   * fade in place on the `vacate` token instead of vanishing, outside the
   * budget (R1M-13). Computed by `vacating`.
   */
  vacate?: ReadonlySet<string>
  /**
   * When each beat of this step starts, in ms (H3 R2 Q1): the code line,
   * the moving glyph, then the console line and the caption. Back mirrors
   * them. All zero on instant renders and under reduced motion.
   */
  beats?: StepBeats
}

/** The delay (s) of a stage glyph's beat on this render (Q1). */
export function beatDelay(gate: Pick<MotionGate, 'beats'>, beat: 'glyph' | 'land' | 'line'): number {
  return (gate.beats?.[beat] ?? 0) / 1000
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
export function travel(kind: 'enter' | 'exit' | 'land', gate: Pick<MotionGate, 'instant' | 'reduce'>): number {
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

/**
 * The vacate rule (R1M-13, H0 S-1): a glyph that leaves a region a moving
 * glyph (one of `allow`) is entering on this step fades briefly in place
 * instead of vanishing under the arrival. At most one per region.
 */
export function vacating(
  before: ReadonlySet<string>,
  after: ReadonlySet<string>,
  allow: ReadonlySet<string>,
  regionBefore: (id: string) => string | undefined,
  regionAfter: (id: string) => string | undefined,
): ReadonlySet<string> {
  const entered = new Set<string>()
  for (const id of allow) {
    const from = regionBefore(id)
    const to = regionAfter(id)
    if (from && to && from !== to) entered.add(to)
  }
  const out = new Set<string>()
  for (const id of before) {
    if (after.has(id) || allow.has(id)) continue
    const r = regionBefore(id)
    if (r && entered.has(r)) {
      out.add(id)
      entered.delete(r)
    }
  }
  return out
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
  opts: { moved?: boolean; beat?: 'glyph' | 'land' } = {},
) {
  const live = animates(gate, id)
  // Q1: a chip moves on the glyph beat; a console line lands on the third
  // beat with the `land` token (Back plays the beats in reverse).
  const beat = opts.beat ?? 'glyph'
  const token: MotionTokenName = beat === 'land' ? 'land' : 'enter'
  const outToken: MotionTokenName = beat === 'land' ? 'land' : 'exit'
  const dIn = live ? travel(token, gate) : 0
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
      transition: live ? { ...transitionFor(token, gate), delay: beatDelay(gate, beat) } : { duration: 0 },
    },
    exit: 'leave',
    custom: { gate } as PresenceCustom,
    variants: {
      leave: (c: PresenceCustom | undefined) => {
        const g = c?.gate ?? gate
        if (!g.instant && !c?.present?.has(id) && g.vacate?.has(id))
          return { opacity: 0, transition: { ...transitionFor('vacate', g), delay: beatDelay(g, 'glyph') } }
        if (c?.present?.has(id) || !animates(g, id)) return { opacity: 0, transition: { duration: 0 } }
        const dOut = travel(outToken, g)
        const toward = g.direction === -1 ? vectors.from : vectors.to
        return {
          opacity: 0,
          x: along(toward.x, dOut),
          y: along(toward.y, dOut),
          transition: { ...transitionFor(outToken, g), delay: beatDelay(g, beat) },
        }
      },
    },
  }
}
