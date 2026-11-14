// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type {
  Claim,
  StaticPreset,
  VerifiedProgram,
} from '../../shell/static-types'
import { recordScopeChains, type Pause } from '../../step-log/scope-probe'
import { recordNodeRun, recordNodeTrace, runtimeMatches, sha256 } from '../../step-log/truth'
import { envRecordsDescriptor, lookupChain } from './descriptor'
import { isFrame, isFunction, isRecord, lookup, resolve, type EnvDiagram, type EnvRecord, type EnvSection } from './model'
import { factoryCallsVsAliases, varVsLetLoop } from './presets/closures'
import { callerIsNotLexicalParent, tdzStopsLookup } from './presets/scope-chain'

/**
 * Truthful by construction (spec P6) for the static environment-records
 * figures: each program the figure draws is run in a fresh Node process, its
 * output must equal the committed log, and every claim derived from the
 * diagram data (values in records, which names share a function, which
 * methods share a binding) is re-checked by running the program with a probe.
 */

function checkClaim(preset: StaticPreset<EnvDiagram>, claim: Claim): string[] {
  const program = preset.programs.find((p) => p.id === claim.program)
  if (!program) return [`${claim.says}: unknown program ${claim.program}`]
  const run = recordNodeTrace(`${program.snippet}\n${claim.probe}`).log
  const extra = run.slice(program.observed.length)
  const errors: string[] = []
  if (
    JSON.stringify(run.slice(0, program.observed.length)) !==
    JSON.stringify(program.observed)
  )
    errors.push(`${claim.says}: program output changed`)
  if (JSON.stringify(extra) !== JSON.stringify(claim.expect))
    errors.push(
      `${claim.says}: probe printed ${JSON.stringify(extra)}, diagram claims ${JSON.stringify(claim.expect)}`,
    )
  return errors
}

function checkProgram(p: VerifiedProgram): string[] {
  const errors: string[] = []
  if (sha256(p.snippet) !== p.sha256)
    errors.push(`${p.id}: snippet changed (sha256 ${sha256(p.snippet)})`)
  const run = recordNodeRun(p.snippet)
  if (run.error !== (p.throws ?? null))
    errors.push(`${p.id}: committed ${p.throws ? `a ${p.throws}` : 'a clean exit'}, real run ${run.error ?? 'exits cleanly'}`)
  if (!runtimeMatches(p.runtime, run.runtime))
    errors.push(`${p.id}: declared ${p.runtime}, ran on ${run.runtime}`)
  if (JSON.stringify(run.log) !== JSON.stringify(p.observed))
    errors.push(
      `${p.id}: committed ${JSON.stringify(p.observed)}, real run ${JSON.stringify(run.log)}`,
    )
  return errors
}

describe.each(envRecordsDescriptor.presets.map((p) => [p.id, p] as const))(
  'environment-records/%s',
  (_id, preset) => {
    it.each(preset.programs.map((p) => [p.id, p] as const))(
      'program %s matches a fresh Node run',
      (_p, program) => {
        expect(checkProgram(program)).toEqual([])
      },
    )

    it('every claim derived from the diagram holds in a real run', () => {
      // A figure with a call stack is also checked by inspector pauses (below).
      const paused = preset.data.sections.some((s) => s.nodes.some(isFrame))
      expect(preset.claims.length + (paused ? 1 : 0)).toBeGreaterThan(0)
      expect(preset.claims.flatMap((c) => checkClaim(preset, c))).toEqual([])
    })

    it('the output drawn under each function is what it logged, and what its environment chain holds', () => {
      for (const section of preset.data.sections) {
        const fns = section.nodes
          .filter(isFunction)
          .filter((f) => f.logs !== undefined)
        if (!fns.length) continue
        const program = preset.programs.find((p) => p.id === section.id)!
        expect(
          fns.map((f) => f.logs),
          section.id,
        ).toEqual(program.observed)
        for (const f of fns) {
          const v = lookup(section, f.id, f.reads ?? '')
          expect(
            v && 'text' in v ? v.text : undefined,
            `${section.id}/${f.id}`,
          ).toBe(f.logs)
        }
      }
    })
  },
)

describe('the traced row is the binding the function really reads (R11)', () => {
  it.each(envRecordsDescriptor.presets.map((p) => [p.id, p] as const))('%s', (_id, preset) => {
    for (const section of preset.data.sections)
      for (const f of section.nodes.filter(isFunction)) {
        // Every function names what it reads, and the lookup finds it on its chain.
        expect(f.reads, `${section.id}/${f.id}`).toBeDefined()
        const v = lookup(section, f.id, f.reads!)
        expect(v && 'text' in v, `${section.id}/${f.id} reads ${f.reads}`).toBe(true)
        // The body really mentions it (the lesson's own code).
        const program = preset.programs.find((p) => p.id === section.id)!
        expect(program.snippet).toMatch(new RegExp(`\\b${f.reads}\\b`))
      }
  })
})

describe('the closures figures say what the lesson verifies', () => {
  it('var logs 3, 3, 3 and let logs 0, 1, 2', () => {
    expect(varVsLetLoop.programs.map((p) => p.observed)).toEqual([
      ['3', '3', '3'],
      ['0', '1', '2'],
    ])
  })

  it('counters are independent and the alias shares counter1', () => {
    const says = factoryCallsVsAliases.claims.map((c) => [c.probe, c.expect])
    expect(says).toContainEqual(['counter1()', ['3']])
    expect(says).toContainEqual(['sameCounter()', ['3']])
    expect(says).toContainEqual(['counter2()', ['2']])
    expect(says).toContainEqual([
      'console.log(sameCounter === counter1, counter2 === counter1)',
      ['true false'],
    ])
  })
})

// ---------------------------------------------------------------------------
// Call stacks and scope chains (the scope-chain figures, R4 verification:
// "inspector Scope panel confirms the chain").
// ---------------------------------------------------------------------------

/** The function name the inspector reports for a drawn frame: the CommonJS module wrapper is anonymous. */
const frameName = (title: string) => (title === 'module' ? '' : title.replace(/\(\)$/, ''))

/** A drawn value as the inspector reports it: a string unquoted, an uninitialized binding as null. */
const inspected = (b: EnvRecord['bindings'][number]) =>
  b.uninitialized ? null : 'text' in b.value ? b.value.text.replace(/^'(.*)'$/, '$1') : undefined

/**
 * Compares a section with pauses at its frames' lines. Per frame: the stack
 * from that frame down is the drawn stack; the scope chain (without the
 * global scope) has one scope per record on the drawn outer chain from the
 * frame's record, and every binding the inspector lists there equals the
 * drawn value. Every drawn binding is confirmed by some pause. The traced
 * read stops at the first scope that has the name, which is the record the
 * drawing resolves it in.
 */
export function checkStack(section: EnvSection, pauses: Pause[]): string[] {
  const errors: string[] = []
  const frames = section.nodes.filter(isFrame)
  const confirmed = new Set<string>()
  frames.forEach((f, i) => {
    const p = pauses.find((x) => x.line === f.line)
    if (!p) return errors.push(`${section.id}/${f.id}: no pause at line ${f.line}`)
    const want = frames.slice(i).map((g) => frameName(g.title[0]))
    if (JSON.stringify(p.stack.slice(0, want.length)) !== JSON.stringify(want))
      errors.push(`${section.id}/${f.id}: stack ${JSON.stringify(p.stack.slice(0, want.length))}, drawn ${JSON.stringify(want)}`)
    const chain = lookupChain(section, f, false).map((id) => section.nodes.find((n) => n.id === id) as EnvRecord)
    const scopes = p.scopes.filter((sc) => sc.type !== 'global')
    if (scopes.length !== chain.length)
      errors.push(`${section.id}/${f.id}: ${scopes.length} scopes (${scopes.map((x) => x.type).join(', ')}), drawn chain of ${chain.length} (${chain.map((r) => r.id).join(', ')})`)
    chain.forEach((rec, d) => {
      const sc = scopes[d]
      if (!sc) return
      for (const b of rec.bindings) {
        if (!(b.name in sc.names)) continue
        if (sc.names[b.name] !== inspected(b))
          errors.push(`${section.id}/${f.id}: ${rec.id}.${b.name} is ${JSON.stringify(sc.names[b.name])} in the inspector, drawn ${JSON.stringify(inspected(b))}`)
        else confirmed.add(`${rec.id}.${b.name}`)
      }
    })
    if (f.reads) {
      const hit = resolve(section, f.id, f.reads)
      const at = scopes.findIndex((sc) => f.reads! in sc.names)
      if (!hit || chain[at]?.id !== hit.record.id)
        errors.push(`${section.id}/${f.id}: ${f.reads} is first found in scope ${at}, drawn in ${hit?.record.id ?? 'nothing'}`)
    }
  })
  for (const r of section.nodes.filter(isRecord))
    for (const b of r.bindings)
      if (!confirmed.has(`${r.id}.${b.name}`)) errors.push(`${section.id}: ${r.id}.${b.name} is confirmed by no pause`)
  return errors
}

const stacked = envRecordsDescriptor.presets.filter((p) => p.data.sections.some((s) => s.nodes.some(isFrame)))

describe.each(stacked.map((p) => [p.id, p] as const))('environment-records/%s: call stack and scope chain', (_id, preset) => {
  it.each(preset.data.sections.map((s) => [s.id, s] as const))(
    'section %s matches inspector pauses at each frame, and the read ends as drawn',
    (_s, section) => {
      const program = preset.programs.find((p) => p.id === section.id)!
      const frames = section.nodes.filter(isFrame)
      const run = recordScopeChains(program.snippet, frames.map((f) => f.line))
      expect(runtimeMatches(program.runtime, run.runtime)).toBe(true)
      expect(checkStack(section, run.pauses)).toEqual([])
      // The traced read's result: what it printed, or the error it threw.
      for (const f of frames.filter((x) => x.reads)) {
        if (f.logs !== undefined) expect(run.stdout).toEqual([f.logs])
        expect(run.error).toBe(f.throws ?? null)
      }
    },
    30_000,
  )
})

describe('the scope-chain figures say what the lesson verifies', () => {
  it('printName logs Global; Exercise 4 throws a ReferenceError with no output', () => {
    expect(callerIsNotLexicalParent.programs[0].observed).toEqual(['Global'])
    expect(tdzStopsLookup.programs[0]).toMatchObject({ observed: [], throws: 'ReferenceError' })
  })

  it("the caller's record is on the stack but not on the read's chain", () => {
    const [caller] = callerIsNotLexicalParent.data.sections
    const read = caller.nodes.find((n) => n.id === 'printName')
    expect(read && isFrame(read) && lookupChain(caller, read, false)).toEqual(['printCall', 'module'])
    const [tdz] = tdzStopsLookup.data.sections
    const r = tdz.nodes.find((n) => n.id === 'read')
    // The search stops at the block's uninitialized x: never reaches read() call, module or caller.
    expect(r && isFrame(r) && lookupChain(tdz, r)).toEqual(['block'])
    expect(resolve(tdz, 'read', 'x')?.binding.uninitialized).toBe(true)
  })

  it('catches a drawing that puts the caller on the chain or draws a wrong value', () => {
    const [section] = callerIsNotLexicalParent.data.sections
    const program = callerIsNotLexicalParent.programs[0]
    const { pauses } = recordScopeChains(program.snippet, [4, 9, 12])
    // Dynamic scope: printName's record linked to shadowName's.
    const dynamic: EnvSection = {
      ...section,
      nodes: section.nodes.map((n) => (n.id === 'printCall' && isRecord(n) ? { ...n, outer: 'shadowCall' } : n)),
    }
    expect(checkStack(dynamic, pauses).join('\n')).toMatch(/drawn chain of 3/)
    const wrong: EnvSection = {
      ...section,
      nodes: section.nodes.map((n) => (n.id === 'module' && isRecord(n) ? { ...n, bindings: [{ name: 'name', value: { text: "'Local'" } }] } : n)),
    }
    expect(checkStack(wrong, pauses).join('\n')).toMatch(/module.name is "Global" in the inspector/)
  }, 30_000)
})

describe('the truth check catches a lying diagram', () => {
  it('fails when a drawn count is wrong', () => {
    const lying = factoryCallsVsAliases.claims.find(
      (c) => c.probe === 'counter2()',
    )!
    expect(
      checkClaim(factoryCallsVsAliases, { ...lying, expect: ['3'] }).join('\n'),
    ).toMatch(/diagram claims/)
  })

  it('fails when the alias is drawn as a second counter', () => {
    const lying = factoryCallsVsAliases.claims.find((c) =>
      c.probe.startsWith('console.log'),
    )!
    expect(
      checkClaim(factoryCallsVsAliases, { ...lying, expect: ['false false'] }),
    ).not.toEqual([])
  })

  it('fails when the var record claims a per-iteration value', () => {
    const lying = varVsLetLoop.claims.find(
      (c) => c.program === 'var' && c.probe === 'fs[0]()',
    )!
    expect(checkClaim(varVsLetLoop, { ...lying, expect: ['0'] })).not.toEqual(
      [],
    )
  })

  it('fails when a program is edited without re-recording', () => {
    const edited = {
      ...varVsLetLoop.programs[0],
      snippet: varVsLetLoop.programs[0].snippet.replace('i < 3', 'i < 4'),
    }
    expect(checkProgram(edited).join('\n')).toMatch(/snippet changed/)
  })
})
