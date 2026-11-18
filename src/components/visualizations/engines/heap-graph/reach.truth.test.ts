// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { layoutDiagram } from './layout'
import type { HeapPanel } from './model'
import { buildReachPanel, goneIds } from './reach-build'
import { MEMORY_LEAKS_PROGRAMS, MEMORY_MANAGEMENT_PROGRAMS, type ReachProgram } from './reach-programs'
import { ML_RECORDINGS, MM_RECORDINGS, closurePanel, gcReachabilityCycleAndWeakEdge, leaksPanels, managementPanels, retainerPaths } from './presets/memory'
import { recordGc, type GcRecording } from './truth/record-gc'

/**
 * The reachability figures are recordings: roots, objects, links (weak or
 * strong) and what a full collection freed come from real runs (Node 24 with
 * --expose-gc; Chromium with V8's --expose-gc for the DOM answers). With a
 * local content checkout every block's sha256 is checked and every program
 * re-recorded; everywhere the figures are rebuilt from the recordings, the
 * register's verification is checked on them, and lies must fail. Nothing
 * about GC timing is asserted: only what survives forced full collections.
 */

const ALL: ReachProgram[] = [...MEMORY_MANAGEMENT_PROGRAMS, ...MEMORY_LEAKS_PROGRAMS]
const recOf = (id: string) => MM_RECORDINGS[id] ?? ML_RECORDINGS[id]
const missing = ALL.map((p) => loadProgram(p.source)).find((l) => !l.ok)
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** The kinds a snapshot recorded, by object number. */
const kinds = (rec: GcRecording, snap: string) => new Map(rec.snapshots[snap].objects.map((o) => [o.id, o.kind]))
const deadKinds = (rec: GcRecording, snap: string) => rec.dead.filter((n) => kinds(rec, snap).has(n)).map((n) => kinds(rec, snap).get(n)).sort()

/** The register's verification, read from the recordings: what the figures may claim. */
function verification(r: Record<string, GcRecording>): string[] {
  const e: string[] = []
  const held = r['cycle-held']
  if (deadKinds(held, 'held').length) e.push('cycle-held: something was collected while registry holds node2')
  if (JSON.stringify(deadKinds(r['cycle-cleared'], 'cleared')) !== JSON.stringify(['Node', 'Node'])) e.push('cycle-cleared: the detached cycle was not collected')
  const registry = r['cycle-cleared'].snapshots.cleared.roots[0][1]
  if ('ref' in registry && r['cycle-cleared'].dead.includes(registry.ref)) e.push('cycle-cleared: registry itself was collected')
  if (JSON.stringify(deadKinds(r['weak-key-dropped'], 'after')) !== JSON.stringify(['Object', 'Object'])) e.push('weak-key-dropped: the key and its value did not die together')
  const dom = r['dom-cache']
  const div = dom.snapshots.removed.objects.find((o) => o.kind === 'div')
  if (!div || div.children?.count !== 100 || [div.id, ...div.children.ids].some((n) => dom.dead.includes(n))) e.push('dom-cache: the panel and its 100 li were not all retained by the cache')
  if (deadKinds(r['dom-weak-held'], 'removed').length) e.push('dom-weak-held: the panel was collected while keys holds the key')
  if (JSON.stringify(deadKinds(r['dom-weak-freed'], 'freed')) !== JSON.stringify(['Object', 'div'])) e.push('dom-weak-freed: the key and the panel were not collected after keys.delete')
  const huge = (k: string) => r[k].snapshots.scope.objects.find((o) => o.size !== undefined)!
  if (r['closure-shared'].dead.includes(huge('closure-shared').id)) e.push('closure-shared: huge was collected though a sibling closure reads it')
  if (!r['closure-no-timer'].dead.includes(huge('closure-no-timer').id)) e.push('closure-no-timer: an unreferenced huge was retained')
  return e
}

describe('reach recordings', () => {
  it.skipIf(Boolean(missing)).each(ALL.map((p) => p.id))('%s: a fresh run equals the committed recording', async (id) => {
    const p = ALL.find((x) => x.id === id)!
    const loaded = loadProgram(p.source)
    if (!loaded.ok) throw new Error(loaded.missing)
    const { runtime, ...fresh } = await recordGc(loaded.text, p)
    expect(runtime).toMatch(p.env === 'node' ? /^node@24\./ : /^chromium@/)
    expect(fresh).toEqual(recOf(id))
  }, 60_000)

  it('says why the re-recording skipped (no content checkout)', () => {
    if (missing && !missing.ok) console.info(`reach: re-recording skipped: ${skipNote(missing.missing)}`)
    expect(true).toBe(true)
  })

  it('both figures are their recordings, rebuilt', () => {
    expect(managementPanels.map((s) => buildReachPanel(s, MM_RECORDINGS))).toEqual(gcReachabilityCycleAndWeakEdge.data.panels)
    expect([...leaksPanels.map((s) => buildReachPanel(s, ML_RECORDINGS)), closurePanel(ML_RECORDINGS['closure-shared'])]).toEqual(retainerPaths.data.panels)
    for (const preset of [gcReachabilityCycleAndWeakEdge, retainerPaths])
      for (const prog of preset.programs) expect(prog.sha256).toBe(recOf(prog.id).sha256)
  })
})

describe('the register verification', () => {
  const panels = [...gcReachabilityCycleAndWeakEdge.data.panels, ...retainerPaths.data.panels]
  const p = (id: string): HeapPanel => panels.find((x) => x.id === id)!

  it('holds in the recordings', () => {
    expect(verification({ ...MM_RECORDINGS, ...ML_RECORDINGS })).toEqual([])
  })

  it('every greyed object is one the collection freed, and every freed drawn object is greyed', () => {
    for (const spec of [...managementPanels, ...leaksPanels]) {
      const rec = recOf(spec.program.id)
      const snap = rec.snapshots[spec.snapshot]
      const freed = snap.objects.filter((o) => rec.dead.includes(o.id)).length
      expect(goneIds(p(spec.id)).length, spec.id).toBe(freed)
    }
    // The closure panel: huge is drawn live because the run kept it.
    expect(p('context').objects.find((o) => o.id === 'huge')!.gone).toBeUndefined()
  })

  it('the cycle the refcount would leak: each node greyed with rc 1; the weak key is a dashed link', () => {
    const cleared = p('cleared')
    expect(cleared.objects.filter((o) => o.gone).map((o) => o.badge)).toEqual(['rc 1', 'rc 1'])
    const weak = p('weak')
    const map = weak.objects.find((o) => o.title[0].startsWith('WeakMap'))!
    expect(map.rows.map((r) => [r.key, 'ref' in r.value && Boolean(r.value.weak)])).toEqual([
      ['key', true],
      ['value', false],
    ])
    expect(weak.objects.filter((o) => o.gone).length).toBe(2)
  })

  it('the marked link is the one that still retains: cache, keys, the shared context', () => {
    expect(p('cache').changed).toEqual({ edge: expect.stringMatching(/^ref:o1\.'panel'$/) })
    expect(p('weak-held').changed).toEqual({ edge: expect.stringMatching(/'panel'$/) })
    expect(p('context').changed).toEqual({ edge: 'ref:handler.context' })
  })

  it('lies fail: a kept cycle, a retained unreferenced huge, a panel kept after keys.delete', () => {
    const kept = clone({ ...MM_RECORDINGS, ...ML_RECORDINGS })
    kept['cycle-cleared'].dead = []
    expect(verification(kept).join('\n')).toMatch(/detached cycle was not collected/)
    const huge = clone({ ...MM_RECORDINGS, ...ML_RECORDINGS })
    huge['closure-no-timer'].dead = []
    expect(verification(huge).join('\n')).toMatch(/unreferenced huge was retained/)
    const panel = clone({ ...MM_RECORDINGS, ...ML_RECORDINGS })
    panel['dom-weak-freed'].dead = []
    expect(verification(panel).join('\n')).toMatch(/not collected after keys\.delete/)
    // A greyed object the run kept cannot be built: the panel follows the recording.
    const wrong = clone(MM_RECORDINGS)
    wrong['cycle-held'].dead = [2]
    expect(goneIds(buildReachPanel(managementPanels[0], wrong))).toEqual(['o2'])
  })

  it('both figures lay out at every variant width', () => {
    for (const preset of [gcReachabilityCycleAndWeakEdge, retainerPaths])
      for (const v of ['narrow', 'wide'] as const) expect(() => layoutDiagram(preset.data, v)).not.toThrow()
  })
})
