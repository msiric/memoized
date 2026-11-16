// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote, type LoadedProgram } from '../../step-log/lesson-block'
import { displayProblems, isAnswerSource } from '../../step-log/lesson-source'
import { sha256 } from '../../step-log/truth'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import { buildLog, iterations, type PresetSpec } from './build'
import { slidingWindowDescriptor } from './descriptor'
import { swIntrospection, windowLength, windowText } from './model'
import type { WindowProgram, WindowRecording } from './program'
import { kDistinctIfSpec, kDistinctWhileSpec } from './presets/k-distinct'
import { setShrinkAbbaIfSpec, setShrinkAbbaSpec, setShrinkAbcabcbbSpec, setShrinkPwwkewSpec } from './presets/set-shrink'
import { WINDOW_PROGRAMS } from './programs'
import { SET_SHRINK_CHECKS, setShrinkSource } from './programs/strings'
import { runPlain } from './truth/record'
import { verifyLog, verifyRecording } from './truth/verify'
import kRecordings from './recordings/sliding-window.json'
import sRecordings from './recordings/strings.json'

/**
 * Truthful by construction (spec P6): every edge, count, member and length
 * on screen is a pause of a real Node 24 run of the lesson's own code, under
 * the inspector. The code is premium lesson text, never committed: with a
 * local content checkout these tests check each block's sha256, re-run every
 * program, compare the committed recordings and check every pane row against
 * the program. Without one (CI) those tests skip, saying why; the rest
 * (rebuilding every log from the committed recordings, the register's
 * verification assertions (R4), the `if` variants' wrong answers and the
 * lies that must fail) run everywhere.
 */

const RECORDINGS = { ...kRecordings, ...sRecordings } as unknown as Record<string, WindowRecording>

const SPECS: Record<string, PresetSpec> = {
  'araaci-k2': kDistinctWhileSpec,
  'araaci-k2-if': kDistinctIfSpec,
  'set-shrink-longest-substring': setShrinkPwwkewSpec,
  'set-shrink-abcabcbb': setShrinkAbcabcbbSpec,
  'set-shrink-abba': setShrinkAbbaSpec,
  'set-shrink-abba-if': setShrinkAbbaIfSpec,
}

const programs = Object.values(WINDOW_PROGRAMS).flat() as WindowProgram[]

/** Each program as run, from the local content checkout (or why it is absent). */
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
  it.skipIf(absent(p))(named(p, 'is the lesson blocks it names (sha256) and matches a fresh Node 24 run: plain output, every pause'), () => {
    expect(verifyRecording(p, RECORDINGS[p.id], textOf(p))).toEqual([])
  })

  it('commits no solution code: the harness is calls and a blank line, a variant one keyword, the recording values only', () => {
    for (const part of p.source) {
      if ('code' in part) expect(part.code).toMatch(/^(|console\.log\(lengthOfLongestSubstring\("[a-z]*"\)\);)$/)
      else if (part.replace) expect(part.replace).toEqual(['while', 'if'])
    }
    const rec = RECORDINGS[p.id]
    expect(Object.keys(rec).sort()).toEqual(['observed', 'pauses', 'sha256'])
    for (const pause of rec.pauses) for (const k of Object.keys(pause.vars)) expect(Object.keys(p.watch)).toContain(k)
  })
})

describe.each(slidingWindowDescriptor.presets.map((p) => [p.id, p.log] as const))('sliding-window/%s', (id, log) => {
  const spec = SPECS[id]

  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(log, swIntrospection)).toEqual([])
  })

  it('is exactly what the builder makes of the recorded run', () => {
    expect(verifyLog(log, spec)).toEqual([])
  })

  it.skipIf(absent(spec.program))(named(spec.program, 'shows the lesson function, only reflowed (whitespace aside, every character is the lesson’s)'), () => {
    expect(displayProblems(textOf(spec.program).split('\n'), spec.display, { maxCols: 35, blankRows: false })).toEqual([])
  })

  it('commits a practice answer only as rows without text, a lesson example as its rows', () => {
    const answer = isAnswerSource(spec.program.source)
    for (const r of spec.display) expect('wrap' in r, `${id} row ${r.src}`).toBe(answer)
    expect(Boolean(log.code?.premium)).toBe(answer)
    expect(log.source.snippet).toBeUndefined()
  })

  it('asks every question on the step before its reveal, never after the answer is drawn', () => {
    for (const cp of log.checkpoints) expect(cp.beforeStep).toBeGreaterThanOrEqual(1)
  })
})

describe('sliding-window descriptor', () => {
  it('fits its title and switchers at 320', () => {
    expect(validateDescriptor(slidingWindowDescriptor)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The register's verification assertions (R4), on the recorded runs.
// ---------------------------------------------------------------------------

const recordOf = (spec: PresetSpec, right: number) => iterations(spec.program, spec.recording).find((it) => it.right === right)!

describe('register: sliding-window (araaci, K = 2, while vs if)', () => {
  const log = buildLog(kDistinctWhileSpec)

  it('end 4 leaves start 2 with {a: 2, c: 1}; end 5 leaves start 4 with {c: 1, i: 1}; result 4 (Node 24)', () => {
    const at4 = recordOf(kDistinctWhileSpec, 4).settled.vars
    expect([at4.left, at4.store]).toEqual([2, [['a', 2], ['c', 1]]])
    const at5 = recordOf(kDistinctWhileSpec, 5).settled.vars
    expect([at5.left, at5.store]).toEqual([4, [['c', 1], ['i', 1]]])
    expect(kDistinctWhileSpec.recording.observed).toEqual(['4'])
    expect(log.steps.at(-1)!.state.best).toBe(4)
  })

  it('draws every shrink pass as its own step: two when c arrives, two when i arrives', () => {
    const shrinks = (right: number) => log.steps.filter((s) => s.event.startsWith('Drop') && s.state.right === right)
    expect(shrinks(4).map((s) => s.state.left)).toEqual([1, 2])
    expect(shrinks(5).map((s) => s.state.left)).toEqual([3, 4])
  })

  it('asks where windowStart stops with the window still over K, and reveals 2 with 2 keys', () => {
    const cp = log.checkpoints[0]
    const asked = log.steps[cp.beforeStep - 1].state
    expect([asked.left, asked.store.length]).toEqual([1, 3])
    const reveal = log.steps[cp.beforeStep].state
    expect(cp.choices.find((c) => c.id === cp.answer)!.label).toBe(String(reveal.left))
    expect([reveal.left, reveal.store.length]).toEqual([2, 2])
  })

  it('never records an invalid window with while', () => {
    for (const s of log.steps.filter((x) => x.event.startsWith('Record') || x.event.startsWith('Count') && !x.event.includes('over K')))
      expect(s.state.store.length).toBeLessThanOrEqual(s.state.k!)
  })

  // The `if` variant really is the broken shrink the preset says it is.
  it('with if: one pass leaves 3 keys at end 4 and the record takes the invalid window "raac"', () => {
    const iff = buildLog(kDistinctIfSpec)
    const rec4 = iff.steps.find((s) => s.event.startsWith('Record') && s.state.right === 4)!.state
    expect(windowText(rec4)).toBe('raac')
    expect(rec4.store.length).toBeGreaterThan(rec4.k!)
    const rec5 = iff.steps.find((s) => s.event.startsWith('Record') && s.state.right === 5)!.state
    expect(rec5.store.length).toBeGreaterThan(rec5.k!)
    // At most one pass per iteration: the left edge never moves twice for one end.
    for (const it of iterations(kDistinctIfSpec.program, kDistinctIfSpec.recording)) expect(it.shrinks.length).toBeLessThanOrEqual(1)
  })

  it('with if: the run still returns 4, which the preset predicts and says (the window never grows while invalid)', () => {
    expect(kDistinctIfSpec.recording.observed).toEqual(['4'])
    const iff = buildLog(kDistinctIfSpec)
    expect(iff.checkpoints[0].choices.find((c) => c.id === iff.checkpoints[0].answer)!.value).toBe('4')
    // Its window keeps its width from end 4 on: 4 every record.
    expect(iff.steps.filter((s) => s.event.startsWith('Record')).map((s) => windowLength(s.state))).toEqual([4, 4])
  })

  it.skipIf(absent(kDistinctIfSpec.program))(named(kDistinctIfSpec.program, 'the if program is the lesson’s with one keyword changed, on line 13'), () => {
    const a = textOf(kDistinctWhileSpec.program).split('\n')
    const b = textOf(kDistinctIfSpec.program).split('\n')
    expect(b).toHaveLength(a.length)
    const diff = a.flatMap((l, i) => (l === b[i] ? [] : [i + 1]))
    expect(diff).toEqual([13])
    expect(b[12]).toBe(a[12].replace('while', 'if'))
  })
})

describe('register: strings (set-shrink-longest-substring: pwwkew, abcabcbb, abba with if)', () => {
  const check = (id: string) => SET_SHRINK_CHECKS.find((c) => c.id === id)!

  it('lengthOfLongestSubstring("abcabcbb", "pwwkew", "") = 3, 3, 0 (Node 24)', () => {
    expect(setShrinkAbcabcbbSpec.recording.observed).toEqual(['3'])
    expect(setShrinkPwwkewSpec.recording.observed).toEqual(['3'])
    expect(check('while-empty').observed).toEqual(['0'])
  })

  it('pwwkew: at j = 2 the left edge moves two cells (p, then the old w) and the window is "w" at index 2', () => {
    const log = buildLog(setShrinkPwwkewSpec)
    const deletes = log.steps.filter((s) => s.event.match(/^(j reads|Delete)/) && s.state.right === 2)
    expect(deletes.map((s) => s.state.left)).toEqual([1, 2])
    const added = log.steps.find((s) => s.event.startsWith('Add w') && s.state.right === 2)!.state
    expect([added.left, windowText(added)]).toEqual([2, 'w'])
  })

  it('pwwkew: asks what leaves first before j reads w, and the reveal deletes p (s[i]), not the repeat', () => {
    const log = buildLog(setShrinkPwwkewSpec)
    const cp = log.checkpoints[0]
    const asked = log.steps[cp.beforeStep - 1].state
    expect([asked.right, windowText(asked)]).toEqual([1, 'pw'])
    const reveal = log.steps[cp.beforeStep].state
    expect(reveal.store.map((e) => e.key)).toEqual(['w'])
    expect(cp.answer).toBe('p')
  })

  it('abcabcbb: j = 6 deletes two characters, and the question is asked between them', () => {
    const log = buildLog(setShrinkAbcabcbbSpec)
    const at6 = log.steps.flatMap((s, i) => (s.event.match(/^(j reads|Delete)/) && s.state.right === 6 ? [i] : []))
    expect(at6).toHaveLength(2)
    expect(log.checkpoints[0].beforeStep).toBe(at6[1])
    expect(log.steps[at6[1]].state.left).toBe(5)
  })

  it('logs (i, j, ss, ans) at every iteration and draws each one (the frames are the pauses)', () => {
    for (const spec of [setShrinkPwwkewSpec, setShrinkAbcabcbbSpec, setShrinkAbbaSpec, setShrinkAbbaIfSpec]) {
      const its = iterations(spec.program, spec.recording)
      expect(its.map((it) => it.right)).toEqual([...spec.recording.pauses[0].vars.s!].map((_, j) => j))
      const log = buildLog(spec)
      for (const it of its) {
        const grow = log.steps.find((s) => s.event.startsWith('Add') && s.state.right === it.right)!.state
        expect([grow.left, grow.store.map((e) => e.key), grow.best]).toEqual([it.settled.vars.left, it.settled.vars.store, it.bestAfter])
      }
    }
  })

  // The `if` variant really gives the wrong answers the visual claims, and the right one where it says so.
  it('with if: abba returns 3, a wrong answer (while returns 2); pwwkew 4 (wrong, 3 is right); abcabcbb 3 and "" 0', () => {
    expect(setShrinkAbbaIfSpec.recording.observed).toEqual(['3'])
    expect(setShrinkAbbaSpec.recording.observed).toEqual(['2'])
    expect(check('if-pwwkew').observed).toEqual(['4'])
    expect(check('if-abcabcbb').observed).toEqual(['3'])
    expect(check('if-empty').observed).toEqual(['0'])
    const log = buildLog(setShrinkAbbaIfSpec)
    expect(log.checkpoints[0].choices.find((c) => c.id === log.checkpoints[0].answer)!.value).toBe('3')
    expect(log.steps.at(-1)!.why).toMatch(/while version returns 2/)
  })

  it('with if: the record that makes 3 counts a window holding a repeat ss no longer sees', () => {
    const log = buildLog(setShrinkAbbaIfSpec)
    const last = log.steps.filter((s) => s.event.startsWith('Add')).at(-1)!.state
    expect(windowText(last)).toBe('bba')
    expect(last.store.map((e) => e.key).sort()).toEqual(['a', 'b'])
    expect(last.best).toBe(3)
  })

  for (const c of SET_SHRINK_CHECKS) {
    const loaded = loadProgram(c.source)
    it.skipIf(!loaded.ok)(`${c.id}: the committed output is a fresh Node 24 run${loaded.ok ? '' : ` (skipped: ${skipNote(loaded.missing)})`}`, () => {
      if (!loaded.ok) return
      expect(sha256(loaded.text)).toBe(c.sha256)
      expect(runPlain({ id: c.id, lang: 'ts' } as WindowProgram, loaded.text)).toEqual(c.observed)
    })
  }

  const abbaIf = setShrinkSource('abba', 'if')
  const abba = setShrinkSource('abba', 'while')
  const both = [loadProgram(abba), loadProgram(abbaIf)] as const
  it.skipIf(!both[0].ok || !both[1].ok)('the if answer is the answer with one keyword changed, on line 5', () => {
    const [a, b] = both.map((l) => (l.ok ? l.text.split('\n') : []))
    expect(a.flatMap((l, i) => (l === b[i] ? [] : [i + 1]))).toEqual([5])
    expect(b[4]).toBe(a[4].replace('while', 'if'))
  })
})

// ---------------------------------------------------------------------------
// The harness catches a lying recording or log.
// ---------------------------------------------------------------------------

describe('the truth harness catches a lying recording', () => {
  const p = kDistinctWhileSpec.program
  const rec = RECORDINGS[p.id]

  it.skipIf(absent(p))(named(p, 'fails when a recorded edge differs from the real run'), () => {
    const pauses = rec.pauses.map((x, i) => (i === 14 ? { ...x, vars: { ...x.vars, left: 3 } } : x))
    expect(verifyRecording(p, { ...rec, pauses }, textOf(p)).join('\n')).toMatch(/committed pauses .* differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the program changes without re-recording'), () => {
    const edited = textOf(p).replace('"araaci"', '"araacc"')
    const errors = verifyRecording(p, rec, edited).join('\n')
    expect(errors).toMatch(/program changed/)
    expect(errors).toMatch(/differs from a real run/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the committed output is not what the program prints'), () => {
    expect(verifyRecording({ ...p, observed: ['5'] }, rec, textOf(p)).join('\n')).toMatch(/the program prints/)
  })

  it('fails when a step draws an edge or a count the run never had', () => {
    const log = buildLog(kDistinctWhileSpec)
    const moved = log.steps.map((s, i) => (i === 7 ? { ...s, state: { ...s.state, left: 3 } } : s))
    expect(verifyLog({ ...log, steps: moved }, kDistinctWhileSpec).join('\n')).toMatch(/step 7: state/)
    const counted = log.steps.map((s, i) => (i === 6 ? { ...s, state: { ...s.state, store: s.state.store.map((e) => ({ ...e, count: 9 })) } } : s))
    expect(verifyLog({ ...log, steps: counted }, kDistinctWhileSpec).join('\n')).toMatch(/step 6: state/)
  })

  it('fails when a preset claims the if variant returns what it does not', () => {
    const log = buildLog(setShrinkAbbaIfSpec)
    const lie = { ...log, checkpoints: log.checkpoints.map((c) => ({ ...c, answer: 'two' })) }
    expect(validateStepLog(lie, swIntrospection).join('\n')).toMatch(/answer "2" is not the run's last output \("3"\)/)
  })

  it.skipIf(absent(p))(named(p, 'fails when the code shown is not the lesson’s beyond whitespace'), () => {
    const display = kDistinctWhileSpec.display.map((r) => ('text' in r ? { ...r, text: r.text.replace('> K', '>= K') } : r))
    expect(displayProblems(textOf(p).split('\n'), display, { maxCols: 35, blankRows: false }).join('\n')).toMatch(/is not the next part of/)
  })

  it.skipIf(absent(setShrinkPwwkewSpec.program))(named(setShrinkPwwkewSpec.program, 'fails when an answer row slices its line wrong'), () => {
    const display = setShrinkPwwkewSpec.display.map((r, i) => (i === 1 && 'wrap' in r ? { ...r, wrap: [r.wrap[0], r.wrap[1] + 2, r.wrap[2]] as const } : r))
    expect(displayProblems(textOf(setShrinkPwwkewSpec.program).split('\n'), display, { maxCols: 35, blankRows: false }).join('\n')).toMatch(/line 1/)
  })

  it('fails when the output a step shows is not the trace (the shared lint)', () => {
    const log = buildLog(kDistinctWhileSpec)
    const steps = log.steps.map((s, i) => (i === 4 ? { ...s, state: { ...s.state, output: ['4'] } } : s))
    expect(validateStepLog({ ...log, steps }, swIntrospection).join('\n')).toMatch(/trace so far is \[\]/)
  })
})
