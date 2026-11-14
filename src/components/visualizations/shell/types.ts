import type { ComponentType, ReactNode } from 'react'
import type { StateIntrospection, Step, StepLog } from '../step-log/types'
import type { MotionGate } from './motion'

/**
 * Layout variants. `narrow` below 768 px (code above the stage),
 * `wide` from 768 px (code beside the stage). "768" is shorthand: the frame
 * picks the variant by its own width in rem (`vz-wide` from 37.875rem, its
 * content at a 768 px viewport and the default text size, D19). Heights are fixed per variant
 * and never depend on the exact width, so the footprint is known before any
 * JavaScript runs (spec §3.3, §3.4).
 */
export type Variant = 'narrow' | 'wide'
export const VARIANTS: readonly Variant[] = ['narrow', 'wide']
export type PerVariant<T> = Record<Variant, T>

export type EngineLayout = {
  /** Stage height in px, the maximum over every step of the logs it was computed for. */
  stage: PerVariant<number>
  /** Visible code rows. */
  codeRows: PerVariant<number>
  /** Widest code line over every preset, so the code column never changes width. */
  codeCols?: number
  /** Code pane height, if the engine stretches it beyond its rows. */
  codeHeight?: PerVariant<number>
  /** Engine-specific geometry (region heights), computed over every preset. */
  detail?: unknown
}

export type StageProps<S> = {
  log: StepLog<S>
  index: number
  step: Step<S>
  /** The step the learner came from (for `new` tags and moves), if any. */
  previous?: Step<S>
  /** The code pane, sized by the shell; the engine places it in its grid. */
  codePane: ReactNode
  layout: EngineLayout
  motion: MotionGate
  /** Accessible name for the machine region (`role="img"`), from `Engine.describe`. */
  label: string
  /** Unique per frame, for scoping shared-layout ids. */
  instanceId: string
}

/** The React-free half of an engine: safe for the server, tests and the manifest. */
export type EngineCore<S> = {
  id: string
  /** The stage's accessible name for a state (`role="img"`). */
  describe: (state: S) => string
  /**
   * Stage geometry. Heights are sized to `logs` (the shell passes one
   * preset's log: per-preset footprints, R2, R7); `all` (every preset of the
   * visual) fixes what must not change when the reader switches presets,
   * such as column widths. Without `all`, `logs` is used for both.
   */
  layout: (logs: readonly StepLog<S>[], all?: readonly StepLog<S>[]) => EngineLayout
  introspect: StateIntrospection<S>
  /**
   * The engine's reveal (D21), if it has one: ms from the reveal render until
   * its playback has landed, when the shell swaps the caption for the recap
   * (R5: the previous caption stays until then). The reveal ends once the
   * recap has faded in; Replay ignores presses until then (R7). Without it
   * the caption lands as on any step.
   */
  revealMs?: (state: S) => number
  /**
   * The code lines this step relights, in run order, with each line's delay
   * into the reveal (R7: the event loop's finale relights the lines that
   * printed, in the order they ran). The shell's code pane draws them as
   * traced lines; the delays apply only while the reveal plays.
   */
  codeTrace?: (log: StepLog<S>, index: number) => CodeTrace | null
}

export type CodeTrace = { lines: readonly number[]; delaysMs: readonly number[] }

export type Engine<S> = EngineCore<S> & {
  Stage: ComponentType<StageProps<S>>
}

export type Preset<S> = {
  id: string
  /** Shown in the preset switcher. At most 18 characters. */
  label: string
  log: StepLog<S>
}

/** A step-through visual without its renderer: what the registry and manifest see. */
export type StepThroughDescriptor<S> = {
  id: string
  form: 'step'
  /** Frame title. At most 40 characters, so it fits on one line at 288 px. */
  title: string
  engine: EngineCore<S>
  presets: readonly Preset<S>[]
  defaultPreset: string
  /** First release that ships this visual (manifest `since`). */
  since: string
}

export type StepThroughDefinition<S> = Omit<StepThroughDescriptor<S>, 'engine'> & { engine: Engine<S> }

/** Props every lazily loaded visual component accepts. */
export type VizComponentProps = { preset?: string; interactive?: boolean }
