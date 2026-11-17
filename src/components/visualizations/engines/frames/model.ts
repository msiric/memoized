import type { ChipKind } from '../../substrates/Lane'
import type { StateIntrospection } from '../../step-log/types'

/**
 * The frames notional machine (wave 3C): code that runs in pieces over time,
 * drawn as one lane per frame or slot that outlives a single call. A
 * generator's frame stays suspended at a `yield` between `next()` calls; a
 * mapLimit worker holds one in-flight operation at a time; each nested
 * `emit` holds its own snapshot of the registrations. Each lane is labelled
 * with its name; its first chip says what it is doing now (running, paused
 * at a line, waiting, done) and the rest are the values that frame holds
 * (locals, a claimed index, a snapshot's records). Readouts over the lanes name shared
 * state (a cursor, counters), a lane may be a shared store (the results
 * array, the registration Set, the order log), and the console shows what
 * the program printed.
 *
 * Nothing here is computed from code: every state is built from a pause of
 * a recorded run (`presets/*`), and the truth test re-records it.
 */

export type FChip = { id: string; label: string }

export type FLane = {
  id: string
  /** The lane's name (`g`, `worker 0`, `emit 1`); what it is doing is its first chip (`statusId`). */
  label: string
  /** The lane's hue on its chips' edges (`Lane`): frames neutral, operations sky, stores violet. */
  kind: ChipKind
  chips: readonly FChip[]
}

/** A readout over the lanes: `next 2`, `pulled 1`. */
export type FVar = { id: string; name: string; value: string }

export type FState = {
  vars: readonly FVar[]
  lanes: readonly FLane[]
  /** What the program has printed (the observed trace). */
  output: readonly string[]
}

export const OUTPUT_ID = 'output'
/** A lane's status chip: running, paused at a line, waiting, done. */
export const statusId = (lane: string) => `status-${lane}`
export const varId = (name: string) => `var-${name}`

export const framesIntrospection: StateIntrospection<FState> = {
  ids(state) {
    const ids = new Set<string>([OUTPUT_ID])
    for (const v of state.vars) ids.add(v.id)
    for (const l of state.lanes) for (const c of l.chips) ids.add(c.id)
    return ids
  },
  observedLog: (state) => state.output,
  region(state, id) {
    for (const l of state.lanes) if (l.chips.some((c) => c.id === id)) return l.id
    return undefined
  },
}

/** The stage's accessible name: every readout, every lane with what it holds, the output (spec §5.3). */
export function describeFrames(state: FState): string {
  const vars = state.vars.map((v) => `${v.name} ${v.value}`).join(', ')
  const lanes = state.lanes
    .map((l) => `${l.label}${l.chips.length ? `, holding ${l.chips.map((c) => c.label.trimEnd()).join(', ')}` : ''}.`)
    .join(' ')
  const out = state.output.length ? ` Printed: ${state.output.join(' | ')}.` : ''
  return `${vars ? `${vars}. ` : ''}${lanes}${out}`
}
