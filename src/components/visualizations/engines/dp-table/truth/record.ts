/**
 * The dp-table recorder (spec P6, "truthful by construction"): runs the
 * program (read from a local content checkout: the repo never holds its
 * text) in a fresh Node 24 process under the inspector, pauses before each
 * probed line and reads the table, the item and the index from the paused
 * frame, plus what the program printed. Nothing is inserted into the
 * program: the probes are breakpoints and the values are read with
 * `Debugger.evaluateOnCallFrame`. It is the annotated-tree recorder
 * (`../../annotated-tree/truth/record.ts`), which serves any program of line
 * probes and watches, under this engine's generator name.
 *
 * Node-only: the truth test and `yarn viz:dp` import this, the browser never does.
 */
import { spawnSync } from 'node:child_process'
import { recordTree } from '../../annotated-tree/truth/record'
import type { DpPause, DpProgram, DpRecording } from '../programs/types'

import { DP_GENERATOR } from './generator'

export { DP_GENERATOR }

/** Runs the program under the inspector and returns its recording (`code`: the program as run, from the checkout). */
export function recordDp(p: DpProgram, code: string): DpRecording & { runtime: string } {
  const { runtime, sha256, stdout, pauses } = recordTree(p, code)
  return {
    generator: DP_GENERATOR,
    sha256,
    stdout,
    pauses: pauses.map((x) => ({
      probe: x.probe,
      line: x.line,
      vars: x.vars as DpPause['vars'],
    })),
    runtime,
  }
}

/** What the plain program prints: its code, untouched, in a fresh process (no inspector). */
export function runPlain(p: Pick<DpProgram, 'id' | 'lang'>, code: string): string[] {
  const run = spawnSync(process.execPath, ['--no-warnings', `--input-type=commonjs${p.lang === 'ts' ? '-typescript' : ''}`, '-e', code], {
    encoding: 'utf8',
    timeout: 20_000,
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`${p.id} exited with ${run.status}: ${run.stderr}`)
  const l = run.stdout.split('\n')
  if (l[l.length - 1] === '') l.pop()
  return l
}
