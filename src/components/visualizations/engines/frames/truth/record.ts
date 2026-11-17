/**
 * The frames recorder (spec P6, "truthful by construction"): runs a program
 * (read from a local content checkout: the repo never holds its text) in a
 * fresh Node 24 process under the inspector, pauses before each probed line
 * and reads, from the paused frames, the probe's expressions, the program's
 * frames on the stack (with per-function expressions, such as each emit's
 * cursor), the state and suspended line of every tracked generator
 * (`[[GeneratorState]]`, `[[GeneratorLocation]]`: what DevTools shows) and
 * how many lines the program had printed. Nothing is inserted into the
 * program: the probes are breakpoints and the values are read with
 * `Debugger.evaluateOnCallFrame` and `Runtime.getProperties` (the frontier
 * recorder's method). Asynchronous programs run until the event loop is
 * empty; their timing is the harness's controlled releases, never a clock.
 *
 * Record identity: an expression may call `__vzId(object)`, a recorder
 * global that numbers objects in the order it first sees them (a WeakMap of
 * the recorder's own), so a registration record keeps one number across
 * pauses without the program being touched.
 *
 * Node-only: the truth test and `yarn viz:frames` import this, the browser
 * never does.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { FramesProgram, FramesRecording, Pause } from '../program'

export const FRAMES_GENERATOR = 'node-inspector-frames@1'

const RECORDER = String.raw`
const inspector = require('node:inspector')
const vm = require('node:vm')
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => (input += d))
process.stdin.on('end', () => {
  const { code, probes, frameWatch, gens } = JSON.parse(input)
  // Breakpoint id -> probe, in probe order (two probes at one position: the first wins).
  const byBreakpoint = new Map()
  const ids = new WeakMap()
  let nextId = 0
  globalThis.__vzId = (o) => {
    if (!ids.has(o)) ids.set(o, nextId++)
    return ids.get(o)
  }
  // Lines printed so far: the program's stdout, counted as it is written.
  let printed = 0
  const write = process.stdout.write.bind(process.stdout)
  process.stdout.write = (chunk, ...rest) => {
    printed += String(chunk).split('\n').length - 1
    return write(chunk, ...rest)
  }
  const session = new inspector.Session()
  session.connect()
  const post = (method, params) => {
    let out
    session.post(method, params, (err, res) => (out = err ? { error: err.message } : res))
    return out
  }
  const pauses = []
  let scriptId = null
  const ENCODE = '(v) => v === undefined ? \'{"$u":1}\' : JSON.stringify(v, (k, x) => typeof x === "bigint" ? { $n: String(x) } : x === undefined ? { $u: 1 } : x)'
  // A watch is an expression, or [expression, function]: the expression is read in the paused frame with no
  // closure around it (debug-evaluate resolves private names such as #listeners only there), and the function
  // then maps the object it found. undefined and bigint survive as {"$u":1} and {"$n":"16"}.
  const read = (frame, watch) => {
    const [expr, map] = typeof watch === 'string' ? [watch, null] : watch
    const got = post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: expr, objectGroup: 'watch', silent: true })
    if (got.error || got.exceptionDetails) return { ok: false }
    const arg = got.result.objectId ? { objectId: got.result.objectId } : got.result.unserializableValue ? { unserializableValue: got.result.unserializableValue } : { value: got.result.value }
    const target = got.result.objectId ?? post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: 'globalThis', objectGroup: 'watch', silent: true }).result.objectId
    const res = post('Runtime.callFunctionOn', {
      objectId: target,
      functionDeclaration: 'function (x) { return (' + ENCODE + ')(' + (map ? '(' + map + ')(x)' : 'x') + ') }',
      arguments: [arg],
      returnByValue: true,
      silent: true,
    })
    post('Runtime.releaseObjectGroup', { objectGroup: 'watch' })
    const v = res.error || res.exceptionDetails ? undefined : res.result.value
    return typeof v === 'string' ? { ok: true, value: JSON.parse(v) } : { ok: false }
  }
  const internal = (objectId) => {
    const res = post('Runtime.getProperties', { objectId, ownProperties: true })
    return Object.fromEntries((res.internalProperties || []).map((p) => [p.name, p.value]))
  }
  const scopeVar = (objectId, name) => {
    const scopes = internal(objectId)['[[Scopes]]']
    if (!scopes) return null
    for (const s of post('Runtime.getProperties', { objectId: scopes.objectId, ownProperties: true }).result || []) {
      if (!s.value || !s.value.objectId) continue
      const hit = (post('Runtime.getProperties', { objectId: s.value.objectId, ownProperties: true }).result || []).find((p) => p.name === name)
      if (hit && hit.value && hit.value.objectId) return hit.value.objectId
    }
    return null
  }
  const handles = new Map()
  session.on('Debugger.paused', ({ params }) => {
    const frames = params.callFrames.filter((f) => f.location.scriptId === scriptId)
    const top = frames[0]
    const line = top ? top.location.lineNumber + 1 : 0
    const hits = (params.hitBreakpoints || []).map((id) => byBreakpoint.get(id)).filter(Boolean)
    const probe = hits.sort((a, b) => a.order - b.order)[0]
    if (probe && top === params.callFrames[0]) {
      const vars = {}
      for (const [name, expr] of Object.entries(probe.watch || {}))
        for (const f of frames) {
          const v = read(f, expr)
          if (v.ok) {
            vars[name] = v.value
            break
          }
        }
      const stack = frames.map((f) => {
        const fn = f.functionName
        const out = { fn, line: f.location.lineNumber + 1 }
        const w = frameWatch && frameWatch[fn]
        if (w) {
          out.vars = {}
          for (const [name, expr] of Object.entries(w)) {
            const v = read(f, expr)
            if (v.ok) out.vars[name] = v.value
          }
        }
        return out
      })
      const genStates = readGens(frames[frames.length - 1])
      pauses.push({ probe: probe.as, line, vars, stack, out: printed, ...(genStates ? { gens: genStates } : {}) })
    }
    session.post('Debugger.resume')
  })
  // Every tracked generator's state; new handles are looked for from 'outer' (the program's top-level frame), if paused.
  function readGens(outer) {
    if (!gens || !gens.length) return undefined
    const genStates = {}
    for (const g of gens) {
      if (!handles.has(g.id)) {
        let id = null
        if (g.expr && outer) {
          const r = post('Debugger.evaluateOnCallFrame', { callFrameId: outer.callFrameId, expression: g.expr, objectGroup: 'keep', silent: true })
          if (!r.error && !r.exceptionDetails && r.result.objectId && r.result.subtype === 'generator') id = r.result.objectId
        } else if (handles.has(g.of)) id = scopeVar(handles.get(g.of), g.name)
        if (id) handles.set(g.id, id)
      }
      if (!handles.has(g.id)) continue
      const ip = internal(handles.get(g.id))
      const loc = ip['[[GeneratorLocation]]']
      genStates[g.id] = { state: ip['[[GeneratorState]]'].value, ...(loc && ip['[[GeneratorState]]'].value === 'suspended' ? { line: loc.value.lineNumber + 1 } : {}) }
    }
    return genStates
  }
  session.on('Debugger.scriptParsed', ({ params }) => {
    if (params.url === 'lesson.js') scriptId = params.scriptId
  })
  post('Debugger.enable')
  probes.forEach((p, order) => {
    const res = post('Debugger.setBreakpointByUrl', { url: 'lesson.js', lineNumber: p.line - 1, ...(p.column !== undefined ? { columnNumber: p.column } : {}) })
    if (res.error) throw new Error('probe ' + p.as + ': ' + res.error)
    byBreakpoint.set(res.breakpointId, { ...p, order })
  })
  process.once('beforeExit', () => {
    // The run's end: what it printed and where every tracked generator was left (no frame is paused).
    const genStates = readGens(null)
    pauses.push({ probe: 'exit', line: 0, vars: {}, stack: [], out: printed, ...(genStates ? { gens: genStates } : {}) })
    session.disconnect()
    process.stderr.write('\u0000PAUSES' + JSON.stringify(pauses) + '\n')
  })
  vm.runInThisContext(code, { filename: 'lesson.js' })
})
`

function spawn(args: string[], input?: string) {
  const run = spawnSync(process.execPath, args, {
    input,
    encoding: 'utf8',
    timeout: 30_000,
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
export function runPlain(p: FramesProgram, code: string): string[] {
  const run = spawn(['--no-warnings', '--input-type=commonjs', '-e', code])
  if (run.status !== 0)
    throw new Error(`${p.id} exited with ${run.status}: ${run.stderr}`)
  return lines(run.stdout)
}

/**
 * Runs the program under the inspector in a clean Node process and returns
 * its recording. `code` is the program as run, composed from a local content
 * checkout (`loadProgram(program.source)`, `step-log/lesson-block.ts`).
 */
export function recordFrames(
  p: FramesProgram,
  code: string,
): FramesRecording & { runtime: string } {
  const run = spawn(
    ['--no-warnings', '-e', RECORDER],
    JSON.stringify({
      code,
      probes: p.probes,
      frameWatch: p.frameWatch ?? null,
      gens: p.gens ?? [],
    }),
  )
  if (run.status !== 0)
    throw new Error(`${p.id} exited with ${run.status}: ${run.stderr}`)
  const line = run.stderr.split('\n').find((l) => l.startsWith('\u0000PAUSES'))
  if (!line)
    throw new Error(`${p.id}: the recorder wrote no pauses: ${run.stderr}`)
  const pauses = JSON.parse(line.slice('\u0000PAUSES'.length)) as Pause[]
  for (const probe of p.probes)
    if (!probe.optional && !pauses.some((x) => x.probe === probe.as))
      throw new Error(
        `${p.id}: probe "${probe.as}" (line ${probe.line}) never paused`,
      )
  return {
    sha256: sha256(code),
    observed: lines(run.stdout),
    pauses,
    runtime: `node@${process.versions.node}`,
  }
}
