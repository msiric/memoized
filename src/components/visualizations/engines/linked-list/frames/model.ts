import type { LLState } from '../model'

/**
 * Static frames of the pointer-rewiring visual (R4 shared visual 3, its
 * static presets): snapshots of a recorded run, drawn with the step
 * engine's glyphs. Each panel is one recorded probe hit; the preset adds the
 * heading, which node to mark and the facts the panel states, each derived
 * from the recording.
 */

export type FrameMark = {
  node: number
  /** A short label beside the node ("meet", "entry"). */
  label: string
}

export type RowPanel = {
  kind: 'row'
  id: string
  heading: string
  state: LLState
  /** The arrow this pass changed (the panel's one rest mark, Q9). */
  changed?: number
}

export type RhoPanel = {
  kind: 'rho'
  id: string
  heading: string
  state: LLState
  /** Tail length a, entry index and cycle nodes in order, from the recorded links. */
  rho: { entry: number; cycle: number[]; tail: number[] }
  mark?: FrameMark
  /** The recorded pointer pairs this panel lists under the drawing: "(2,3) (3,5)". */
  pairs: { names: [string, string]; values: string[] }
  /** Distance labels a, b, c with the relation, on the second panel. */
  distances?: { a: number; b: number; c: number; meet: number }
}

export type FramePanel = RowPanel | RhoPanel

export type FramesData = {
  panels: FramePanel[]
  /** One line of text under the panels, derived from the data ("a = c - b: 2 = 4 - 2"). */
  footnote?: string
}
