/**
 * The stack-trace recorder (context-and-call-stack presets): runs a program
 * in a fresh Node process and records what it printed and the frames each
 * `console.trace()` wrote to stderr, by function name only (no paths, no
 * line numbers): `Timeout.inner`, `listOnTimeout`, `process.processTimers`.
 * V8's `[as _onTimeout]` alias is dropped; an async frame keeps its
 * `async ` prefix, as Node prints it.
 *
 * Node-only: the truth test and `yarn viz:traces` import this.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'

export type TraceRecording = {
  sha256: string
  /** The program's stdout, line by line. */
  stdout: string[]
  /** One entry per `console.trace()`: its header line and its frames, innermost first. */
  traces: { header: string; frames: string[] }[]
}

/** Parses Node's console.trace output (stderr) into headers and frame names. */
export function parseTraces(stderr: string): TraceRecording['traces'] {
  const out: TraceRecording['traces'] = []
  for (const line of stderr.split('\n')) {
    if (/^Trace\b/.test(line)) out.push({ header: line, frames: [] })
    else {
      const m = line.match(/^\s+at (.+?)(?: \[as [^\]]+\])? \(.*\)$/) ?? line.match(/^\s+at (.+?)$/)
      if (m && out.length) out[out.length - 1].frames.push(m[1])
    }
  }
  return out
}

export function recordTraces(program: string): TraceRecording & { runtime: string } {
  const run = spawnSync(process.execPath, ['--input-type=commonjs', '-e', program], {
    encoding: 'utf8',
    timeout: 10_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`exited with ${run.status}: ${run.stderr}`)
  const stdout = run.stdout.split('\n')
  if (stdout[stdout.length - 1] === '') stdout.pop()
  return { sha256: sha256(program), stdout, traces: parseTraces(run.stderr), runtime: `node@${process.versions.node}` }
}
