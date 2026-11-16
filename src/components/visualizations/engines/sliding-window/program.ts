import type { ProgramSource } from '../../step-log/lesson-source'

/**
 * A lesson program the sliding-window recorder runs (`truth/record.ts`),
 * and what it records. React-free and Node-free: presets, the recorder and
 * the truth test share it. The code is lesson text: the repo holds its
 * locators and hashes (`source`), never the text, which the recorder and the
 * truth test read from a local content checkout.
 */

/** Where the run pauses: before a line of the program as run, every time it runs. */
export type Probe = {
  /** A line of the program as run (1-based). */
  line: number
  /** The pause's name in the recording. */
  as: string
}

/**
 * The names the program gives the window's parts, so one recorder and one
 * stage serve the lesson's count map (`windowStart`, `charFrequency`) and the
 * practice answer's Set (`i`, `ss`).
 */
export type WindowNames = {
  /** The left edge's variable. */
  left: string
  /** The right edge's variable. */
  right: string
  /** What the window keeps: a count map (keys with counts) or a Set (members). */
  store: string
  storeKind: 'map' | 'set'
  /** The best length so far. */
  best: string
}

export type WindowProgram = {
  id: string
  lang: 'js' | 'ts'
  runtime: string
  /** The program as run: lesson blocks (by locator and sha256), then the harness (calls only). */
  source: ProgramSource
  /** sha256 of the program as run. */
  sha256: string
  /** What the plain program prints, line by line. */
  observed: readonly string[]
  names: WindowNames
  probes: readonly Probe[]
  /**
   * Expressions read at every pause (side-effect free): the string `s`, the
   * limit `k` (the count map's most distinct keys), `left`, `right`, `best`
   * and `store` (as `[key, count]` pairs for a map, members for a Set). A
   * binding not in scope reads as absent.
   */
  watch: { s: string; k?: string; left: string; right: string; best: string; store: string }
  /** Which lines are not the lesson's, in words (provenance). */
  harness?: string
}

export type Pause = {
  probe: string
  line: number
  vars: { s?: string; k?: number; left?: number; right?: number; best?: number; store?: (string | [string, number])[] }
}

export type WindowRecording = {
  sha256: string
  /** What the program printed (stdout), unchanged by the pauses. */
  observed: string[]
  pauses: Pause[]
}
