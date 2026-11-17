// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { displayProblems, type DisplayRow, type ProgramSource } from '../../step-log/lesson-source'
import { validateStepLog } from '../../step-log/validate'
import type { StepLog } from '../../step-log/types'
import { emitFramesDescriptor, generatorFramesDescriptor, workerPoolDescriptor } from './descriptor'
import type { FState } from './model'
import { EMITTER_BUILDERS } from './presets/emitter'
import { GENERATOR_BUILDERS } from './presets/generators'
import { POOL_BUILDERS } from './presets/worker-pool'
import type { FramesProgram, FramesRecording, Pause } from './program'
import { FRAMES_PROGRAMS } from './programs'
import { verifyLog, verifyRecording } from './truth/verify'
import generators from './recordings/generators.json'
import pool from './recordings/async-await.json'
import emitter from './recordings/design-patterns.json'

/**
 * The frames truth gate (spec P6) for the three wave 3C visuals. With a
 * local content checkout: every program's blocks match their committed
 * sha256s, a fresh Node 24 run under the inspector equals the committed
 * recording, and every pane row spells its program line (only whitespace
 * changed). Everywhere (CI included): every log is exactly what its builder
 * makes of the committed recording, the register's assertions hold on the
 * recordings, no committed text row is content (harness lines only), and
 * lies (tampered recordings) fail.
 */

const REC: Record<string, FramesRecording> = { ...(generators as object), ...(pool as object), ...(emitter as object) } as Record<string, FramesRecording>
const ALL = Object.values(FRAMES_PROGRAMS).flat() as FramesProgram[]
const BUILDERS: Record<string, { program: FramesProgram; build: (r: FramesRecording) => StepLog<FState> }> = {}
for (const d of [generatorFramesDescriptor, workerPoolDescriptor, emitFramesDescriptor])
  for (const p of d.presets) {
    const build = { ...GENERATOR_BUILDERS, ...POOL_BUILDERS, ...EMITTER_BUILDERS }[p.id as never] as (r: FramesRecording) => StepLog<FState>
    const program = ALL.find((x) => x.sha256 === p.log.source.sha256)!
    BUILDERS[p.id] = { program, build }
  }
const logOf = (id: string) => [generatorFramesDescriptor, workerPoolDescriptor, emitFramesDescriptor].flatMap((d) => d.presets).find((p) => p.id === id)!.log

describe.each(ALL.map((p) => [p.id, p] as const))('frames program %s', (_id, p) => {
  const loaded = (() => {
    try {
      return loadProgram(p.source)
    } catch (e) {
      return { ok: true as const, text: '', error: (e as Error).message }
    }
  })()
  const why = loaded.ok ? '' : ` (skipped: ${skipNote(loaded.missing)})`
  it.skipIf(!loaded.ok)(`matches a fresh Node 24 run under the inspector${why}`, () => {
    if (!loaded.ok) return
    expect((loaded as { error?: string }).error, 'the content drifted').toBeUndefined()
    expect(verifyRecording(p, REC[p.id], loaded.text)).toEqual([])
  }, 60_000)
})

describe.each(Object.keys(BUILDERS))('frames/%s', (id) => {
  const { program, build } = BUILDERS[id]
  const log = logOf(id)

  it('is exactly what its builder makes of the committed recording, and passes the authoring lint', () => {
    expect(program, 'the log names a program by hash').toBeDefined()
    expect(verifyLog(log, build(REC[program.id]), program)).toEqual([])
    expect(validateStepLog(log, generatorFramesDescriptor.engine.introspect)).toEqual([])
  })

  it('commits no content text: every text row is a harness line, every content row a wrap', () => {
    const rows = log.code!.premium?.rows ?? log.code!.lines.map((text, i): DisplayRow => ({ src: i + 1, text }))
    const harness = harnessText(program.source)
    for (const r of rows) if ('text' in r && r.text.trim()) expect(harness.some((h) => h.includes(r.text.trim())), r.text).toBe(true)
  })

  const loaded = (() => {
    try {
      return loadProgram(program.source)
    } catch {
      return { ok: false as const, missing: 'drifted' }
    }
  })()
  it.skipIf(!loaded.ok || !log.code!.premium)(`shows the program's own lines, reflowed (only whitespace changed)${loaded.ok ? '' : ' (skipped: needs the checkout)'}`, () => {
    if (!loaded.ok) return
    expect(displayProblems(loaded.text.split('\n'), log.code!.premium!.rows, { maxCols: 35, blankRows: true })).toEqual([])
  })
})

const harnessText = (s: ProgramSource) => s.flatMap((p) => ('code' in p ? [p.code] : []))

// ---------------------------------------------------------------------------
// The register's verification, on the recordings (and lies that must fail).
// ---------------------------------------------------------------------------

const vars = (r: FramesRecording, probe: string) => r.pauses.filter((p) => p.probe === probe).map((p) => p.vars)
const big = (v: unknown) => (v as { $n: string }).$n

function generatorClaims(r: Record<string, FramesRecording>): string[] {
  const e: string[] = []
  const tw = r['two-way-next-arg']
  if (JSON.stringify(tw.observed) !== JSON.stringify(["{ value: 'first', done: false }", 'got: 10', "{ value: 'second', done: false }", 'got: 20', '{ value: undefined, done: true }']))
    e.push(`twoWay printed ${JSON.stringify(tw.observed)}`)
  if (vars(tw, 'got-x')[0]?.x !== 10) e.push('next(10) did not make x 10')
  const between = tw.pauses.filter((p) => p.probe === 'call')[1]
  if (between?.gens?.g.state !== 'suspended' || between.gens.g.line !== 2) e.push('g was not suspended at its first yield between calls')
  const tk = r['take-closes-source']
  const last = vars(tk, 'check').at(-1)
  if (last?.pulled !== 2 || last?.closed !== 1) e.push(`take ended with pulled ${last?.pulled}, closed ${last?.closed} (register: 2, 1)`)
  if (vars(tk, 'source-yield').length !== 2) e.push('source yielded other than twice')
  const fin = tk.pauses.findIndex((p) => p.probe === 'source-finally')
  if (!(fin > 0 && tk.pauses[fin - 1].vars.count === 2)) e.push("source's finally did not run right after take's count reached 2")
  const pl = r['lazy-pipeline-pull']
  if (vars(pl, 'fib-yield').length !== 9) e.push(`the pipeline pulled ${vars(pl, 'fib-yield').length} fibonacci values, not 9`)
  if (JSON.stringify(vars(pl, 'take-yield').map((v) => big(v.value))) !== JSON.stringify(['16', '26', '42'])) e.push('take did not yield 16n, 26n, 42n')
  const ten = vars(pl, 'filter-test').find((v) => big(v.value) === '10')
  if (ten?.pass !== false) e.push('10n passed the filter')
  if (!Object.values(pl.pauses.at(-1)!.gens!).every((g) => g.state === 'closed')) e.push('a pipeline stage was left open')
  const dl = r['yield-star-forwarding']
  if (vars(dl, 'inner-return')[0]?.x !== 42) e.push('42 did not reach inner')
  if (dl.observed[1] !== "{ value: 'got 42', done: true }") e.push(`o.next(42) printed ${dl.observed[1]}`)
  return e
}

/** A mapLimit-style run as events: claims (index), releases (index), writes seen at the next pause. */
function events(r: FramesRecording) {
  const out: { kind: 'call' | 'release' | 'catch'; i: number; at: number }[] = []
  r.pauses.forEach((p: Pause, at) => {
    if (p.probe === 'call' || p.probe === 'catch') out.push({ kind: p.probe, i: p.vars.index as number, at })
    if (p.probe === 'start') out.push({ kind: 'call', i: p.vars.index as number, at })
    if (p.probe === 'release') out.push({ kind: 'release', i: p.vars.i as number, at })
  })
  return out
}

function poolClaims(r: Record<string, FramesRecording>): string[] {
  const e: string[] = []
  const rf = events(r['refill-on-settle'])
  const at = (kind: string, i: number) => rf.findIndex((x) => x.kind === kind && x.i === i)
  if (JSON.stringify(rf.filter((x) => x.kind === 'call').map((x) => x.i)) !== '[0,1,2,3]') e.push('claims were not 0, 1, 2, 3')
  if (!(at('call', 2) > at('release', 1) && at('call', 2) < at('release', 0))) e.push('index 2 did not start as soon as index 1 settled')
  let active = 0
  for (const x of rf) if ((active += x.kind === 'call' ? 1 : x.kind === 'release' ? -1 : 0) > 2) e.push('more than two operations in flight')
  if (r['refill-on-settle'].observed[0] !== "[ 'A', 'B', 'C', 'D' ]") e.push('results were not in input order')
  const fb = events(r['fixed-batches-contrast'])
  const fat = (kind: string, i: number) => fb.findIndex((x) => x.kind === kind && x.i === i)
  if (!(fat('call', 2) > fat('release', 0))) e.push('the fixed batch started index 2 before index 0 settled')
  const fl = r['failure-stops-claims']
  if (events(fl).some((x) => x.kind === 'call' && x.i >= 2)) e.push('a worker claimed after the failure')
  const write = fl.pauses.find((p) => Array.isArray(p.vars.results) && p.vars.results[0] === 'A')
  if (!write || write.out < 1 || fl.observed[0] !== 'rejected: b failed') e.push('the running operation did not finish after the returned promise rejected')
  return e
}

function emitterClaims(r: Record<string, FramesRecording>): string[] {
  const e: string[] = []
  const final = (id: string, probe = 'assert', nth = -1) => vars(r[id], probe).at(nth)?.order
  if (JSON.stringify(final('once-consumed-by-nested-emit')) !== JSON.stringify(['outer', 'inner', 'once'])) e.push('nested order is not [outer, inner, once]')
  if (JSON.stringify(final('snapshot-add-remove', 'assert', 0)) !== JSON.stringify(['first'])) e.push('the first emit did not log only first')
  if (JSON.stringify(final('snapshot-add-remove')) !== JSON.stringify(['first', 'first', 'late'])) e.push('the second emit did not log [first, first, late]')
  const calls = vars(r['once-consumed-by-nested-emit'], 'call').map((v) => v.entry)
  if (calls.filter((x) => x === 1).length !== 1) e.push('the once record was called other than once')
  const skip = vars(r['once-consumed-by-nested-emit'], 'turn').find((v) => v.entry === 1 && v.member === false)
  if (!skip) e.push("the outer emit's turn for once was not skipped by the membership check")
  return e
}

describe('frames: the register’s verification', () => {
  it('holds on the committed recordings', () => {
    expect(generatorClaims(REC)).toEqual([])
    expect(poolClaims(REC)).toEqual([])
    expect(emitterClaims(REC)).toEqual([])
  })

  const clone = (): Record<string, FramesRecording> => JSON.parse(JSON.stringify(REC))

  it('fails on lies: a dropped next(arg), a third pull, a fixed batch in the pool, a claim after failure, a once run twice', () => {
    const a = clone()
    a['two-way-next-arg'].pauses.find((p) => p.probe === 'got-x')!.vars.x = 99
    expect(generatorClaims(a)).toContain('next(10) did not make x 10')
    const b = clone()
    b['take-closes-source'].pauses.at(-2)!.vars.pulled = 3
    expect(generatorClaims(b).join()).toMatch(/pulled 3/)
    const c = clone()
    // index 2 claimed only after index 0 settles (the fixed-batch model) must fail the refill claim.
    const ps = c['refill-on-settle'].pauses
    const i2 = ps.findIndex((p) => p.probe === 'call' && p.vars.index === 2)
    const r0 = ps.findIndex((p) => p.probe === 'release' && p.vars.i === 0)
    const [moved] = ps.splice(i2, 1)
    ps.splice(r0, 0, moved)
    expect(poolClaims(c)).toContain('index 2 did not start as soon as index 1 settled')
    const d = clone()
    d['failure-stops-claims'].pauses.push({ ...d['failure-stops-claims'].pauses.find((p) => p.probe === 'call')!, vars: { index: 2 } })
    expect(poolClaims(d)).toContain('a worker claimed after the failure')
    const f = clone()
    const call = f['once-consumed-by-nested-emit'].pauses.find((p) => p.probe === 'call' && p.vars.entry === 0)!
    call.vars.entry = 1
    expect(emitterClaims(f)).toContain('the once record was called other than once')
  })

  it('fails a log built from a tampered recording (nothing drawn is hand-placed)', () => {
    const t = clone()
    t['refill-on-settle'].pauses.filter((p) => p.probe === 'check').at(-1)!.vars.results = ['A', 'B', 'C', 'X']
    const { program, build } = BUILDERS['refill-on-settle']
    expect(verifyLog(logOf('refill-on-settle'), build(t['refill-on-settle']), program).length).toBeGreaterThan(0)
  })
})
