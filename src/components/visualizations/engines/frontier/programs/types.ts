/**
 * A lesson program the frontier recorder runs (`../truth/record.ts`), and
 * what it records. React-free and Node-free: presets import the recordings.
 */

export type Probe = {
  /** A line of `lesson` (1-based), paused before it runs, every time it runs. */
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
   * The code block, byte for byte as the lesson (or the practice answer the
   * register names) has it: `programs.test.ts` compares it with a local
   * content checkout when one is present.
   */
  lesson: string
  /** Where the block is: the content path and the heading or answer it sits under. */
  source: { path: string; at: string }
  /**
   * For a practice answer with no example usage: the call the register's
   * verification names, with its input. Never part of the lesson's code.
   */
  harness?: string
  /** What the reader sees: lines of `lesson`, rewrapped to the code pane's 35 columns (`display.test.ts`). */
  display: readonly { text: string; src: number }[]
  probes: readonly Probe[]
  /** Expressions read in the paused frame (side-effect free), by name. */
  watch: Record<string, string>
}

export type Pause = { probe: string; line: number; vars: Record<string, unknown> }

export type FrontierRecording = {
  generator: string
  /** sha256 of the program as run (lesson plus harness). */
  sha256: string
  /** What the program printed. */
  stdout: string[]
  pauses: Pause[]
}
