/**
 * The truth check for a frames log (spec P6): the committed recording must
 * equal a fresh Node 24 run of the program, and every step must be exactly
 * what the preset's builder makes of that recording. Node-only.
 */
import { runtimeMatches, sha256 } from '../../../step-log/truth'
import type { StepLog } from '../../../step-log/types'
import { FRAMES_GENERATOR } from '../build'
import type { FState } from '../model'
import type { FramesProgram, FramesRecording } from '../program'
import { recordFrames, runPlain } from './record'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The recording against a fresh run of `code` (the program as run, from the local content checkout). */
export function verifyRecording(p: FramesProgram, committed: FramesRecording, code: string): string[] {
  const errors: string[] = []
  const hash = sha256(code)
  if (hash !== p.sha256) errors.push(`${p.id}: program changed (sha256 ${hash}); re-record`)
  if (committed.sha256 !== p.sha256) errors.push(`${p.id}: the recording is of another program; re-record`)
  const fresh = recordFrames(p, code)
  if (!runtimeMatches(p.runtime, fresh.runtime)) errors.push(`${p.id}: recorded on ${p.runtime} but verifying on ${fresh.runtime}`)
  const plain = runPlain(p, code)
  if (!same(plain, p.observed)) errors.push(`${p.id}: the program prints ${JSON.stringify(plain)}, not ${JSON.stringify(p.observed)}`)
  if (!same(fresh.observed, plain)) errors.push(`${p.id}: the inspector changed the program's output`)
  for (const k of ['observed', 'pauses'] as const)
    if (!same(committed[k], fresh[k]))
      errors.push(`${p.id}: committed ${k} ${JSON.stringify(committed[k]).slice(0, 160)} differs from a real run ${JSON.stringify(fresh[k]).slice(0, 160)}`)
  return errors
}

/** A committed log against its builder's output for a recording: nothing hand-placed survives. */
export function verifyLog(log: StepLog<FState>, rebuilt: StepLog<FState>, program: FramesProgram): string[] {
  const errors: string[] = []
  if (log.source.generator !== FRAMES_GENERATOR) errors.push(`${log.id}: generator ${log.source.generator}`)
  if (log.source.snippet !== undefined || log.source.sha256 !== program.sha256) errors.push(`${log.id}: the log's source is not the program (by hash, never its text)`)
  if (rebuilt.steps.length !== log.steps.length) errors.push(`${log.id}: ${log.steps.length} steps, the recording makes ${rebuilt.steps.length}`)
  rebuilt.steps.forEach((s, i) => {
    const c = log.steps[i]
    if (!c) return
    for (const k of ['state', 'line', 'focus', 'claim', 'observes'] as const)
      if (!same(c[k], s[k])) errors.push(`${log.id} step ${i}: ${k} ${JSON.stringify(c[k]).slice(0, 120)} is not the recorded ${JSON.stringify(s[k]).slice(0, 120)}`)
  })
  if (!same(log.observed, rebuilt.observed)) errors.push(`${log.id}: observed ${JSON.stringify(log.observed)} is not the run's`)
  if (!same(log.code?.lines, rebuilt.code?.lines) || !same(log.code?.premium, rebuilt.code?.premium)) errors.push(`${log.id}: the code differs from the preset's rows`)
  return errors
}
