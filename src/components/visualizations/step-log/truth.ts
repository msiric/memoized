/**
 * The runtime half of "truthful by construction" (spec P6, §6.2).
 *
 * Node-only: tests and scripts import this, client code never does.
 *
 * `recordNodeTrace` runs a snippet in a fresh Node process (no inherited
 * NODE_OPTIONS, no test globals) and records what it printed.
 * `verifyStepLogTruth` re-runs a committed log's snippet and fails when the
 * runtime, the snippet hash or the observed output disagree with the log.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import type { StepLog } from './types'

export const NODE_CONSOLE_GENERATOR = 'node-console-trace@1'

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export type NodeTrace = { log: string[]; runtime: string }

export function recordNodeTrace(snippet: string): NodeTrace {
  const run = spawnSync(process.execPath, ['--input-type=commonjs', '-e', snippet], {
    encoding: 'utf8',
    timeout: 10_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`Snippet exited with ${run.status}: ${run.stderr}`)
  const log = run.stdout.split('\n')
  if (log[log.length - 1] === '') log.pop()
  return { log, runtime: `node@${process.versions.node}` }
}

/** `node@24.x` matches any 24.* runtime. */
export function runtimeMatches(declared: string, actual: string): boolean {
  const [dName, dVersion] = declared.split('@')
  const [aName, aVersion] = actual.split('@')
  if (dName !== aName || !dVersion || !aVersion) return false
  const want = dVersion.split('.')
  const have = aVersion.split('.')
  return want.every((part, i) => part === 'x' || part === have[i])
}

export function verifyStepLogTruth<S>(log: StepLog<S>): { errors: string[]; recorded?: NodeTrace } {
  const errors: string[] = []
  const { source } = log
  if (source.generator !== NODE_CONSOLE_GENERATOR) {
    return { errors: [`${log.id}: no verifier for generator "${source.generator}"`] }
  }
  const hash = sha256(source.snippet)
  if (hash !== source.sha256) errors.push(`${log.id}: snippet changed (sha256 ${hash}); re-record the log`)

  const recorded = recordNodeTrace(source.snippet)
  if (!runtimeMatches(source.runtime, recorded.runtime)) {
    errors.push(`${log.id}: recorded on ${source.runtime} but verifying on ${recorded.runtime}`)
  }
  const committed = log.observed.log ?? []
  if (JSON.stringify(committed) !== JSON.stringify(recorded.log)) {
    errors.push(
      `${log.id}: committed log ${JSON.stringify(committed)} differs from a real run ${JSON.stringify(recorded.log)}`,
    )
  }
  return { errors, recorded }
}
