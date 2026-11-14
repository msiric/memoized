/**
 * The heap recorder (spec P6, "truthful by construction"): runs a lesson's
 * program in a fresh Node process with one probe call inserted at each
 * snapshot point, and records the object graph the named bindings reach,
 * with identity: every object gets the index of its first discovery, so two
 * names that reach one object record one index. The figure is built from
 * this recording (`../build.ts`) and the truth test re-records it, so the
 * picture and the run cannot disagree.
 *
 * Node-only: the truth test and `yarn viz:heap` import this, the browser
 * never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { HeapProgram, HeapRecording, RecordedSnapshot } from '../model'

/**
 * The probe, declared at the end of the program (a hoisted function
 * declaration, so a leading `'use strict'` stays the first statement). It
 * writes to stderr, so the program's own output is untouched.
 */
const PROBE = `
function __heap(id, getters, results) {
  const util = require('node:util')
  const ids = new Map()
  const objects = []
  const queue = []
  const val = (v) => {
    if (v !== null && typeof v === 'object') {
      if (!ids.has(v)) {
        const rec = { id: ids.size + 1, array: Array.isArray(v), rows: [] }
        ids.set(v, rec.id)
        objects.push(rec)
        queue.push([v, rec])
      }
      return { ref: ids.get(v) }
    }
    return { text: util.inspect(v) }
  }
  const bindings = getters.map(([name, get]) => [name, val(get())])
  while (queue.length) {
    const [o, rec] = queue.shift()
    for (const key of Object.keys(o)) rec.rows.push([key, val(o[key])])
  }
  const out = results.map(([expr, get]) => [expr, util.inspect(get())])
  process.stderr.write('\\u0000HEAP' + JSON.stringify({ id, bindings, objects, results: out }) + '\\n')
}`

const js = (s: string) => JSON.stringify(s)

/** The program with a probe call after each snapshot point (same indentation), and the probe itself. */
export function instrument(program: HeapProgram): string {
  const lines = program.snippet.split('\n')
  const after = new Map<number, string[]>()
  const atEnd: string[] = []
  for (const s of program.snapshots) {
    const getters = s.bindings.map((n) => `[${js(n)}, () => ${n}]`).join(', ')
    const results = (s.results ?? []).map((e) => `[${js(e)}, () => (${e})]`).join(', ')
    const call = `__heap(${js(s.id)}, [${getters}], [${results}])`
    if (s.after === 'end') {
      atEnd.push(call)
      continue
    }
    const hits = lines.flatMap((l, i) => (l.trim() === s.after ? [i] : []))
    if (hits.length !== 1)
      throw new Error(`${program.id}/${s.id}: "${s.after}" matches ${hits.length} lines; it must name exactly one`)
    const indent = lines[hits[0]].match(/^\s*/)![0]
    after.set(hits[0], [...(after.get(hits[0]) ?? []), `${indent}${call}`])
  }
  const out: string[] = []
  lines.forEach((l, i) => out.push(l, ...(after.get(i) ?? [])))
  return [...out, ...atEnd, PROBE].join('\n')
}

/** Runs the instrumented program in a clean Node process and returns its recording. */
export function recordHeap(program: HeapProgram): HeapRecording & { runtime: string } {
  const run = spawnSync(process.execPath, ['--input-type=commonjs', '-e', instrument(program)], {
    encoding: 'utf8',
    timeout: 10_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`${program.id} exited with ${run.status}: ${run.stderr}`)
  const observed = run.stdout.split('\n')
  if (observed[observed.length - 1] === '') observed.pop()
  const snapshots: Record<string, RecordedSnapshot> = {}
  for (const line of run.stderr.split('\n')) {
    if (!line.startsWith('\u0000HEAP')) continue
    const { id, ...snap } = JSON.parse(line.slice(5)) as RecordedSnapshot & { id: string }
    // A snapshot inside a function called twice would record twice: presets name points that run once.
    if (snapshots[id]) throw new Error(`${program.id}/${id}: the snapshot point ran more than once`)
    snapshots[id] = snap
  }
  for (const s of program.snapshots)
    if (!snapshots[s.id]) throw new Error(`${program.id}/${s.id}: the snapshot point never ran`)
  return { sha256: sha256(program.snippet), observed, snapshots, runtime: `node@${process.versions.node}` }
}
