/**
 * The frontier recorder (spec P6, "truthful by construction"): runs a
 * lesson's code block, byte for byte (read from a local content checkout:
 * the repo never holds it), in a fresh Node 24 process under the
 * inspector, pauses before each probed line and records what the paused
 * frame holds (the queue, the stack, the heap, the distances), plus what the
 * program printed. Nothing is inserted into the program: the probes are
 * breakpoints, and the values are read with `Debugger.evaluateOnCallFrame`,
 * the same data DevTools shows. The step-throughs are built from this
 * recording (`../build.ts`), and the truth test re-records it, so a drawn
 * queue and a real run cannot disagree.
 *
 * TypeScript blocks (practice answers) run through Node's own type
 * stripping, which blanks the annotations in place, so every line keeps its
 * number.
 *
 * Node-only: the truth test and `yarn viz:frontier` import this, the browser
 * never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { FrontierProgram, FrontierRecording, Pause } from '../programs/types'

export const FRONTIER_GENERATOR = 'node-inspector-frontier@1'

/**
 * Runs in the child Node: a same-thread inspector session, one breakpoint per
 * probed line of the script `lesson.js`, every watch read at each pause.
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
  const byLine = new Map(probes.map((p) => [p.line, p.as]))
  const session = new inspector.Session()
  session.connect()
  const pauses = []
  const read = (frame, expr) => {
    const wrapped = '(() => { try { return JSON.stringify((' + expr + '), (k, v) => (v === Infinity ? "Infinity" : v === undefined ? null : v)) } catch (e) { return "\u0000" + e.name } })()'
    let out
    session.post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: wrapped, returnByValue: true }, (err, res) => {
      out = err ? '\u0000' + err.message : res.result.value
    })
    return out
  }
  session.on('Debugger.paused', ({ params }) => {
    const frame = params.callFrames[0]
    const line = frame.location.lineNumber + 1
    // Only the probes' breakpoints exist (a vm script reports no url).
    if (byLine.has(line)) {
      const vars = {}
      for (const [name, expr] of Object.entries(watch)) {
        const v = read(frame, expr)
        // A binding not yet initialized (TDZ) or out of scope reads as absent.
        if (typeof v === 'string' && !v.startsWith('\u0000')) vars[name] = JSON.parse(v)
      }
      pauses.push({ probe: byLine.get(line), line, vars })
    }
    session.post('Debugger.resume')
  })
  session.post('Debugger.enable')
  for (const p of probes) session.post('Debugger.setBreakpointByUrl', { url: 'lesson.js', lineNumber: p.line - 1 })
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
export function recordFrontier(program: FrontierProgram, code: string): FrontierRecording & { runtime: string } {
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
  const pauses = JSON.parse(line.slice('\u0000PAUSES'.length)) as Pause[]
  for (const p of program.probes)
    if (!pauses.some((x) => x.probe === p.as)) throw new Error(`${program.id}: probe "${p.as}" (line ${p.line}) never paused`)
  return {
    generator: FRONTIER_GENERATOR,
    sha256: sha256(code),
    stdout,
    pauses,
    runtime: `node@${process.versions.node}`,
  }
}
