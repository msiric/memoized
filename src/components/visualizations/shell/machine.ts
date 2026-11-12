/**
 * The StepThrough state machine (spec §4.5, §5.1, §5.2, §5.4). Pure, so every
 * rule (checkpoints, skipping, play stops, restart memory) is unit-tested
 * without a DOM.
 */

export type CheckpointShape = { beforeStep: number; answer: string }
export type PresetShape = { steps: number; checkpoints: readonly CheckpointShape[] }

export type CheckpointStatus = 'open' | 'answered' | 'skipped'
export type DockMode = 'controls' | 'ask' | 'reveal'

export type MachineState = {
  preset: number
  index: number
  playing: boolean
  status: CheckpointStatus[]
  /** The choice picked in this pass, per checkpoint (null if none). */
  picked: (string | null)[]
  /** Answers remembered across Restart for "last time" (session only, spec Q3). Key: `${preset}:${checkpoint}`. */
  memory: Record<string, string>
  /** The checkpoint whose reveal is showing, if any. */
  reveal: number | null
}

export type Action =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'seek'; to: number }
  | { type: 'end' }
  | { type: 'restart' }
  | { type: 'answer'; choice: string }
  | { type: 'skip' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'tick' }
  | { type: 'preset'; preset: number }

export function initialState(presets: readonly PresetShape[], preset = 0): MachineState {
  const n = presets[preset].checkpoints.length
  return {
    preset,
    index: 0,
    playing: false,
    status: Array(n).fill('open'),
    picked: Array(n).fill(null),
    memory: {},
    reveal: null,
  }
}

export function openCheckpointAt(presets: readonly PresetShape[], s: MachineState, index = s.index): number {
  const cps = presets[s.preset].checkpoints
  return cps.findIndex((cp, k) => cp.beforeStep - 1 === index && s.status[k] === 'open')
}

export function dockMode(presets: readonly PresetShape[], s: MachineState): DockMode {
  if (openCheckpointAt(presets, s) !== -1) return 'ask'
  if (s.reveal !== null && presets[s.preset].checkpoints[s.reveal]?.beforeStep === s.index) return 'reveal'
  return 'controls'
}

export function lastIndex(presets: readonly PresetShape[], s: MachineState): number {
  return presets[s.preset].steps - 1
}

/** Jumping over an open checkpoint marks it skipped (spec §5.2 Home/End). */
function jump(presets: readonly PresetShape[], s: MachineState, to: number): MachineState {
  const target = Math.max(0, Math.min(lastIndex(presets, s), to))
  const status = s.status.map((st, k) => {
    const b = presets[s.preset].checkpoints[k].beforeStep
    return st === 'open' && b - 1 >= s.index && b <= target ? 'skipped' : st
  })
  return { ...s, index: target, status, reveal: null, playing: false }
}

export function reduce(presets: readonly PresetShape[], s: MachineState, a: Action): MachineState {
  const last = lastIndex(presets, s)
  const open = openCheckpointAt(presets, s)
  switch (a.type) {
    case 'next':
      if (open !== -1 || s.index >= last) return { ...s, playing: false }
      return { ...s, index: s.index + 1, reveal: null, playing: false }
    case 'back':
      if (s.index === 0) return { ...s, playing: false }
      return { ...s, index: s.index - 1, reveal: null, playing: false }
    case 'seek':
      if (a.to === s.index) return { ...s, playing: false }
      return jump(presets, s, a.to)
    case 'end':
      return jump(presets, s, last)
    case 'restart': {
      const memory = { ...s.memory }
      s.picked.forEach((p, k) => {
        if (p) memory[`${s.preset}:${k}`] = p
      })
      const n = s.status.length
      return {
        ...s,
        index: 0,
        playing: false,
        reveal: null,
        status: Array(n).fill('open'),
        picked: Array(n).fill(null),
        memory,
      }
    }
    case 'answer': {
      if (open === -1) return s
      const cp = presets[s.preset].checkpoints[open]
      const status = s.status.slice()
      const picked = s.picked.slice()
      status[open] = 'answered'
      picked[open] = a.choice
      return {
        ...s,
        status,
        picked,
        memory: { ...s.memory, [`${s.preset}:${open}`]: a.choice },
        index: cp.beforeStep,
        reveal: open,
        playing: false,
      }
    }
    case 'skip': {
      if (open === -1) return s
      const status = s.status.slice()
      status[open] = 'skipped'
      return { ...s, status, index: presets[s.preset].checkpoints[open].beforeStep, reveal: open, playing: false }
    }
    case 'play':
      // D10: Play advances at once, then follows the cadence (`tick`).
      if (s.index >= last || open !== -1) return { ...s, playing: false }
      return reduce(presets, { ...s, playing: true }, { type: 'tick' })
    case 'pause':
      return s.playing ? { ...s, playing: false } : s
    case 'toggle':
      return reduce(presets, s, { type: s.playing ? 'pause' : 'play' })
    case 'tick': {
      if (!s.playing) return s
      if (open !== -1 || s.index >= last) return { ...s, playing: false }
      const next = { ...s, index: s.index + 1, reveal: null }
      const stop = next.index >= last || openCheckpointAt(presets, next) !== -1
      return stop ? { ...next, playing: false } : next
    }
    case 'preset': {
      if (a.preset === s.preset) return s
      return { ...initialState(presets, a.preset), memory: s.memory }
    }
  }
}
