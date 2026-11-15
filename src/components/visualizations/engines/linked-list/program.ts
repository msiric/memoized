import type { ProgramSource } from '../../step-log/lesson-source'

/**
 * A lesson program the linked-list visuals draw, and where its pointer
 * states are recorded. React-free and Node-free: presets, the recorder and
 * the truth test share it. The program's code is premium lesson text: the
 * repo holds its locators and hashes (`source`), never the text, which the
 * recorder and the truth test read from a local content checkout.
 */

export type Probe = {
  /** Names the probe in the recording and the preset. */
  id: string
  /** The probe runs right after this line of the program as run (1-based), every time it runs. */
  after: number
  /** The first line of the statements this probe closes (a step may show two lines). */
  from?: number
  /** The pointer variables in scope after `after`, in lane order (a name in its TDZ would throw). */
  vars: readonly string[]
}

export type PointerProgram = {
  id: string
  lang: 'js' | 'ts'
  runtime: string
  /** The program as run: the lesson's blocks (by locator and sha256), then any harness (calls only). */
  source: ProgramSource
  /** sha256 of the program as run. */
  sha256: string
  /** What the plain (uninstrumented) program prints, line by line. */
  observed: readonly string[]
  /** The class whose instances are the list's nodes, and the field drawn as each node's value. */
  nodeClass: string
  valueField: string
  /** The class declaration's last line: node registration is inserted after it. */
  classEnd: number
  /**
   * Which lines are not the lesson's (the test harness that builds the
   * input and prints the result), in words, so the provenance can say so.
   */
  harness?: string
  probes: readonly Probe[]
}

/** One probe hit: the pointer values (node index or null) and every node's `next`. */
export type ProbeHit = {
  probe: string
  vars: Record<string, number | null>
  next: (number | null)[]
}

export type PointerRecording = {
  sha256: string
  /** The program's own output (stdout), unchanged by the probes. */
  observed: string[]
  /** Node values in creation order (the drawing's left-to-right order). */
  labels: string[]
  hits: ProbeHit[]
}
