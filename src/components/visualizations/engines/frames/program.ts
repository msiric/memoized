import type { ProgramSource } from '../../step-log/lesson-source'

/**
 * A program the frames recorder runs (`truth/record.ts`), and what it
 * records. React-free and Node-free: presets, the recorder and the truth
 * test share it. The code is premium text (a practice answer, or a
 * question's visible checks): the repo holds its locators and hashes
 * (`source`), never the text, which the recorder and the truth test read
 * from a local content checkout.
 */

/** An expression, or [expression, function of what it read]. */
export type Watch = string | readonly [expression: string, map: string]

/** Where the run pauses: before a line of the program as run, every time it runs. */
export type Probe = {
  /** A line of the program as run (1-based). */
  line: number
  /**
   * A column on that line (0-based), for a line with several break
   * positions: a `for...of` line pauses once at its head, so a probe on the
   * loop body's call (`fn(value)`) pauses on every value. Default: the
   * line's first break position.
   */
  column?: number
  /** The pause's name in the recording. */
  as: string
  /**
   * Expressions read at this pause (side-effect free). Each is evaluated on
   * the innermost frame of the program first, then outward, and the first
   * frame where it resolves wins (a test's `order` from inside `emit`). A
   * binding in no frame reads as absent. A pair [expression, function] reads
   * the expression with no closure around it (where debug-evaluate resolves
   * private names) and maps what it found with the function.
   */
  watch?: Record<string, Watch>
  /** A probe a run may never reach (the catch of a run where nothing fails); every other probe must pause. */
  optional?: true
}

/**
 * A generator object whose state the recorder reads at every pause (the
 * inspector's `[[GeneratorState]]` and `[[GeneratorLocation]]`, what
 * DevTools shows), found once and then kept: by an expression on the
 * program's top level, or by a variable in another generator's scopes (the
 * source a `take` holds, even before `take` has started).
 */
export type GenHandle = { id: string; expr: string } | { id: string; of: string; name: string }

export type FramesProgram = {
  id: string
  lang: 'js'
  runtime: string
  /** The program as run: content blocks (by locator and sha256), harness lines (calls and controlled timers only). */
  source: ProgramSource
  /** sha256 of the program as run. */
  sha256: string
  /** What the plain program prints, line by line. */
  observed: readonly string[]
  probes: readonly Probe[]
  /** Per function name: expressions read on each of its frames on the stack at every pause (an emit's cursor). */
  frameWatch?: Record<string, Record<string, Watch>>
  gens?: readonly GenHandle[]
  /** Which lines are not the content's, in words (provenance). */
  harness?: string
}

export type GenState = { state: 'suspended' | 'running' | 'closed'; line?: number }

/** A frame of the program on the stack at a pause, innermost first. `fn` is '' at the top level. */
export type StackFrame = { fn: string; line: number; vars?: Record<string, unknown> }

export type Pause = {
  probe: string
  line: number
  vars: Record<string, unknown>
  stack: StackFrame[]
  /** Lines the program had printed when it paused. */
  out: number
  gens?: Record<string, GenState>
}

export type FramesRecording = {
  sha256: string
  /** What the program printed (stdout), unchanged by the pauses. */
  observed: string[]
  pauses: Pause[]
}
