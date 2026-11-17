import type { ProgramSource } from '../../../step-log/lesson-source'

/**
 * A lesson program the dp-table recorder runs, and what it records.
 * React-free and Node-free: presets, the recorder and the truth test share
 * it. The code is premium text: the repo holds its locators and hashes
 * (`source`), never the text, which the recorder and the truth test read
 * from a local content checkout.
 */

export type DpProbe = {
  /** A line of the program as run (1-based): paused before it runs, every time it runs. */
  line: number
  /** The pause's name in the recording. */
  as: string
  /** The watches read at this pause (names in `DpProgram.watch`). */
  read: readonly string[]
}

export type DpProgram = {
  id: string
  lang: 'js' | 'ts'
  runtime: string
  /** The program as run: the answer (by locator and sha256), then the harness (one call, printed). */
  source: ProgramSource
  /** sha256 of the program as run. */
  sha256: string
  /** What the plain program prints, line by line. */
  observed: readonly string[]
  probes: readonly DpProbe[]
  /** Expressions read in the paused frame (side-effect free), by name. */
  watch: Record<string, string>
  /** The names the code gives the table, the item and the index (the stage labels them as written). */
  names: { table: string; item: string; index: string; target: string }
  /** Which lines are not the answer's, in words (provenance). */
  harness?: string
}

export type DpPause = {
  probe: string
  line: number
  vars: { nums?: number[]; m?: number; x?: number; j?: number; f?: boolean[] }
}

export type DpRecording = {
  generator: string
  /** sha256 of the program as run. */
  sha256: string
  /** What the program printed (stdout), unchanged by the pauses. */
  stdout: string[]
  pauses: DpPause[]
}
