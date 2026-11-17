/**
 * The hidden-class recorder (engine-and-runtime): runs a lesson program byte
 * for byte in a fresh Node 24 process started with `--allow-natives-syntax`,
 * under the inspector, and at each probe asks V8 itself which map (hidden
 * class) each named object has. `%DebugPrint(obj)` prints the object's map
 * address, its own properties and the map's `back pointer`, the map it was
 * reached from by adding one property: the transition tree's parent link.
 * Watches (`%HaveSameMap(obj1, obj2)`) are read as values. Nothing is
 * inserted into the program; the printouts go to stdout, the pauses to
 * stderr. Map addresses differ from run to run, so the recording names maps
 * `m0`, `m1`, ... in the order they were first seen; it is the same on every
 * run of the same program.
 *
 * V8 maps are not observable from plain JavaScript: this is the register's
 * verification (`node --allow-natives-syntax`, `%HaveSameMap`) plus V8's own
 * debug printer for the parent links. Node-only.
 */
import { spawnSync } from 'node:child_process'
import { sha256 } from '../../../step-log/truth'
import type { ProgramSource } from '../../../step-log/lesson-source'

export const MAPS_GENERATOR = 'node-natives-maps@1'

export type MapProbe = {
  /** A line of the program as run (1-based): paused before it runs, every time. */
  line: number
  as: string
  /** Expressions whose map is printed at this pause (`this`, `obj1`). */
  maps: readonly string[]
  /** Watches read at this pause (names in `MapProgram.watch`). */
  read?: readonly string[]
}

export type MapProgram = {
  id: string
  source: ProgramSource
  probes: readonly MapProbe[]
  watch: Record<string, string>
}

/** One object's hidden class at a pause: its map, the map's parent (back pointer) and the object's own keys in order. */
export type RecordedMap = { map: string; parent: string | null; keys: string[] }

export type MapPause = { probe: string; line: number; maps: Record<string, RecordedMap>; vars: Record<string, unknown> }

export type MapRecording = { generator: string; sha256: string; pauses: MapPause[] }

const MARK = '\u0001VZMAP'

const RECORDER = String.raw`
const inspector = require('node:inspector')
const vm = require('node:vm')
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (d) => (input += d))
process.stdin.on('end', () => {
  const { code, probes, watch, mark } = JSON.parse(input)
  const session = new inspector.Session()
  session.connect()
  const post = (method, params) => {
    let out
    session.post(method, params, (err, res) => { if (err) throw err; out = res })
    return out
  }
  const evaluate = (frame, expression) => {
    let out
    session.post('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression, returnByValue: true }, (err, res) => {
      out = err ? { error: err.message } : res.exceptionDetails ? { error: res.exceptionDetails.text } : { value: res.result.value }
    })
    return out
  }
  const pauses = []
  const byId = new Map()
  session.on('Debugger.paused', ({ params }) => {
    const frame = params.callFrames[0]
    for (const id of params.hitBreakpoints || []) {
      const p = byId.get(id)
      if (!p) continue
      const n = pauses.length
      p.maps.forEach((expr, k) => {
        const r = evaluate(frame, '%DebugPrint(' + JSON.stringify(mark + ' ' + n + ' ' + k) + '), %DebugPrint(' + expr + '), 0')
        if (r.error) throw new Error(expr + ': ' + r.error)
      })
      const vars = {}
      for (const name of p.read || []) {
        const r = evaluate(frame, watch[name])
        if (r.error) throw new Error(name + ': ' + r.error)
        vars[name] = r.value
      }
      pauses.push({ probe: p.as, line: p.line, vars })
    }
    session.post('Debugger.resume')
  })
  post('Debugger.enable', {})
  for (const p of probes) byId.set(post('Debugger.setBreakpointByUrl', { url: 'lesson.js', lineNumber: p.line - 1 }).breakpointId, p)
  vm.runInThisContext(code, { filename: 'lesson.js' })
  session.disconnect()
  process.stderr.write('\u0000PAUSES' + JSON.stringify(pauses) + '\n')
})
`

const hex = (s: string) => BigInt(s).toString(16)

/** Parses one object's `%DebugPrint`: its map, the map's back pointer, its own keys. */
export function parseDebugPrint(block: string): { map: string; parent: string | null; keys: string[] } {
  const map = block.match(/^ - map: (0x[0-9a-f]+) <Map/m)
  if (!map) throw new Error(`no map in a DebugPrint: ${block.slice(0, 200)}`)
  const section = block.slice(block.search(new RegExp(`^0x0*${hex(map[1])}: \\[Map\\]`, 'm')))
  const back = section.match(/^ - back pointer: (0x[0-9a-f]+) <(\w+)/m)
  if (!back) throw new Error(`no back pointer for map ${map[1]}`)
  // `All own properties (excluding elements): {}` when empty, else one line per property up to ` }`.
  const own = block.match(/All own properties \(excluding elements\): \{(\}|[\s\S]*?\n \})/)
  if (!own) throw new Error(`no own properties in a DebugPrint: ${block.slice(0, 200)}`)
  const keys = [...own[1].matchAll(/#([^:\s]+): /g)].map((m) => m[1])
  return { map: hex(map[1]), parent: back[2] === 'Map' ? hex(back[1]) : null, keys }
}

/** Runs the program with natives syntax under the inspector and returns its recording (maps named m0, m1, ...). */
export function recordMaps(program: MapProgram, code: string): MapRecording & { runtime: string } {
  const run = spawnSync(process.execPath, ['--allow-natives-syntax', '--no-warnings', '-e', RECORDER], {
    input: JSON.stringify({ code, probes: program.probes, watch: program.watch, mark: MARK }),
    encoding: 'utf8',
    timeout: 20_000,
    env: { PATH: process.env.PATH ?? '' } as unknown as NodeJS.ProcessEnv,
  })
  if (run.error) throw run.error
  if (run.status !== 0) throw new Error(`${program.id} exited with ${run.status}: ${run.stderr}`)
  const line = run.stderr.split('\n').find((l) => l.startsWith('\u0000PAUSES'))
  if (!line) throw new Error(`${program.id}: no pauses: ${run.stderr}`)
  const raw = JSON.parse(line.slice('\u0000PAUSES'.length)) as Omit<MapPause, 'maps'>[]
  // The printouts in order: a marker (`<pause> <k>`), then that object's print.
  const blocks = run.stdout.split(/^DebugPrint: /m).slice(1)
  const prints = new Map<string, string>()
  for (let i = 0; i < blocks.length; i++) {
    const m = blocks[i].match(/#\\x01VZMAP (\d+) (\d+)/)
    if (m) prints.set(`${m[1]} ${m[2]}`, blocks[++i])
  }
  const names = new Map<string, string>()
  const name = (addr: string | null) => {
    if (addr === null) return null
    if (!names.has(addr)) names.set(addr, `m${names.size}`)
    return names.get(addr)!
  }
  const pauses: MapPause[] = raw.map((p, n) => {
    const probe = program.probes.find((x) => x.as === p.probe)!
    const maps: Record<string, RecordedMap> = {}
    probe.maps.forEach((expr, k) => {
      const block = prints.get(`${n} ${k}`)
      if (!block) throw new Error(`${program.id}: no DebugPrint for ${expr} at pause ${n}`)
      const d = parseDebugPrint(block)
      maps[expr] = { map: name(d.map)!, parent: name(d.parent), keys: d.keys }
    })
    return { ...p, maps }
  })
  for (const p of program.probes) if (!pauses.some((x) => x.probe === p.as)) throw new Error(`${program.id}: probe ${p.as} never paused`)
  return { generator: MAPS_GENERATOR, sha256: sha256(code), pauses, runtime: `node@${process.versions.node}` }
}
