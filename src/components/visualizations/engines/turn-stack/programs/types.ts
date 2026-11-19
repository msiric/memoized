import type { ProgramSource } from '../../../step-log/lesson-source'

/**
 * A lesson program the turn-stack recorder runs, and what it records.
 * React-free and Node-free: presets, the recorder and the truth test share
 * it. The code is premium text: the repo holds its locators and hashes
 * (`source`), never the text, which the recorder and the truth test read
 * from a local content checkout.
 */

export type HullProbe = {
  /** A line of the program as run (1-based): paused before it runs, every time it runs. */
  line: number
  /** The pause's name in the recording. */
  as: 'sorted' | 'lower-pop' | 'lower-push' | 'upper-pop' | 'upper-push' | 'trim' | 'join'
  /** The watches read at this pause (names in `HullProgram.watch`). */
  read: readonly string[]
}

export type HullProgram = {
  id: string
  lang: 'js' | 'ts'
  runtime: string
  /** The program as run: the answer (by locator and sha256), then the harness (one call, printed). */
  source: ProgramSource
  /** sha256 of the program as run. */
  sha256: string
  /** What the plain program prints, line by line. */
  observed: readonly string[]
  probes: readonly HullProbe[]
  /** Expressions read in the paused frame (side-effect free), by name. */
  watch: Record<string, string>
  /** The turn test as the program compares it: `<` keeps collinear points, `<=` drops them. */
  op: '<' | '<='
  /** Which lines are not the answer's, in words (provenance). */
  harness?: string
}

export type Pt = readonly [number, number]

export type HullPause = {
  probe: HullProbe['as']
  line: number
  vars: { trees?: Pt[]; lower?: Pt[]; upper?: Pt[]; p?: Pt; cl?: number | null; cu?: number | null }
}

export type HullRecording = {
  generator: string
  /** sha256 of the program as run. */
  sha256: string
  /** What the program printed (stdout), unchanged by the pauses. */
  stdout: string[]
  pauses: HullPause[]
}
