// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote, type LoadedProgram } from '../../step-log/lesson-block'
import { displayProblems, isAnswerSource } from '../../step-log/lesson-source'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import { buildLog, itemRuns, type PresetSpec } from './build'
import { dpTableDescriptor } from './descriptor'
import { dpIntrospection, reachable } from './model'
import { knapsackDownSpec, knapsackUpSpec } from './presets/knapsack-1d'
import { DP_PROGRAMS } from './programs'
import { UP_SWAPS } from './programs/dynamic-programming'
import type { DpProgram, DpRecording } from './programs/types'
import { verifyLog, verifyRecording } from './truth/verify'
import recordings from './recordings/dynamic-programming.json'

/**
 * Truthful by construction (spec P6): every cell, item and index on screen
 * is a pause of a real Node 24 run of the practice answer's own code, under
 * the inspector. The code is premium text, never committed: with a local
 * content checkout these tests check the block's sha256, re-run both
 * programs, compare the committed recordings and check every pane row
 * against the program. Without one (CI) those tests skip, saying why; the
 * rest (rebuilding every log from the committed recordings, the register's
 * verification assertions (R4), the upward variant's wrong answer and the
 * lies that must fail) run everywhere.
 */

const RECORDINGS = recordings as unknown as Record<string, DpRecording>
const SPECS: Record<string, PresetSpec> = {
  'knapsack-1d-desc-vs-asc': knapsackDownSpec,
  'knapsack-1d-asc': knapsackUpSpec,
}
const programs = Object.values(DP_PROGRAMS).flat() as DpProgram[]

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

  it('commits no solution code: the harness is one call and a blank line, a variant only short token swaps, the recording values only', () => {
    for (const part of p.source) {
      if ('code' in part) expect(part.code).toMatch(/^(|console\.log\(canPartition\(\[1,2,5\]\)\);)$/)
      else {
        expect(part.replace).toBeUndefined()
        if (part.swaps) {
          expect(part.swaps).toEqual(UP_SWAPS)
          for (const [from, to] of part.swaps) expect(Math.max(from.length, to.length)).toBeLessThanOrEqual(4)
        }
      }
    }
    const rec = RECORDINGS[p.id]
    expect(Object.keys(rec).sort()).toEqual(['generator', 'pauses', 'sha256', 'stdout'])
    for (const pause of rec.pauses) for (const k of Object.keys(pause.vars)) expect(Object.keys(p.watch)).toContain(k)
  })
})

describe.each(dpTableDescriptor.presets.map((p) => [p.id, p.log] as const))('dp-table-dependencies/%s', (id, log) => {
  const spec = SPECS[id]

  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(log, dpIntrospection)).toEqual([])
  })

  it('is exactly what the builder makes of the recorded run', () => {
    expect(verifyLog(log, spec)).toEqual([])
  })

  it.skipIf(absent(spec.program))(named(spec.program, 'shows the answer’s lines, only reflowed (whitespace aside, every character is the answer’s)'), () => {
    expect(
      displayProblems(textOf(spec.program).split('\n'), spec.display, {
        maxCols: 35,
        blankRows: false,
      }),
    ).toEqual([])
  })

  it('commits the practice answer only as rows without text', () => {
    expect(isAnswerSource(spec.program.source)).toBe(true)
    for (const r of spec.display) expect('wrap' in r, `${id} row ${r.src}`).toBe(true)
    expect(log.code?.premium).toBeTruthy()
    expect(log.code!.lines.join('')).toMatch(/^[·\s]*$/)
    expect(log.source.snippet).toBeUndefined()
  })

  it('asks every question on the step before its reveal, never after the answer is drawn', () => {
    for (const cp of log.checkpoints) expect(cp.beforeStep).toBeGreaterThanOrEqual(1)
  })
})

describe('dp-table descriptor', () => {
  it('fits its title and switchers at 320', () => {
    expect(validateDescriptor(dpTableDescriptor)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The register's verification assertions (R4), on the recorded runs.
// ---------------------------------------------------------------------------

const writes = (spec: PresetSpec) => buildLog(spec).steps.filter((s) => s.state.j !== null)
const afterItem = (spec: PresetSpec, x: number) =>
  buildLog(spec)
    .steps.filter((s) => s.state.x === x)
    .at(-1)!.state

describe('register: dynamic-programming (knapsack-1d-desc-vs-asc, [1, 2, 5], target 4)', () => {
  it('canPartition: false counting down, true counting up (Node 24)', () => {
    expect(knapsackDownSpec.recording.stdout).toEqual(['false'])
    expect(knapsackUpSpec.recording.stdout).toEqual(['true'])
  })

  it('down: after x = 1 {0, 1}; after x = 2 {0, 1, 2, 3}; x = 5 writes nothing; f[4] is false', () => {
    expect(reachable(afterItem(knapsackDownSpec, 1).f)).toEqual([0, 1])
    expect(reachable(afterItem(knapsackDownSpec, 2).f)).toEqual([0, 1, 2, 3])
    const five = itemRuns(knapsackDownSpec.recording).find((r) => r.x === 5)!
    expect(five.writes).toEqual([])
    expect(buildLog(knapsackDownSpec).steps.at(-1)!.state.f[4]).toBe(false)
  })

  it('every frame is a logged write: one step per write, j and the table after it from the run', () => {
    for (const spec of [knapsackDownSpec, knapsackUpSpec]) {
      const logged = itemRuns(spec.recording).flatMap((r) => r.writes.map((w) => ({ x: r.x, j: w.pause.vars.j, f: w.after })))
      expect(writes(spec).map((s) => ({ x: s.state.x, j: s.state.j, f: s.state.f }))).toEqual(logged)
      expect(logged).toHaveLength(7)
    }
  })

  it('every write reads j - x and the arrow comes from that cell; down never reads a cell its item wrote, up does', () => {
    for (const s of writes(knapsackDownSpec)) {
      expect(s.state.read).toBe(s.state.j! - s.state.x!)
      expect(s.state.pass).not.toContain(s.state.read)
    }
    const reuses = writes(knapsackUpSpec).filter((s) => s.state.pass.includes(s.state.read!))
    expect(reuses.map((s) => [s.state.x, s.state.j])).toEqual([
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 4],
    ])
  })

  it('up: asks before x = 1 reaches j = 2, f[1] already set for this item; the reveal sets f[2] true and f[4] ends true', () => {
    const log = buildLog(knapsackUpSpec)
    const cp = log.checkpoints[0]
    const asked = log.steps[cp.beforeStep - 1].state
    expect([asked.x, asked.j, asked.f[1]]).toEqual([1, 1, true])
    const reveal = log.steps[cp.beforeStep].state
    expect([reveal.j, reveal.read, reveal.f[2], reveal.pass.includes(1)]).toEqual([2, 1, true, true])
    expect(cp.choices.find((c) => c.id === cp.answer)!.label).toBe(String(reveal.f[2]))
    expect(log.steps.at(-1)!.state.f[4]).toBe(true)
    expect(log.steps.at(-1)!.why).toMatch(/^Wrong/)
  })

  it('down: the end prediction is the printed result', () => {
    const log = buildLog(knapsackDownSpec)
    const cp = log.checkpoints[0]
    expect(cp.verdict).toBe('end')
    expect(cp.choices.find((c) => c.id === cp.answer)!.value).toBe('false')
  })

  it('the words say reuse exactly where the run reads a cell its item wrote', () => {
    for (const spec of [knapsackDownSpec, knapsackUpSpec]) {
      const steps = buildLog(spec).steps
      steps.forEach((s, i) => {
        if (s.state.j === null) return
        const reused = s.state.pass.includes(s.state.read!)
        const turned = !steps[i - 1].state.f[s.state.j] && s.state.f[s.state.j]
        expect(/counted twice/.test(s.why), s.event).toBe(turned && reused)
      })
    }
  })

  it.skipIf(absent(canUp()) || absent(canDown()))('the up program is the answer with only line 10 changed, its loop header counting up', () => {
    const a = textOf(canDown()).split('\n')
    const b = textOf(canUp()).split('\n')
    expect(b).toHaveLength(a.length)
    expect(a.flatMap((l, i) => (l === b[i] ? [] : [i + 1]))).toEqual([10])
    // Line 10's header with the swaps applied in order: the bounds traded and the comparison and step turned around.
    expect(b[9]).toBe(UP_SWAPS.reduce((l, [from, to]) => l.replace(from, to), a[9]))
    expect(b[9]).not.toBe(a[9])
  })
})

function canDown() {
  return knapsackDownSpec.program
}
function canUp() {
  return knapsackUpSpec.program
}

// ---------------------------------------------------------------------------
// The harness catches a lying recording or log.
// ---------------------------------------------------------------------------

describe('the truth harness catches a lying recording', () => {
  const p = knapsackDownSpec.program
  const rec = RECORDINGS[p.id]

  it.skipIf(absent(p))(named(p, 'fails when a recorded cell differs from the real run'), () => {
    const pauses = rec.pauses.map((x, i) => (i === 6 ? { ...x, vars: { ...x.vars, f: [true, true, true, false, false] } } : x))
    expect(verifyRecording(p, { ...rec, pauses }, textOf(p)).join('\n')).toMatch(/committed pauses .* differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the program changes without re-recording'), () => {
    const edited = textOf(p).replace('[1,2,5]', '[1,3,4]')
    const errors = verifyRecording(p, rec, edited).join('\n')
    expect(errors).toMatch(/program changed/)
    expect(errors).toMatch(/differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the committed output is not what the program prints'), () => {
    expect(verifyRecording({ ...p, observed: ['true'] }, rec, textOf(p)).join('\n')).toMatch(/the program prints/)
  })

  it('fails when a step draws a cell, a read or a bar the run never had', () => {
    const log = buildLog(knapsackDownSpec)
    const set = log.steps.map((s, i) => (i === 3 ? { ...s, state: { ...s.state, f: s.state.f.map(() => true) } } : s))
    expect(verifyLog({ ...log, steps: set }, knapsackDownSpec).join('\n')).toMatch(/step 3: state/)
    const read = log.steps.map((s, i) => (i === 5 ? { ...s, state: { ...s.state, read: 0 } } : s))
    expect(verifyLog({ ...log, steps: read }, knapsackDownSpec).join('\n')).toMatch(/step 5: state/)
    const bar = log.steps.map((s, i) => (i === 6 ? { ...s, state: { ...s.state, pass: [...s.state.pass, 3] } } : s))
    expect(verifyLog({ ...log, steps: bar }, knapsackDownSpec).join('\n')).toMatch(/step 6: state/)
  })

  it('fails when a preset claims the upward loop returns what it does not', () => {
    const log = buildLog(knapsackDownSpec)
    const lie = {
      ...log,
      checkpoints: log.checkpoints.map((c) => ({ ...c, answer: 'yes' })),
    }
    expect(validateStepLog(lie, dpIntrospection).join('\n')).toMatch(/answer "true" is not the run's last output \("false"\)/)
  })

  it.skipIf(absent(p))(named(p, 'fails when an answer row slices its line wrong'), () => {
    const display = knapsackDownSpec.display.map((r, i) => (i === 1 && 'wrap' in r ? { ...r, wrap: [r.wrap[0], r.wrap[1] + 2, r.wrap[2]] as const } : r))
    expect(
      displayProblems(textOf(p).split('\n'), display, {
        maxCols: 35,
        blankRows: false,
      }).join('\n'),
    ).toMatch(/line 7/)
  })

  it('fails when the output a step shows is not the trace (the shared lint)', () => {
    const log = buildLog(knapsackDownSpec)
    const steps = log.steps.map((s, i) => (i === 4 ? { ...s, state: { ...s.state, output: ['false'] } } : s))
    expect(validateStepLog({ ...log, steps }, dpIntrospection).join('\n')).toMatch(/trace so far is \[\]/)
  })

  it('a swap that does not occur exactly once refuses to compose', async () => {
    const { composeProgram } = await import('../../step-log/lesson-source')
    const src = [
      {
        block: { path: 'x', heading: 'h', lang: 'js' },
        lessonSha256: '',
        swaps: [['zz', 'yy']] as const,
      },
    ]
    expect(() => composeProgram(src, () => 'let a = b >= c')).toThrow(/occurs 0 times/)
  })
})
