/**
 * The turn-stack recorder (spec P6, "truthful by construction"): runs the
 * program (read from a local content checkout: the repo never holds its
 * text) in a fresh Node 24 process under the inspector, pauses before each
 * probed line and reads the chains, the arriving point and the turn value
 * from the paused frame, plus what the program printed. Nothing is inserted
 * into the program: the probes are breakpoints and the values are read with
 * `Debugger.evaluateOnCallFrame`. It is the annotated-tree recorder
 * (`../../annotated-tree/truth/record.ts`) under this engine's generator
 * name, as the dp table's is.
 *
 * Node-only: the truth test and `yarn viz:hull` import this, the browser never does.
 */
import { recordTree } from '../../annotated-tree/truth/record'
import { runPlain } from '../../dp-table/truth/record'
import type { HullPause, HullProgram, HullRecording } from '../programs/types'
import { HULL_GENERATOR } from './generator'

export { HULL_GENERATOR, runPlain }

/** Runs the program under the inspector and returns its recording (`code`: the program as run, from the checkout). */
export function recordHull(p: HullProgram, code: string): HullRecording & { runtime: string } {
  const { runtime, sha256, stdout, pauses } = recordTree(p, code)
  return {
    generator: HULL_GENERATOR,
    sha256,
    stdout,
    pauses: pauses.map((x) => ({
      probe: x.probe as HullPause['probe'],
      line: x.line,
      vars: x.vars as HullPause['vars'],
    })),
    runtime,
  }
}
