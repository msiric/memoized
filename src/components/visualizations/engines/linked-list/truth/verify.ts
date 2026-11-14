/**
 * The truth check for a pointer-rewiring log (spec P6): the committed
 * recording must equal a fresh Node 24 run of the program, and every step
 * must be exactly what the builder makes of that recording (state, code
 * line, focus, observed output). Node-only.
 */
import { runtimeMatches, sha256 } from '../../../step-log/truth'
import type { StepLog } from '../../../step-log/types'
import { POINTER_GENERATOR, buildLog, type PresetSpec } from '../build'
import type { LLState } from '../model'
import type { PointerProgram, PointerRecording } from '../program'
import { recordPointers, runPlain } from './record'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The recording against a fresh run: hash, runtime, plain output, probe hits. */
export function verifyRecording(p: PointerProgram, committed: PointerRecording): string[] {
  const errors: string[] = []
  const hash = sha256(p.snippet)
  if (hash !== p.sha256) errors.push(`${p.id}: snippet changed (sha256 ${hash}); re-record`)
  if (committed.sha256 !== p.sha256) errors.push(`${p.id}: the recording is of another snippet; re-record`)
  const fresh = recordPointers(p)
  if (!runtimeMatches(p.runtime, fresh.runtime)) errors.push(`${p.id}: recorded on ${p.runtime} but verifying on ${fresh.runtime}`)
  const plain = runPlain(p)
  if (!same(plain, p.observed)) errors.push(`${p.id}: the program prints ${JSON.stringify(plain)}, not ${JSON.stringify(p.observed)}`)
  if (!same(fresh.observed, plain)) errors.push(`${p.id}: the probes changed the program's output`)
  for (const k of ['observed', 'labels', 'hits'] as const)
    if (!same(committed[k], fresh[k]))
      errors.push(`${p.id}: committed ${k} ${JSON.stringify(committed[k]).slice(0, 160)} differs from a real run ${JSON.stringify(fresh[k]).slice(0, 160)}`)
  return errors
}

/** A committed log against the builder's output for the same recording: nothing hand-placed survives. */
export function verifyLog(log: StepLog<LLState>, spec: PresetSpec): string[] {
  const errors: string[] = []
  if (log.source.generator !== POINTER_GENERATOR) errors.push(`${log.id}: generator ${log.source.generator}`)
  if (log.source.snippet !== spec.program.snippet || log.source.sha256 !== spec.program.sha256)
    errors.push(`${log.id}: the log's source is not the program`)
  const rebuilt = buildLog(spec)
  if (rebuilt.steps.length !== log.steps.length) errors.push(`${log.id}: ${log.steps.length} steps, the recording makes ${rebuilt.steps.length}`)
  rebuilt.steps.forEach((s, i) => {
    const c = log.steps[i]
    if (!c) return
    for (const k of ['state', 'line', 'focus', 'claim', 'observes'] as const)
      if (!same(c[k], s[k])) errors.push(`${log.id} step ${i}: ${k} ${JSON.stringify(c[k]).slice(0, 120)} is not the recorded ${JSON.stringify(s[k]).slice(0, 120)}`)
  })
  if (!same(log.observed, rebuilt.observed)) errors.push(`${log.id}: observed ${JSON.stringify(log.observed)} is not the run's`)
  if (!same(log.code?.lines, rebuilt.code?.lines)) errors.push(`${log.id}: the code differs from the reflowed lesson code`)
  return errors
}
