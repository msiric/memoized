/**
 * The annotated-tree recorder (spec P6, "truthful by construction"): runs a
 * lesson program byte for byte (read from a local content checkout; the
 * repo never holds it) in a fresh Node 24 process under the inspector, and
 * records what the paused frames hold: the trie after each call, every
 * value a recursive call returns, the suffix tree the constructor built.
 * Nothing is inserted into the program. Line probes are breakpoints; a
 * return probe pauses at the line's return position (V8's `return` break
 * location, resolved on the line's first pause) and records the call's
 * `returnValue`, the same value DevTools shows on stepping out. Watches are
 * read with `Debugger.evaluateOnCallFrame`.
 *
 * The figures are built from this recording (`../presets`), and the truth
 * test re-records it, so a drawn value and a real run cannot disagree.
 * TypeScript (a practice answer) runs through Node's own type stripping,
 * which blanks annotations in place, so every line keeps its number.
 *
 * Node-only: the truth test and `yarn viz:tree` import this; the browser
 * never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { TreePause, TreeProgram, TreeRecording } from '../programs/types'

export const TREE_GENERATOR = 'node-inspector-tree@1'

/**
 * Runs in the child Node: a same-thread inspector session, a breakpoint per
 * probed line of the script `lesson.js`; a return probe's line breakpoint
 * only finds the line's return location, where the probe then pauses.
 * Pauses go to stderr (one JSON line), so the program's stdout is its own.
 */
const RECORDER = String.raw`
const inspector = require('node:inspector')
const vm = require('node:vm')
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => (input += d))
process.stdin.on('end', () => {
  const { code, lang, probes, watch } = JSON.parse(input)
  const src = lang === 'ts' ? require('node:module').stripTypeScriptTypes(code, { mode: 'strip' }) : code
  const session = new inspector.Session()
  session.connect()
  const post = (method, params) => {
    let out
    session.post(method, params, (err, res) => {
      if (err) throw err
      out = res
    })
    return out
  }
  const pauses = []
  // Breakpoint id -> probe; a return probe is listed under its line breakpoint until resolved.
  const byId = new Map()
  const read = (frame, expr) => {
    const wrapped = '(() => { try { return JSON.stringify((' + expr + '), (k, v) => (v === Infinity ? "Infinity" : v === -Infinity ? "-Infinity" : v === undefined ? null : v)) } catch (e) { return "\u0000" + e.name } })()'
    let out
    session.post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: wrapped, returnByValue: true }, (err, res) => {
      out = err ? '\u0000' + err.message : res.result.value
    })
    return out
  }
  const vars = (frame, names) => {
    const out = {}
    for (const name of names) {
      const v = read(frame, watch[name])
      if (typeof v === 'string' && !v.startsWith('\u0000')) out[name] = JSON.parse(v)
    }
    return out
  }
  session.on('Debugger.paused', ({ params }) => {
    const frame = params.callFrames[0]
    for (const id of params.hitBreakpoints || []) {
      const hit = byId.get(id)
      if (!hit) continue
      if (hit.resolve) {
        // First pause on a return probe's line: move the probe to the line's return position.
        const line = hit.probe.line - 1
        const { locations } = post('Debugger.getPossibleBreakpoints', {
          start: { scriptId: frame.location.scriptId, lineNumber: line, columnNumber: 0 },
          end: { scriptId: frame.location.scriptId, lineNumber: line + 1, columnNumber: 0 },
        })
        const ret = locations.find((l) => l.type === 'return')
        if (!ret) throw new Error('line ' + hit.probe.line + ' has no return position')
        const { breakpointId } = post('Debugger.setBreakpoint', { location: ret })
        byId.set(breakpointId, { probe: hit.probe })
        post('Debugger.removeBreakpoint', { breakpointId: id })
        byId.delete(id)
        continue
      }
      const p = hit.probe
      const pause = { probe: p.as, line: p.line, vars: vars(frame, p.read) }
      if (p.at === 'return') {
        const r = frame.returnValue
        pause.returned = r && 'value' in r ? r.value : r ? '\u0000' + r.type : null
      }
      pauses.push(pause)
    }
    session.post('Debugger.resume')
  })
  post('Debugger.enable', {})
  for (const p of probes) {
    const { breakpointId } = post('Debugger.setBreakpointByUrl', { url: 'lesson.js', lineNumber: p.line - 1 })
    byId.set(breakpointId, p.at === 'return' ? { probe: p, resolve: true } : { probe: p })
  }
  vm.runInThisContext(src, { filename: 'lesson.js' })
  session.disconnect()
  process.stderr.write('\u0000PAUSES' + JSON.stringify(pauses) + '\n')
})
`

/**
 * Runs the program under the inspector in a clean Node process and returns
 * its recording. `code` is the program as run, composed from a local
 * content checkout (`loadProgram(program.source)`, `step-log/lesson-block.ts`).
 */
export function recordTree(program: TreeProgram, code: string): TreeRecording & { runtime: string } {
  const run = spawnSync(process.execPath, ['--no-warnings', '-e', RECORDER], {
    input: JSON.stringify({ code, lang: program.lang, probes: program.probes, watch: program.watch }),
    encoding: 'utf8',
    timeout: 20_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`${program.id} exited with ${run.status}: ${run.stderr}`)
  const stdout = run.stdout.split('\n')
  if (stdout[stdout.length - 1] === '') stdout.pop()
  const line = run.stderr.split('\n').find((l) => l.startsWith('\u0000PAUSES'))
  if (!line) throw new Error(`${program.id}: the recorder wrote no pauses: ${run.stderr}`)
  const pauses = JSON.parse(line.slice('\u0000PAUSES'.length)) as TreePause[]
  for (const p of program.probes)
    if (!pauses.some((x) => x.probe === p.as)) throw new Error(`${program.id}: probe "${p.as}" (line ${p.line}) never paused`)
  return { generator: TREE_GENERATOR, sha256: sha256(code), stdout, pauses, runtime: `node@${process.versions.node}` }
}
