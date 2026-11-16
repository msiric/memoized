/**
 * The sliding-window recorder (spec P6, "truthful by construction"): runs a
 * lesson program (read from a local content checkout: the repo never holds
 * its text) in a fresh Node 24 process under the inspector, pauses before
 * each probed line and reads the window's edges, its count map or Set and
 * the best length from the paused frame, plus what the program printed.
 * Nothing is inserted into the program: the probes are breakpoints and the
 * values are read with `Debugger.evaluateOnCallFrame`, the data DevTools
 * shows (the frontier recorder's method). The steps are built from this
 * recording (`../build.ts`) and the truth test re-records it.
 *
 * TypeScript (a practice answer) runs through Node's own type stripping,
 * which blanks the annotations in place, so every line keeps its number.
 *
 * Node-only: the truth test and `yarn viz:sliding-window` import this, the
 * browser never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { Pause, WindowProgram, WindowRecording } from '../program'

export const WINDOW_GENERATOR = 'node-inspector-window@1'

/**
 * Runs in the child Node: a same-thread inspector session, one breakpoint
 * per probed line of the script `lesson.js`, every watch read at each pause.
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
    const wrapped = '(() => { try { return JSON.stringify((' + expr + ')) } catch (e) { return "\u0000" + e.name } })()'
    let out
    session.post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: wrapped, returnByValue: true }, (err, res) => {
      out = err ? '\u0000' + err.message : res.result.value
    })
    return out
  }
  session.on('Debugger.paused', ({ params }) => {
    const frame = params.callFrames[0]
    const line = frame.location.lineNumber + 1
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

function spawn(args: string[], input?: string) {
  const run = spawnSync(process.execPath, args, {
    input,
    encoding: 'utf8',
    timeout: 20_000,
    // A clean environment: no NODE_OPTIONS or test globals leak into the run.
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  return run
}

const lines = (out: string) => {
  const l = out.split('\n')
  if (l[l.length - 1] === '') l.pop()
  return l
}

/** What the plain program prints: its code, untouched, in a fresh process (no inspector). */
export function runPlain(p: WindowProgram, code: string): string[] {
  const run = spawn(['--no-warnings', `--input-type=commonjs${p.lang === 'ts' ? '-typescript' : ''}`, '-e', code])
  if (run.status !== 0) throw new Error(`${p.id} exited with ${run.status}: ${run.stderr}`)
  return lines(run.stdout)
}

/**
 * Runs the program under the inspector in a clean Node process and returns
 * its recording. `code` is the program as run, composed from a local content
 * checkout (`loadProgram(program.source)`, `step-log/lesson-block.ts`).
 */
export function recordWindow(p: WindowProgram, code: string): WindowRecording & { runtime: string } {
  const run = spawn(['--no-warnings', '-e', RECORDER], JSON.stringify({ code, lang: p.lang, probes: p.probes, watch: p.watch }))
  if (run.status !== 0) throw new Error(`${p.id} exited with ${run.status}: ${run.stderr}`)
  const line = run.stderr.split('\n').find((l) => l.startsWith('\u0000PAUSES'))
  if (!line) throw new Error(`${p.id}: the recorder wrote no pauses: ${run.stderr}`)
  const pauses = JSON.parse(line.slice('\u0000PAUSES'.length)) as Pause[]
  for (const probe of p.probes)
    if (!pauses.some((x) => x.probe === probe.as)) throw new Error(`${p.id}: probe "${probe.as}" (line ${probe.line}) never paused`)
  return { sha256: sha256(code), observed: lines(run.stdout), pauses, runtime: `node@${process.versions.node}` }
}
