// @vitest-environment node
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateDescriptor, validateStepLog } from '../../step-log/validate'
import { buildLog, type PresetSpec } from './build'
import { linkedListDescriptor } from './descriptor'
import { linkedListIntrospection, pointerAt, walk, type LLState } from './model'
import { palindromeEvenSpec, palindromeFalseSpec, palindromeOddSpec } from './presets/palindrome'
import { reverseBetweenSpec } from './presets/reverse-between'
import { POINTER_PROGRAMS } from './programs'
import { detectCycleProgram } from './programs/fast-and-slow-pointers'
import { reverseFullProgram } from './programs/linked-list-reversal'
import type { PointerProgram, PointerRecording } from './program'
import { instrument } from './truth/record'
import { verifyLog, verifyRecording } from './truth/verify'
import reversal from './recordings/linked-list-reversal.json'
import lists from './recordings/linked-lists.json'
import fastSlow from './recordings/fast-and-slow-pointers.json'

/**
 * Truthful by construction (spec P6): every pointer state on screen is a
 * probe hit of a real Node 24 run of the lesson's own code. These tests
 * re-run every program, compare the committed recordings, rebuild every
 * log from the fresh recording, and check the register's verification
 * assertions (R4) against the recorded run.
 */

const RECORDINGS = { 'linked-list-reversal': reversal, 'linked-lists': lists, 'fast-and-slow-pointers': fastSlow } as unknown as Record<
  string,
  Record<string, PointerRecording>
>
const recordingOf = (p: PointerProgram) =>
  Object.values(RECORDINGS).find((r) => r[p.id])![p.id]

const SPECS: Record<string, PresetSpec> = {
  'reverse-between-m2-n4': reverseBetweenSpec,
  'palindrome-split-reverse-compare': palindromeOddSpec,
  'palindrome-1221': palindromeEvenSpec,
  'palindrome-1231': palindromeFalseSpec,
}

const programs = Object.values(POINTER_PROGRAMS).flat() as PointerProgram[]

describe.each(programs.map((p) => [p.id, p] as const))('program %s', (_id, p) => {
  it('matches a fresh Node 24 run: hash, plain output, every probe hit', () => {
    expect(verifyRecording(p, recordingOf(p))).toEqual([])
  })

  it('runs the lesson lines untouched: the probes only add lines', () => {
    const out = instrument(p).split('\n')
    let k = 0
    for (const line of p.snippet.split('\n')) {
      while (k < out.length && out[k] !== line) k++
      expect(k, `lost "${line}"`).toBeLessThan(out.length)
      k++
    }
  })
})

describe.each(linkedListDescriptor.presets.map((p) => [p.id, p.log] as const))('linked-list/%s', (id, log) => {
  it('passes the authoring lint and engine invariants', () => {
    expect(validateStepLog(log, linkedListIntrospection)).toEqual([])
  })

  it('is exactly what the builder makes of the recorded run', () => {
    expect(verifyLog(log, SPECS[id])).toEqual([])
  })

  it('shows the lesson function, only reflowed (whitespace aside, every character is the lesson’s)', () => {
    const p = SPECS[id].program
    const lines = p.snippet.split('\n')
    const first = lines.findIndex((l) => l.trim() === p.shown.first.text)
    const fn = lines.slice(first, first + 60).join('\n')
    const shown = log.code!.lines.join('\n').replace(/\s+/g, '')
    expect(fn.replace(/\s+/g, '').startsWith(shown)).toBe(true)
  })
})

describe('pointer-rewiring descriptor', () => {
  it('fits its title and switchers at 320', () => {
    expect(validateDescriptor(linkedListDescriptor)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// The register's verification assertions (R4), on the recorded run.
// ---------------------------------------------------------------------------

const states = (log: { steps: readonly { state: LLState; event: string }[] }) => log.steps.map((s) => s.state)
const values = (s: LLState, order: number[]) => order.map((i) => s.nodes[i].label)

describe('register: linked-list-reversal (reverse-between-m2-n4)', () => {
  const log = buildLog(reverseBetweenSpec)
  const hits = recordingOf(reverseBetweenSpec.program).hits

  it('logs pointer states of the real algorithm, with the temporary 1 <-> 2 cycle after the first flip', () => {
    const flip = hits.find((h) => h.probe === 'flip')!
    expect(flip.next[0]).toBe(1)
    expect(flip.next[1]).toBe(0)
  })

  it('loops 1, 4, 3, 2, 1 after connection.next = previous, the checkpoint’s answer', () => {
    const cp = log.checkpoints[0]
    const reveal = log.steps[cp.beforeStep].state
    const w = walk(reveal, pointerAt(reveal, 'head')!)
    expect(w.loops).toBe(true)
    expect(values(reveal, w.order)).toEqual(['1', '4', '3', '2', '1'])
    // The answer is what follows 2.
    expect(cp.answer).toBe('loop')
    // And the question is asked before it: on the step before, 1 still points to 2.
    expect(log.steps[cp.beforeStep - 1].state.next[0]).toBe(1)
  })

  it('ends 1 4 3 2 5, the lesson’s printed output', () => {
    const end = states(log).at(-1)!
    expect(values(end, walk(end, 0).order)).toEqual(['1', '4', '3', '2', '5'])
    expect(log.observed.log).toEqual(['1', '4', '3', '2', '5'])
  })
})

describe('register: linked-lists (palindrome presets)', () => {
  const slowStop = (spec: PresetSpec) => {
    const log = buildLog(spec)
    const cut = log.steps.find((s) => s.event === 'Cut the list after slow')!.state
    return { log, slow: pointerAt(cut, 'slow')!, cut }
  }

  it('returns true for 1,2,2,1 and 1,2,3,2,1, false for 1,2,3,1 (Node 24)', () => {
    expect(recordingOf(palindromeOddSpec.program).observed).toEqual(['true'])
    expect(recordingOf(palindromeEvenSpec.program).observed).toEqual(['true'])
    expect(recordingOf(palindromeFalseSpec.program).observed).toEqual(['false'])
  })

  it('logs slow, fast, prev and cur after every assignment it draws', () => {
    for (const spec of [palindromeOddSpec, palindromeEvenSpec, palindromeFalseSpec]) {
      const rec = recordingOf(spec.program)
      expect(rec.hits.some((h) => 'slow' in h.vars && 'fast' in h.vars)).toBe(true)
      expect(rec.hits.some((h) => 'prev' in h.vars && 'cur' in h.vars)).toBe(true)
    }
  })

  it('slow stops on 3 for 1,2,3,2,1 (the checkpoint) and on the first 2 for 1,2,2,1', () => {
    const odd = slowStop(palindromeOddSpec)
    expect(odd.slow).toBe(2)
    const cp = odd.log.checkpoints[0]
    expect(cp.choices.find((c) => c.id === cp.answer)!.label).toBe('3')
    // The reveal is the step the loop stops on.
    expect(pointerAt(odd.log.steps[cp.beforeStep].state, 'slow')).toBe(2)

    const even = slowStop(palindromeEvenSpec)
    expect(even.slow).toBe(1)
    const cp2 = even.log.checkpoints[0]
    expect(cp2.choices.find((c) => c.id === cp2.answer)!.label).toBe('1st 2')
    expect(pointerAt(even.log.steps[cp2.beforeStep].state, 'slow')).toBe(1)
  })

  it('cuts after slow and reverses the second half in place (next saved before each flip)', () => {
    const { log, slow } = slowStop(palindromeOddSpec)
    const end = states(log).at(-1)!
    expect(end.next[slow]).toBeNull()
    expect(values(end, walk(end, 4).order)).toEqual(['1', '2'])
    // Every flip step shows t, saved before cur.next changed.
    for (const s of log.steps.filter((x) => x.event.startsWith('Save t'))) expect(pointerAt(s.state, 't')).not.toBeUndefined()
  })
})

describe('register: fast-and-slow-pointers (floyd-rho data)', () => {
  const rec = recordingOf(detectCycleProgram)
  const v = (i: number | null) => (i === null ? 'null' : rec.labels[i])

  it('phase 1 visits (2,3) (3,5) (4,3) (5,5); phase 2 meets at 3', () => {
    const phase1 = rec.hits.filter((h) => h.probe === 'stride').map((h) => `(${v(h.vars.slow)},${v(h.vars.fast)})`)
    expect(phase1).toEqual(['(2,3)', '(3,5)', '(4,3)', '(5,5)'])
    const phase2 = rec.hits.filter((h) => h.probe === 'reset' || h.probe === 'walk').map((h) => `(${v(h.vars.pointer1)},${v(h.vars.pointer2)})`)
    expect(phase2).toEqual(['(1,5)', '(2,6)', '(3,3)'])
    expect(rec.observed).toEqual(['3'])
  })

  it('is the register’s rho: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 3 (a = 2, c = 4, b = 2, a = c - b)', () => {
    const next = rec.hits[0].next
    expect(next).toEqual([1, 2, 3, 4, 5, 2])
    const a = 2
    const c = 4
    const b = 2
    expect(a).toBe(c - b)
  })
})

describe('register: full reversal (full-reversal-strip data)', () => {
  const rec = recordingOf(reverseFullProgram)
  it('flips exactly one arrow per pass and prints 5 4 3 2 1', () => {
    const passes = rec.hits.filter((h) => h.probe === 'iteration')
    expect(passes).toHaveLength(5)
    let before = rec.hits.find((h) => h.probe === 'init')!.next
    for (const h of passes) {
      expect(h.next.filter((t, i) => t !== before[i])).toHaveLength(1)
      before = h.next
    }
    expect(rec.observed).toEqual(['5', '4', '3', '2', '1'])
  })
})

// ---------------------------------------------------------------------------
// The harness catches a lying recording or log.
// ---------------------------------------------------------------------------

describe('the truth harness catches a lying recording', () => {
  const p = reverseBetweenSpec.program
  const rec = recordingOf(p)

  it('fails when a recorded pointer differs from the real run', () => {
    const hits = rec.hits.map((h, i) => (i === 2 ? { ...h, vars: { ...h.vars, current: 3 } } : h))
    expect(verifyRecording(p, { ...rec, hits }).join('\n')).toMatch(/committed hits .* differs from a real run/)
  })

  it('fails when a recorded arrow differs from the real run', () => {
    const hits = rec.hits.map((h, i) => (i === 5 ? { ...h, next: [1, 2, 3, 4, null] } : h))
    expect(verifyRecording(p, { ...rec, hits }).join('\n')).toMatch(/differs from a real run/)
  })

  it('fails when the snippet changes without re-recording', () => {
    const edited = { ...p, snippet: p.snippet.replace('new ListNode(5);', 'new ListNode(6);') }
    const errors = verifyRecording(edited, rec).join('\n')
    expect(errors).toMatch(/snippet changed/)
    expect(errors).toMatch(/differs from a real run/)
  })

  it('fails when the committed output is not what the program prints', () => {
    expect(verifyRecording({ ...p, observed: ['1', '2', '3', '4', '5'] }, rec).join('\n')).toMatch(/the program prints/)
  })

  it('fails when a step draws a pointer or an arrow the run never had', () => {
    const log = buildLog(reverseBetweenSpec)
    const steps = log.steps.map((s, i) =>
      i === 6 ? { ...s, state: { ...s.state, next: s.state.next.map((t, k) => (k === 1 ? 2 : t)) } } : s,
    )
    expect(verifyLog({ ...log, steps }, reverseBetweenSpec).join('\n')).toMatch(/step 6: state .* is not the recorded/)
    const moved = log.steps.map((s, i) =>
      i === 3 ? { ...s, state: { ...s.state, pointers: s.state.pointers.map((x) => (x.name === 'tail' ? { ...x, at: 2 } : x)) } } : s,
    )
    expect(verifyLog({ ...log, steps: moved }, reverseBetweenSpec).join('\n')).toMatch(/step 3: state/)
  })

  it('fails when the code shown is not the lesson’s beyond whitespace', () => {
    const display = reverseBetweenSpec.display.map((l) => l.replace('n - m + 1', 'n - m'))
    expect(() => buildLog({ ...reverseBetweenSpec, display })).toThrow(/differs from the lesson code beyond whitespace/)
  })

  it('fails when the output a step shows is not the trace (the shared lint)', () => {
    const log = buildLog(reverseBetweenSpec)
    const steps = log.steps.map((s, i) => (i === 4 ? { ...s, state: { ...s.state, output: ['1'] } } : s))
    expect(validateStepLog({ ...log, steps }, linkedListIntrospection).join('\n')).toMatch(/trace so far is \[\]/)
  })
})

// ---------------------------------------------------------------------------
// Local only (premium lessons are never committed): the snippets are the
// lesson's code blocks, byte for byte, in a local content checkout.
// ---------------------------------------------------------------------------

const CONTENT = path.join(process.cwd(), 'src', 'content', 'dsa-track')
const lesson = (rel: string) => path.join(CONTENT, rel)
const blocks = (file: string) => [...fs.readFileSync(file, 'utf8').matchAll(/```(?:javascript|typescript)\n([\s\S]*?)```/g)].map((m) => m[1])

describe.skipIf(!fs.existsSync(lesson('common-techniques/linked-list-reversal/page.mdx')))('byte identity with the local lessons', () => {
  it('reverseBetween and the full reversal are the lesson’s JavaScript blocks', () => {
    const b = blocks(lesson('common-techniques/linked-list-reversal/page.mdx'))
    const rb = reverseBetweenSpec.program.snippet
    expect(rb.endsWith(b[2].replace(/\n$/, ''))).toBe(true)
    expect(b[0].startsWith(rb.split('\n\n')[0])).toBe(true)
    expect(reverseFullProgram.snippet).toBe(b[0].replace(/\n$/, ''))
  })

  it('detectCycle is the lesson’s JavaScript block (the function, before its example)', () => {
    const b = blocks(lesson('common-techniques/fast-and-slow-pointers/page.mdx'))
    const fn = b[2].split('// Example usage:')[0].replace(/\n+$/, '')
    expect(detectCycleProgram.snippet).toContain(fn)
    expect(b[0].startsWith(detectCycleProgram.snippet.split('\n\n')[0])).toBe(true)
  })

  it('isPalindrome is the practice answer, byte for byte', () => {
    const file = lesson('user-defined-data-structures/_lessons.json')
    const all = JSON.parse(fs.readFileSync(file, 'utf8')).lessons.flatMap((l: { problems: { id: string; answer: string }[] }) => l.problems)
    const answer: string = all.find((q: { id: string }) => q.id === 'palindrome-linked-list').answer
    const code = answer.match(/```typescript\n([\s\S]*?)```/)![1]
    const [comment, fn] = code.split('*/\n\n')
    for (const spec of [palindromeOddSpec, palindromeEvenSpec, palindromeFalseSpec]) {
      expect(spec.program.snippet).toContain(fn.replace(/\n$/, ''))
      // The harness class is the answer's own comment, uncommented.
      const cls = comment.split('\n').slice(2, -1).map((l) => l.slice(3)).join('\n')
      expect(spec.program.snippet.startsWith(cls)).toBe(true)
    }
  })
})
