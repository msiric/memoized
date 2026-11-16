import type { ProgramSource } from '../../../step-log/lesson-source'

/**
 * A lesson program the annotated-tree recorder runs (`../truth/record.ts`),
 * and what it records. React-free and Node-free: presets import the
 * recordings, never the programs' text (the premium-code policy: the repo
 * holds each block's locator and sha256, the recorder reads the text from a
 * local content checkout).
 */

export type TreeProbe = {
  /** A line of the program as run (1-based). */
  line: number
  /**
   * `line` (default): paused before the line runs, every time it runs.
   * `return`: paused at the line's return position, after its expression is
   * evaluated, with the value the call returns (`returned`).
   */
  at?: 'line' | 'return'
  /** The pause's name in the recording. */
  as: string
  /** The watches read at this pause (names in `TreeProgram.watch`). */
  read: readonly string[]
}

export type TreeProgram = {
  id: string
  lang: 'js' | 'ts'
  /**
   * The program as run: lesson blocks (or the practice answer the register
   * names) by locator and sha256, then the harness (the register's input
   * and calls only, never solution code).
   */
  source: ProgramSource
  probes: readonly TreeProbe[]
  /** Expressions read in the paused frame (side-effect free), by name. */
  watch: Record<string, string>
}

export type TreePause = {
  probe: string
  line: number
  vars: Record<string, unknown>
  /** What the call returned (return probes only). */
  returned?: unknown
}

export type TreeRecording = {
  generator: string
  /** sha256 of the program as run (the lesson blocks plus harness). */
  sha256: string
  /** What the program printed. */
  stdout: string[]
  pauses: TreePause[]
}
