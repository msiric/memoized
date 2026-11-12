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
}

export const REGIONS = ['stack', 'host', 'micro', 'tasks', 'console'] as const

export const outId = (k: number) => `out-${k}`

export const eventLoopIntrospection: StateIntrospection<EventLoopState> = {
  ids(state) {
    const ids = new Set<string>(REGIONS)
    for (const lane of [state.stack, state.host, state.micro, state.tasks])
      for (const c of lane) ids.add(c.id)
    state.console.forEach((_, k) => ids.add(outId(k)))
    return ids
  },
  observedLog: (state) => state.console,
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
 * The event loop's reveal (D21): on the last step the console plays its
 * output back, left to right. Output `k` resolves `k * stagger` ms in, over
 * the `enter` token; the stagger shrinks for a long console so the last
 * output and the caption after it still land inside `reveal.maxMs`.
 */
export function consoleReveal(outputs: number): { staggerMs: number; settleMs: number } {
  const enterMs = motion.enter.full.type === 'tween' ? motion.enter.full.duration * 1000 : 0
  const captionMs = motion.caption.full.type === 'tween' ? motion.caption.full.duration * 1000 : 0
  const steps = Math.max(1, outputs - 1)
  const staggerMs = Math.min(reveal.staggerMs, Math.floor((reveal.maxMs - enterMs - captionMs) / steps))
  // The caption starts as the last output starts to resolve.
  return { staggerMs, settleMs: Math.max(0, outputs - 1) * staggerMs }
}
