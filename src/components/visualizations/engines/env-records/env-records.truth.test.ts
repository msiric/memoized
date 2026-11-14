// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type {
  Claim,
  StaticPreset,
  VerifiedProgram,
} from '../../shell/static-types'
import { recordNodeTrace, runtimeMatches, sha256 } from '../../step-log/truth'
import { envRecordsDescriptor } from './descriptor'
import { isFunction, lookup, type EnvDiagram } from './model'
import { factoryCallsVsAliases, varVsLetLoop } from './presets/closures'

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
  const run = recordNodeTrace(p.snippet)
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
      expect(preset.claims.length).toBeGreaterThan(0)
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
