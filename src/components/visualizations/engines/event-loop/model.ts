import { motion, reveal } from '../../primitives/tokens-v3'
import type { StateIntrospection } from '../../step-log/types'

/**
 * The event-loop notional machine (R14): call stack, host (timers), the
 * microtask queue, the task queue and the console. Chip ids are stable across
 * steps, so a callback that moves between regions keeps its identity.
 */

export type ElChip = { id: string; label: string }

export type EventLoopState = {
  stack: readonly ElChip[]
  host: readonly ElChip[]
  micro: readonly ElChip[]
  tasks: readonly ElChip[]
  console: readonly string[]
  /**
   * The frames the last `console.trace()` printed under its `Trace` output,
   * innermost first, as Node names them (the context-and-call-stack
   * presets). Absent in every other preset.
   */
  trace?: readonly string[]
}

export const REGIONS = ['stack', 'host', 'micro', 'tasks', 'console'] as const

export const outId = (k: number) => `out-${k}`
export const traceId = (k: number) => `trace-${k}`

/** What the run printed so far, as the state shows it: the console, then the trace's frames. */
export const printed = (state: EventLoopState): readonly string[] => [...state.console, ...(state.trace ?? [])]

/** Outputs the finale plays back: every console output, then every trace frame. */
export const revealCount = (state: EventLoopState) => state.console.length + (state.trace?.length ?? 0)

export const eventLoopIntrospection: StateIntrospection<EventLoopState> = {
  ids(state) {
    const ids = new Set<string>(REGIONS)
    for (const lane of [state.stack, state.host, state.micro, state.tasks])
      for (const c of lane) ids.add(c.id)
    state.console.forEach((_, k) => ids.add(outId(k)))
    state.trace?.forEach((_, k) => ids.add(traceId(k)))
    return ids
  },
  observedLog: printed,
  region(state, id) {
    for (const lane of ['stack', 'host', 'micro', 'tasks'] as const)
      if (state[lane].some((c) => c.id === id)) return lane
    return undefined
  },
}

const names = (chips: readonly ElChip[]) =>
  chips.length ? chips.map((c) => c.label).join(', ') : 'empty'

/** The stage's accessible name: a summary of the whole machine (spec §5.3). */
export function describeEventLoop(state: EventLoopState): string {
  return [
    `Call stack: ${names(state.stack)}.`,
    `Host: ${names(state.host)}.`,
    `Microtasks: ${names(state.micro)}.`,
    `Tasks: ${names(state.tasks)}.`,
    `Console: ${state.console.length ? state.console.join(', ') : 'empty'}.`,
    ...(state.trace?.length ? [`Stack trace: ${state.trace.join(', ')}.`] : []),
  ].join(' ')
}

export const EMPTY: EventLoopState = {
  stack: [],
  host: [],
  micro: [],
  tasks: [],
  console: [],
}

/**
 * The event loop's finale (D21, R7): on the last step the console plays its
 * output back, left to right. Output `k` resolves `k * stagger` ms in, over
 * the `enter` token, together with the code line that printed it and the
 * tag naming that line. The recap replaces the caption once the last output
 * has resolved (`settleMs`) and fades in over the `caption` token; the whole
 * reveal ends at `endMs`, inside `reveal.maxMs`. The stagger shrinks for a
 * long console so it always fits.
 */
export function consoleReveal(outputs: number): { staggerMs: number; settleMs: number; endMs: number } {
  const enterMs = motion.enter.full.type === 'tween' ? motion.enter.full.duration * 1000 : 0
  const captionMs = motion.caption.full.type === 'tween' ? motion.caption.full.duration * 1000 : 0
  const steps = Math.max(1, outputs - 1)
  const staggerMs = Math.min(reveal.staggerMs, Math.floor((reveal.maxMs - enterMs - captionMs) / steps))
  const settleMs = Math.max(0, outputs - 1) * staggerMs + (outputs ? enterMs : 0)
  return { staggerMs, settleMs, endMs: settleMs + captionMs }
}

/**
 * A push or pop with frames left under it (the stack packs from its top
 * edge, so every frame under the change moves): fading, the frame that
 * enters or leaves would cross the frame sliding into or out of its place
 * (G1), so the stack lane's change lands in one frame, both ways (D8), as
 * the frontier's stack does. A frame that moves to or from a queue keeps its
 * move.
 */
export function stackClosesUp(prev: EventLoopState | undefined, next: EventLoopState): boolean {
  if (!prev) return false
  const a = prev.stack.map((c) => c.id)
  const b = next.stack.map((c) => c.id)
  const kept = b.filter((id) => a.includes(id))
  const was = eventLoopIntrospection.ids(prev)
  const now = eventLoopIntrospection.ids(next)
  const gone = a.filter((id) => !b.includes(id) && !now.has(id))
  const born = b.filter((id) => !a.includes(id) && !was.has(id))
  // Frames are listed bottom first and drawn top first: a kept frame moves when its index from the top changes.
  const fromTop = (list: string[], id: string) => list.length - 1 - list.indexOf(id)
  return gone.length + born.length > 0 && kept.some((id) => fromTop(a, id) !== fromTop(b, id))
}
