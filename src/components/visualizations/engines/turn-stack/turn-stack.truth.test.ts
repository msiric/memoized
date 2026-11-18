// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote, type LoadedProgram } from '../../step-log/lesson-block'
import { displayProblems, isAnswerSource } from '../../step-log/lesson-source'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import { buildLog, moves, popsOn, type PresetSpec } from './build'
import { turnStackDescriptor } from './descriptor'
import { hullIntrospection, key, stackOf, type HullState } from './model'
import { fenceLeSpec, fenceLtSpec, lessonPointsSpec } from './presets/convex-hull'
import { HULL_PROGRAMS } from './programs'
import { FENCE_POINTS, LESSON_POINTS, LE_SWAP, TURN_LINES } from './programs/convex-hull'
import type { HullProgram, HullRecording } from './programs/types'
import recordings from './recordings/convex-hull.json'
import { verifyLog, verifyRecording } from './truth/verify'

/**
 * Truthful by construction (spec P6): every point, stack, arriving point
 * and turn value on screen is a pause of a real Node 24 run of the practice
 * answer's own code (Erect the Fence, Andrew's monotone chain), under the
 * inspector; each turn value is the answer's own `cross` called in the
 * paused frame. The code is premium text, never committed: with a local
 * content checkout these tests check the block's sha256, re-run all three
 * programs, compare the committed recordings and check every pane row
 * against the program. Without one (CI) those tests skip, saying why; the
 * rest (rebuilding every log from the committed recordings, the register's
 * verification and checkpoints (R4), the `<=` variant's real answer and the
 * lies that must fail) run everywhere.
 */

const RECORDINGS = recordings as unknown as Record<string, HullRecording>
const SPECS: Record<string, PresetSpec> = {
  'monotone-chain-turn-pops': lessonPointsSpec,
  'fence-collinear-lt': fenceLtSpec,
  'fence-collinear-le': fenceLeSpec,
}
const programs = Object.values(HULL_PROGRAMS).flat() as HullProgram[]

const LOADED = new Map<string, LoadedProgram>(programs.map((p) => [p.id, loadProgram(p.source)]))
const textOf = (p: { id: string }) => {
  const l = LOADED.get(p.id)!
  if (!l.ok) throw new Error(skipNote(l.missing))
  return l.text
}
const absent = (p: { id: string }) => !LOADED.get(p.id)!.ok
const named = (p: { id: string }, name: string) => {
  const l = LOADED.get(p.id)!
  return l.ok ? name : `${name} (skipped: ${skipNote(l.missing)})`
}

describe.each(programs.map((p) => [p.id, p] as const))('program %s', (_id, p) => {
  it.skipIf(absent(p))(named(p, 'is the answer block it names (sha256) and matches a fresh Node 24 run: plain output, every pause'), () => {
    expect(verifyRecording(p, RECORDINGS[p.id], textOf(p))).toEqual([])
  })

  it('commits no solution code: the harness is one call and a blank line, a variant only one short token swap per turn test, the recording values only', () => {
    for (const part of p.source) {
      if ('code' in part) expect(part.code).toMatch(/^(|console\.log\(JSON\.stringify\(outerTrees\(\[(\[\d,\d\],?)+\]\)\)\);)$/)
      else {
        expect(part.replace).toBeUndefined()
        if (part.swaps) {
          expect(part.swaps).toEqual(LE_SWAP)
          expect(part.lines?.[0]).toBe(part.lines?.[1])
          expect(TURN_LINES).toContain(part.lines![0])
          for (const [from, to] of part.swaps) expect(Math.max(from.length, to.length)).toBeLessThanOrEqual(4)
        }
      }
    }
    const rec = RECORDINGS[p.id]
    expect(Object.keys(rec).sort()).toEqual(['generator', 'pauses', 'sha256', 'stdout'])
    for (const pause of rec.pauses) for (const k of Object.keys(pause.vars)) expect(Object.keys(p.watch)).toContain(k)
    // The watches are reads (and the answer's own cross), never a line of the answer.
    for (const w of Object.values(p.watch)) expect(w).toMatch(/^(trees|lower|upper|p|(lower|upper)\.length > 1 \? cross\((lower|upper)\.at\(-2\), \2\.at\(-1\), p\) : null)$/)
  })
})

describe.each(turnStackDescriptor.presets.map((p) => [p.id, p.log] as const))('hull-turn-stack/%s', (id, log) => {
  const spec = SPECS[id]

  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(log, hullIntrospection)).toEqual([])
  })

  it('is exactly what the builder makes of the recorded run', () => {
    expect(verifyLog(log, spec)).toEqual([])
  })

  it.skipIf(absent(spec.program))(named(spec.program, 'shows the answer’s lines, only reflowed (whitespace aside, every character is the answer’s)'), () => {
    expect(displayProblems(textOf(spec.program).split('\n'), spec.display, { maxCols: 35, blankRows: false })).toEqual([])
  })

  it('commits the practice answer only as rows without text', () => {
    expect(isAnswerSource(spec.program.source)).toBe(true)
    for (const r of spec.display) expect('wrap' in r, `${id} row ${r.src}`).toBe(true)
    expect(log.code?.premium).toBeTruthy()
    expect(log.code!.lines.join('')).toMatch(/^[·\s]*$/)
    expect(log.source.snippet).toBeUndefined()
  })

  it('asks every question on the step before its reveal, never after the answer is drawn', () => {
    for (const cp of log.checkpoints) {
      expect(cp.beforeStep).toBeGreaterThanOrEqual(2)
      const asked = log.steps[cp.beforeStep - 1].state
      const reveal = log.steps[cp.beforeStep].state
      // The point in question is still on the stack while it is asked; the answer is what the reveal's turn test did.
      expect(stackOf(asked).map(key)).toContain(key(reveal.turn!.a))
      expect(cp.answer).toBe(reveal.turn!.pops ? 'popped' : 'stays')
    }
  })
})

describe('hull-turn-stack descriptor', () => {
  it('fits its title and switcher at 320', () => {
    expect(validateDescriptor(turnStackDescriptor)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The register's verification (R4): the step data equals the logged pushes
// and pops, and the checkpoints are what the runs did.
// ---------------------------------------------------------------------------

const ALL = [lessonPointsSpec, fenceLtSpec, fenceLeSpec]
const moveSteps = (spec: PresetSpec) => buildLog(spec).steps.filter((s) => s.state.chain === 'lower' || s.state.chain === 'upper')
const pts = (s: readonly (readonly [number, number])[]) => s.map(key).join(' ')

describe('register: convex-hull (monotone-chain-turn-pops, erect-the-fence)', () => {
  it('prints the hull each program returns (Node 24)', () => {
    expect(lessonPointsSpec.recording.stdout).toEqual(['[[3,3],[0,3],[0,0],[3,0]]'])
    expect(fenceLtSpec.recording.stdout).toEqual(['[[3,3],[0,3],[0,0],[1,0],[2,0],[3,0]]'])
    expect(fenceLeSpec.recording.stdout).toEqual(['[[3,3],[0,3],[0,0],[3,0]]'])
  })

  it('plots the lesson’s seven points and the fence’s seven posts, sorted by x then y as the run sorted them', () => {
    const sorted = (ps: readonly (readonly [number, number])[]) => [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    expect(pts(lessonPointsSpec.recording.pauses[0].vars.trees!)).toBe(pts(sorted(LESSON_POINTS)))
    expect(pts(fenceLtSpec.recording.pauses[0].vars.trees!)).toBe(pts(sorted(FENCE_POINTS)))
  })

  it('every step is one logged pop or push, lower chain first, then upper, then the joined hull', () => {
    for (const spec of ALL) {
      const logged = moves(spec.recording, spec.program.op)
      const steps = moveSteps(spec)
      expect(steps.map((s) => [s.state.chain, key(s.state.p!), pts(stackOf(s.state)), s.state.popped ? key(s.state.popped) : null])).toEqual(
        logged.map((m) => [m.chain, key(m.p), pts(m.after), m.kind === 'pop' ? key(m.before[m.before.length - 1]) : null]),
      )
      const order = buildLog(spec).steps.map((s) => s.state.chain)
      expect(order.indexOf('upper')).toBeGreaterThan(order.lastIndexOf('lower'))
      expect(order.slice(-2)).toEqual(['hull', 'hull'])
    }
  })

  it('every turn value is the run’s, and pops exactly where the program’s comparison holds', () => {
    for (const spec of ALL)
      for (const s of moveSteps(spec)) {
        const t = s.state.turn
        if (!t) continue
        expect(t.pops, `${spec.id} ${s.event}`).toBe(popsOn(spec.program.op, t.cross))
        // The answer's cross on the drawn points.
        const [o, a, p] = [t.o, t.a, t.p]
        expect(t.cross).toBe((a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]))
      }
  })

  it('lesson points: asked with (0,0), (1,1) on the lower stack before (2,1); the reveal pops (1,1) on a right turn, cross −1', () => {
    const log = buildLog(lessonPointsSpec)
    const cp = log.checkpoints[0]
    expect(pts(log.steps[cp.beforeStep - 1].state.lower)).toBe('0,0 1,1')
    const r = log.steps[cp.beforeStep].state
    expect([key(r.p!), key(r.popped!), r.turn!.cross, r.turn!.pops]).toEqual(['2,1', '1,1', -1, true])
    expect(cp.answer).toBe('popped')
  })

  it('fence: with < 0 a straight run stays, (1,0) and (2,0) on the fence; with <= 0 both are popped (cross 0)', () => {
    const lt = buildLog(fenceLtSpec)
    const le = buildLog(fenceLeSpec)
    for (const [log, answer, pops] of [
      [lt, 'stays', false],
      [le, 'popped', true],
    ] as const) {
      const cp = log.checkpoints[0]
      expect(pts(log.steps[cp.beforeStep - 1].state.lower)).toBe('0,0 1,0')
      const r = log.steps[cp.beforeStep].state
      expect([key(r.turn!.a), key(r.turn!.p), r.turn!.cross, r.turn!.pops]).toEqual(['1,0', '2,0', 0, pops])
      expect(cp.answer).toBe(answer)
    }
    const out = (log: typeof lt) => JSON.parse(log.observed.log!.at(-1)!) as number[][]
    expect(out(lt).map((p) => p.join(','))).toEqual(expect.arrayContaining(['1,0', '2,0']))
    expect(out(le).map((p) => p.join(','))).not.toEqual(expect.arrayContaining(['1,0']))
    expect(out(le).map((p) => p.join(','))).not.toContain('2,0')
  })

  it('the trim drops each chain’s end, the other chain’s start, and the joined hull is the printed result', () => {
    for (const spec of ALL) {
      const ps = spec.recording.pauses
      const trim = ps[ps.length - 2].vars
      expect(key(trim.upper!.at(-1)!)).toBe(key(trim.lower![0]))
      expect(key(trim.lower!.at(-1)!)).toBe(key(trim.upper![0]))
      const steps = buildLog(spec).steps
      const hull = steps[steps.length - 2].state
      expect(pts(stackOf(hull))).toBe(pts(JSON.parse(spec.recording.stdout[0]) as [number, number][]))
    }
  })

  it.skipIf(absent(fenceLeSpec.program) || absent(fenceLtSpec.program))('the <= program is the answer with only its two turn tests changed', () => {
    const a = textOf(fenceLtSpec.program).split('\n')
    const b = textOf(fenceLeSpec.program).split('\n')
    expect(b).toHaveLength(a.length)
    expect(a.flatMap((l, i) => (l === b[i] ? [] : [i + 1]))).toEqual([...TURN_LINES])
    for (const l of TURN_LINES) expect(b[l - 1]).toBe(a[l - 1].replace('< 0', '<= 0'))
  })
})

// ---------------------------------------------------------------------------
// The harness catches a lying recording or log.
// ---------------------------------------------------------------------------

describe('the truth harness catches a lying recording', () => {
  const p = lessonPointsSpec.program
  const rec = RECORDINGS[p.id]

  it.skipIf(absent(p))(named(p, 'fails when a recorded turn value differs from the real run'), () => {
    const pauses = rec.pauses.map((x, i) => (i === 5 ? { ...x, vars: { ...x.vars, cl: 1 } } : x))
    expect(verifyRecording(p, { ...rec, pauses }, textOf(p)).join('\n')).toMatch(/committed pauses .* differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the program changes without re-recording'), () => {
    const edited = textOf(p).replace('[[0,3],[2,2]', '[[0,3],[2,3]')
    const errors = verifyRecording(p, rec, edited).join('\n')
    expect(errors).toMatch(/program changed/)
    expect(errors).toMatch(/differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the committed output is not what the program prints'), () => {
    expect(verifyRecording({ ...p, observed: ['[[0,0]]'] }, rec, textOf(p)).join('\n')).toMatch(/the program prints/)
  })

  it('refuses to build a pop on a left turn, a push the stack does not show, or a turn with one point on the stack', () => {
    const k = rec.pauses.findIndex((x) => x.probe === 'lower-pop')
    const left = { ...rec, pauses: rec.pauses.map((x, i) => (i === k ? { ...x, vars: { ...x.vars, cl: 3 } } : x)) }
    expect(() => moves(left, '<')).toThrow(/pops on cross 3/)
    const push = rec.pauses.findIndex((x, i) => x.probe === 'lower-push' && rec.pauses[i + 1]?.probe === 'lower-push')
    const lost = { ...rec, pauses: rec.pauses.map((x, i) => (i === push + 1 ? { ...x, vars: { ...x.vars, lower: [] } } : x)) }
    expect(() => moves(lost, '<')).toThrow(/chain is \[\]/)
    const one = rec.pauses.findIndex((x) => x.probe === 'lower-push' && x.vars.lower?.length === 1)
    const ghost = { ...rec, pauses: rec.pauses.map((x, i) => (i === one ? { ...x, vars: { ...x.vars, cl: 2 } } : x)) }
    expect(() => moves(ghost, '<')).toThrow(/turn value with 1 point/)
  })

  it('refuses to read the < run as a <= run (a straight run that did not pop)', () => {
    expect(() => moves(RECORDINGS[fenceLtSpec.program.id], '<=')).toThrow(/keeps|pops/)
  })

  it('fails when a step draws a stack, a turn or a popped point the run never had', () => {
    const log = buildLog(lessonPointsSpec)
    const lie = (i: number, s: Partial<HullState>) => log.steps.map((x, k) => (k === i ? { ...x, state: { ...x.state, ...s } } : x))
    expect(verifyLog({ ...log, steps: lie(4, { lower: [[0, 0], [0, 3], [1, 1]] }) }, lessonPointsSpec).join('\n')).toMatch(/step 4: state/)
    expect(verifyLog({ ...log, steps: lie(5, { turn: { ...log.steps[5].state.turn!, cross: 1, pops: false } }) }, lessonPointsSpec).join('\n')).toMatch(/step 5: state/)
    expect(verifyLog({ ...log, steps: lie(8, { popped: [2, 1] }) }, lessonPointsSpec).join('\n')).toMatch(/step 8: state/)
  })

  it('fails when a preset claims (1,1) survives, or asks after the reveal', () => {
    const log = buildLog(lessonPointsSpec)
    const stays = { ...log, checkpoints: log.checkpoints.map((c) => ({ ...c, answer: 'stays' })) }
    expect(verifyLog(stays, lessonPointsSpec).join('\n')).toMatch(/checkpoints are not the preset's/)
    const late = { ...log, checkpoints: log.checkpoints.map((c) => ({ ...c, beforeStep: c.beforeStep + 1 })) }
    expect(verifyLog(late, lessonPointsSpec).join('\n')).toMatch(/checkpoints are not the preset's/)
  })

  it.skipIf(absent(p))(named(p, 'fails when an answer row slices its line wrong'), () => {
    const display = lessonPointsSpec.display.map((r, i) => (i === 6 && 'wrap' in r ? { ...r, wrap: [r.wrap[0], r.wrap[1] + 2, r.wrap[2]] as const } : r))
    expect(displayProblems(textOf(p).split('\n'), display, { maxCols: 35, blankRows: false }).join('\n')).toMatch(/line 24/)
  })

  it('fails when the output a step shows is not the trace (the shared lint)', () => {
    const log = buildLog(lessonPointsSpec)
    const steps = log.steps.map((s, i) => (i === 4 ? { ...s, state: { ...s.state, output: ['[[0,0]]'] } } : s))
    expect(validateStepLog({ ...log, steps }, hullIntrospection).join('\n')).toMatch(/trace so far is \[\]/)
  })
})
