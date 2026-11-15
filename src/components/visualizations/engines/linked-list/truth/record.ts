/**
 * The pointer recorder (spec P6, "truthful by construction"): runs a lesson
 * program (read from a local content checkout: the repo never holds its
 * text) in a fresh Node 24 process with one probe call inserted after
 * each probed line, and records, every time a probe runs, which node each
 * pointer variable holds and where every node's `next` points. Nodes are
 * numbered in creation order: the class is wrapped (one line inserted after
 * its declaration) so every `new ListNode(...)` registers itself. The lesson
 * lines themselves are never edited; the steps are built from this
 * recording (`../build.ts`) and the truth test re-records it.
 *
 * Node-only: the truth test and `yarn viz:linked-list` import this, the
 * browser never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { PointerProgram, PointerRecording, ProbeHit } from '../program'

const MARK = '\u0000LL'

/** The probe, declared at the end (a hoisted function), writing to stderr so stdout stays the program's own. */
const probeFn = (field: string) => `
function __ll(probe, vars) {
  const ix = (v) => (v === null ? null : __llNodes.indexOf(v))
  const out = {}
  for (const k of Object.keys(vars)) {
    const at = ix(vars[k])
    if (at === -1) throw new Error('probe ' + probe + ': ' + k + ' is not a list node')
    out[k] = at
  }
  const next = __llNodes.map((n) => ix(n.next))
  const labels = __llNodes.map((n) => String(n[${JSON.stringify(field)}]))
  process.stderr.write(${JSON.stringify(MARK)} + JSON.stringify({ probe, vars: out, next, labels }) + '\\n')
}`

/**
 * The program (`code`, as run, from the local content checkout) with node
 * registration and a probe after each probed line (same indentation).
 */
export function instrument(p: PointerProgram, code: string): string {
  const lines = code.split('\n')
  const after = new Map<number, string[]>()
  const add = (i: number, text: string) => after.set(i, [...(after.get(i) ?? []), text])
  const at = (line: number) => {
    if (!lines[line - 1]?.trim()) throw new Error(`${p.id}: line ${line} is not a statement of the program`)
    return line - 1
  }
  add(at(p.classEnd), `${p.nodeClass} = class extends ${p.nodeClass} { constructor(...a) { super(...a); __llNodes.push(this) } };`)
  for (const probe of p.probes) {
    const i = at(probe.after)
    const indent = lines[i].match(/^\s*/)![0]
    add(i, `${indent}__ll(${JSON.stringify(probe.id)}, { ${probe.vars.join(', ')} });`)
  }
  const out: string[] = []
  lines.forEach((l, i) => out.push(l, ...(after.get(i) ?? [])))
  // `var`: hoisted, so the class wrapper (inserted before any node exists) can use it.
  return ['var __llNodes = [];', ...out, probeFn(p.valueField)].join('\n')
}

function run(p: PointerProgram, code: string) {
  const res = spawnSync(process.execPath, [`--input-type=commonjs${p.lang === 'ts' ? '-typescript' : ''}`, '-e', code], {
    encoding: 'utf8',
    timeout: 10_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (res.error) throw res.error
  if (res.status !== 0) throw new Error(`${p.id} exited with ${res.status}: ${res.stderr}`)
  const stdout = res.stdout.split('\n')
  if (stdout[stdout.length - 1] === '') stdout.pop()
  return { stdout, stderr: res.stderr }
}

/** What the plain program prints: its code, untouched, in a fresh process. */
export function runPlain(p: PointerProgram, code: string): string[] {
  return run(p, code).stdout
}

/** Runs the instrumented program in a clean Node process and returns its recording. */
export function recordPointers(p: PointerProgram, code: string): PointerRecording & { runtime: string } {
  const { stdout, stderr } = run(p, instrument(p, code))
  const hits: ProbeHit[] = []
  let labels: string[] = []
  for (const line of stderr.split('\n')) {
    if (!line.startsWith(MARK)) continue
    const hit = JSON.parse(line.slice(MARK.length)) as ProbeHit & { labels: string[] }
    labels = hit.labels
    hits.push({ probe: hit.probe, vars: hit.vars, next: hit.next })
  }
  for (const probe of p.probes)
    if (!hits.some((h) => h.probe === probe.id)) throw new Error(`${p.id}/${probe.id}: the probe never ran`)
  return { sha256: sha256(code), observed: stdout, labels, hits, runtime: `node@${process.versions.node}` }
}
