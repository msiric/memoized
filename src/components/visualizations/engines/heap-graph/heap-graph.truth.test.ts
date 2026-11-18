// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Claim, StaticPreset } from '../../shell/static-types'
import { recordNodeTrace, runtimeMatches, sha256 } from '../../step-log/truth'
import { buildPanel, collapse, type PanelSpec } from './build'
import { heapGraphDescriptor } from './descriptor'
import type { HeapDiagram, HeapProgram, HeapRecording } from './model'
import { HEAP_LESSONS } from './programs'
import { dataTypesPanels, identityAliasRebindSpread } from './presets/data-types'
import { objectsPanels, spreadVsNestedVsDeep } from './presets/objects'
import dataTypesRecording from './recordings/data-types.json'
import objectsRecording from './recordings/objects.json'
import { instrument, recordHeap } from './truth/record'

/**
 * Truthful by construction (spec P6) for the heap graphs. Each figure is
 * built from a committed recording of the lesson's own code; this test
 * re-runs everything in fresh Node processes:
 * - each program's output equals the committed output, and the lesson's own
 *   `// value` comments agree with it where the figure draws that line;
 * - a fresh recording equals the committed one (names, objects, identities,
 *   values, results), so the figure cannot drift from the run;
 * - the drawn data is exactly what the fresh recording builds;
 * - the register's verification assertions and the identity claims derived
 *   from the drawing hold when probed after the program.
 */

const SPECS: Record<string, { preset: StaticPreset<HeapDiagram>; panels: PanelSpec[]; recording: Record<string, HeapRecording> }> = {
  'identity-alias-rebind-spread': {
    preset: identityAliasRebindSpread,
    panels: dataTypesPanels,
    recording: dataTypesRecording as unknown as Record<string, HeapRecording>,
  },
  'spread-vs-nested-vs-deep': {
    preset: spreadVsNestedVsDeep,
    panels: objectsPanels,
    recording: objectsRecording as unknown as Record<string, HeapRecording>,
  },
}

function checkClaim(preset: StaticPreset<HeapDiagram>, claim: Claim): string[] {
  const program = preset.programs.find((p) => p.id === claim.program)
  if (!program) return [`${claim.says}: unknown program ${claim.program}`]
  const run = recordNodeTrace(`${program.snippet}\n${claim.probe}`).log
  const errors: string[] = []
  if (JSON.stringify(run.slice(0, program.observed.length)) !== JSON.stringify(program.observed))
    errors.push(`${claim.says}: program output changed`)
  const extra = run.slice(program.observed.length)
  if (JSON.stringify(extra) !== JSON.stringify(claim.expect))
    errors.push(`${claim.says}: probe printed ${JSON.stringify(extra)}, diagram claims ${JSON.stringify(claim.expect)}`)
  return errors
}

function checkProgram(p: HeapProgram): string[] {
  const errors: string[] = []
  if (sha256(p.snippet) !== p.sha256) errors.push(`${p.id}: snippet changed (sha256 ${sha256(p.snippet)})`)
  const run = recordNodeTrace(p.snippet)
  if (!runtimeMatches(p.runtime, run.runtime)) errors.push(`${p.id}: declared ${p.runtime}, ran on ${run.runtime}`)
  if (JSON.stringify(run.log) !== JSON.stringify(p.observed))
    errors.push(`${p.id}: committed ${JSON.stringify(p.observed)}, real run ${JSON.stringify(run.log)}`)
  return errors
}

/** A fresh recording against the committed one: names, objects, identities, values and results. */
function checkRecording(p: HeapProgram, committed: HeapRecording | undefined): string[] {
  if (!committed) return [`${p.id}: no committed recording (yarn viz:heap)`]
  const { runtime: _runtime, ...fresh } = recordHeap(p)
  return JSON.stringify(fresh) === JSON.stringify(committed)
    ? []
    : [`${p.id}: the committed recording differs from a real run; re-record with yarn viz:heap`]
}

/** The value a lesson comment states for `console.log(expr)`: `// 2`, `// Output: 3 (original object is affected)`. */
function commented(snippet: string, expr: string): string | undefined {
  const line = snippet.split('\n').find((l) => l.trim().startsWith(`console.log(${expr})`))
  const m = line?.match(/\/\/\s*(?:Output:\s*)?(\S+)/)
  return m?.[1]
}

describe.each(Object.entries(SPECS))('heap-graph/%s', (_id, { preset, panels, recording }) => {
  it.each(preset.programs.map((p) => [p.id, p as HeapProgram] as const))(
    'program %s matches a fresh Node run, and so does its recording',
    (_p, program) => {
      expect(checkProgram(program)).toEqual([])
      expect(checkRecording(program, recording[program.id])).toEqual([])
    },
  )

  it('the drawing is exactly what a fresh recording builds', () => {
    const fresh = Object.fromEntries(
      (preset.programs as HeapProgram[]).map((p) => {
        const { runtime: _r, ...rec } = recordHeap(p)
        return [p.id, rec]
      }),
    )
    expect(panels.map((s) => buildPanel(s, fresh))).toEqual(preset.data.panels)
  })

  it('every claim derived from the drawing, and the register verification, holds in a real run', () => {
    expect(preset.claims.length).toBeGreaterThan(0)
    expect(preset.claims.flatMap((c) => checkClaim(preset, c))).toEqual([])
  })

  it("names the lesson's own code: headings, the marked change and the results are lines of the program", () => {
    panels.forEach((s, i) => {
      const panel = preset.data.panels[i]
      expect(collapse(s.program.snippet), panel.id).toContain(panel.heading)
      if (panel.emphasis) expect(panel.heading).toContain(panel.emphasis)
      if (panel.changedBy) expect(s.program.snippet.split('\n').map((l) => l.trim())).toContain(panel.changedBy)
      for (const r of panel.results ?? []) {
        // A result is a line the program logs, and the lesson's comment on that line says the recorded value.
        expect(commented(s.program.snippet, r.expr), `${panel.id}: console.log(${r.expr})`).toBe(r.text)
      }
    })
  })

  it("every program is the lesson's own code block, byte for byte (the committed lesson copy)", () => {
    const lesson = preset.id === 'identity-alias-rebind-spread' ? 'data-types' : 'objects'
    const mdx = readFileSync(join(process.cwd(), 'src/app/dev/visualizations/lesson/fixtures', `${lesson}.mdx`), 'utf8')
    for (const p of preset.programs) {
      // A code block inside a list item is indented with the item (objects): any one indentation.
      const found = [0, 2, 4].some((n) =>
        mdx.includes(p.snippet.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n')),
      )
      expect(found, `${lesson}: ${p.id}`).toBe(true)
    }
  })

  it('every program the figure draws is a lesson program the recorder knows', () => {
    const known = Object.values(HEAP_LESSONS).flat()
    for (const p of preset.programs) expect(known).toContain(p)
  })
})

describe('the heap graphs say what the register verifies (Node 24)', () => {
  it('data-types: alias mutation, mutate then rebind, spread shares stats', () => {
    const [alias, rebind, spread] = identityAliasRebindSpread.data.panels
    // Panel 1: both names identify Object A, whose count is 2.
    expect(alias.bindings.map((b) => b.value)).toEqual([{ ref: 'oA' }, { ref: 'oA' }])
    expect(alias.objects[0].rows).toEqual([{ key: 'count', value: { text: '2' } }])
    expect(alias.changed).toEqual({ row: { object: 'oA', key: 'count' } })
    // Panel 2: inside update, original still identifies A (count 2); only record moved, to B (count 99).
    expect(rebind.bindings.map((b) => [b.name, b.value])).toEqual([
      ['original', { ref: 'oA' }],
      ['record', { ref: 'oB' }],
    ])
    expect(rebind.objects.map((o) => o.rows[0].value)).toEqual([{ text: '2' }, { text: '99' }])
    expect(rebind.changed).toEqual({ binding: 'v-record' })
    // Panel 3: two outer objects, one shared stats object.
    const [a, b] = spread.objects
    expect(a.rows.find((r) => r.key === 'stats')!.value).toEqual(b.rows.find((r) => r.key === 'stats')!.value)
    expect(spread.objects).toHaveLength(3)
    const says = identityAliasRebindSpread.claims.map((c) => [c.probe, c.expect])
    expect(says).toContainEqual(['console.log(original.count === 2)', ['true']])
    expect(says).toContainEqual(['console.log(replacement !== original)', ['true']])
    expect(says).toContainEqual(['console.log(copy.stats === original.stats)', ['true']])
  })

  it('objects: shared {c}, a new address only along the rebuilt path, deepClone shares nothing', () => {
    const [shallow, nested, deep] = spreadVsNestedVsDeep.data.panels
    const ref = (p: typeof shallow, obj: string, key: string) => p.objects.find((o) => o.id === obj)!.rows.find((r) => r.key === key)!.value
    expect(ref(shallow, 'oA', 'b')).toEqual(ref(shallow, 'oB', 'b'))
    expect(shallow.objects.find((o) => o.id === 'oC')!.rows).toEqual([{ key: 'c', value: { text: '3' } }])
    expect(ref(nested, 'oA', 'address')).not.toEqual(ref(nested, 'oB', 'address'))
    expect(ref(nested, 'oA', 'name')).toEqual({ text: "'John'" })
    expect(ref(nested, 'oB', 'name')).toEqual({ text: "'John'" })
    expect(ref(nested, 'oC', 'city')).toEqual({ text: "'Anytown'" })
    expect(ref(nested, 'oD', 'city')).toEqual({ text: "'Newtown'" })
    expect(deep.objects).toHaveLength(4)
    expect(new Set(deep.objects.flatMap((o) => o.rows.filter((r) => 'ref' in r.value).map((r) => (r.value as { ref: string }).ref))).size).toBe(2)
    const says = spreadVsNestedVsDeep.claims.map((c) => [c.probe, c.expect])
    expect(says).toContainEqual(['console.log(copy.b === original.b)', ['true']])
    expect(says).toContainEqual(['console.log(updatedPerson.address !== person.address)', ['true']])
    expect(says).toContainEqual(['console.log(person.address.city)', ['Anytown']])
    expect(says).toContainEqual(['console.log(copy !== original, copy.b !== original.b)', ['true true']])
  })

  it('every preset is registered on the one heap-graph id (the reachability presets: reach.truth.test.ts)', () => {
    expect(heapGraphDescriptor.presets.map((p) => p.id)).toEqual(['identity-alias-rebind-spread', 'spread-vs-nested-vs-deep', 'gc-reachability-cycle-and-weak-edge', 'retainer-paths'])
  })
})

describe('the truth check catches a lying figure', () => {
  const spec = SPECS['identity-alias-rebind-spread']

  it('fails when the recording draws the spread copy with its own stats', () => {
    const lying = JSON.parse(JSON.stringify(spec.recording)) as Record<string, HeapRecording>
    const snap = lying.spread.snapshots.spread
    // A fourth object for copy.stats: the "spread copied stats" misconception.
    snap.objects.push({ id: 4, array: false, rows: [['count', { text: '2' }]] })
    snap.objects[1].rows[1][1] = { ref: 4 }
    expect(checkRecording(spec.preset.programs[2] as HeapProgram, lying.spread)).not.toEqual([])
    expect(buildPanel(spec.panels[2], lying)).not.toEqual(spec.preset.data.panels[2])
  })

  it('fails when the rebinding is drawn as reaching the caller', () => {
    const claim = spec.preset.claims.find((c) => c.probe === 'console.log(replacement !== original)')!
    expect(checkClaim(spec.preset, { ...claim, expect: ['false'] })).not.toEqual([])
  })

  it('fails when a program is edited without re-recording', () => {
    const p = spec.preset.programs[0] as HeapProgram
    const edited = { ...p, snippet: p.snippet.replace('alias.count = 2', 'alias.count = 3') }
    expect(checkProgram(edited).join('\n')).toMatch(/snippet changed/)
    expect(checkRecording(edited, spec.recording[p.id])).not.toEqual([])
  })

  it('the probe never changes what the program prints', () => {
    for (const p of Object.values(HEAP_LESSONS).flat()) {
      expect(instrument(p)).toContain(p.snippet.split('\n')[0])
      expect(recordHeap(p).observed).toEqual(p.observed)
    }
  })
})
