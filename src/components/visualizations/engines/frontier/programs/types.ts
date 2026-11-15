import type { DisplayRow, ProgramSource } from '../../../step-log/lesson-source'

/**
 * A lesson program the frontier recorder runs (`../truth/record.ts`), and
 * what it records. React-free and Node-free: presets import the recordings.
 */

export type Probe = {
  /** A line of the program as run (1-based), paused before it runs, every time it runs. */
  line: number
  /** The pause's name in the recording. */
  as: string
  /** The watches read at this pause (names in `FrontierProgram.watch`). */
  read: readonly string[]
}

export type FrontierProgram = {
  id: string
  lang: 'js' | 'ts'
  /**
   * The program as run: the lesson's code block (or the practice answer the
   * register names), by locator and sha256, then any harness (the
   * register's input, a call only). The text is never committed: the
   * recorder and the truth test read it from a local content checkout
   * (`step-log/lesson-block.ts`).
   */
  source: ProgramSource
  /**
   * What the reader sees, rewrapped to the code pane's 35 columns: a lesson
   * example's rows as text, a practice answer's as `wrap` (resolved from the
   * content when a page is built). `src` is a line of the program as run.
   */
  display: readonly DisplayRow[]
  probes: readonly Probe[]
  /** Expressions read in the paused frame (side-effect free), by name. */
  watch: Record<string, string>
}

export type Pause = { probe: string; line: number; vars: Record<string, unknown> }

export type FrontierRecording = {
  generator: string
  /** sha256 of the program as run (the lesson block plus harness). */
  sha256: string
  /** What the program printed. */
  stdout: string[]
  pauses: Pause[]
}
