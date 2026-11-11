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
    for (const lane of [state.stack, state.host, state.micro, state.tasks]) for (const c of lane) ids.add(c.id)
    state.console.forEach((_, k) => ids.add(outId(k)))
    return ids
  },
  observedLog: (state) => state.console,
}

const names = (chips: readonly ElChip[]) => (chips.length ? chips.map((c) => c.label).join(', ') : 'empty')

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

export const EMPTY: EventLoopState = { stack: [], host: [], micro: [], tasks: [], console: [] }
