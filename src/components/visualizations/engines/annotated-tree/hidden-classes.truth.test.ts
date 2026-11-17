// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import { annotatedTreeDescriptor } from './descriptor'
import { layoutShapes } from './layout'
import { MAP_RECORDINGS, hiddenClassData, hiddenClassTransitions, mapAt } from './presets'
import { HIDDEN_CLASS_PROGRAMS, fixedProgram, lateProgram, orderProgram } from './programs/hidden-classes'
import { shapeLabel, shapesPanel, type ShapesPanel } from './shapes'
import { parseDebugPrint, recordMaps, type MapRecording } from './truth/record-maps'

/**
 * The hidden-class trees are V8's own maps, not a drawing: each node is a
 * map `%DebugPrint` printed in a real Node 24 run of the lesson code under
 * `--allow-natives-syntax`, joined by its back pointer, and `%HaveSameMap`
 * is read at the end (the register's verification). With a content
 * checkout this test re-records every program; everywhere it rebuilds the
 * preset from the recording, checks the register's claims and that lies
 * fail.
 */

const missing = HIDDEN_CLASS_PROGRAMS.map((p) => loadProgram(p.source)).find((l) => !l.ok)
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

function fresh(id: string): MapRecording {
  const p = HIDDEN_CLASS_PROGRAMS.find((x) => x.id === id)!
  const loaded = loadProgram(p.source)
  if (!loaded.ok) throw new Error(loaded.missing)
  const { runtime, ...rec } = recordMaps(p, loaded.text)
  expect(runtime).toMatch(/^node@24\./)
  return rec
}

const panel = (id: string) => hiddenClassTransitions.data.panels.find((p) => p.id === id) as ShapesPanel
const leaves = (p: ShapesPanel) => p.nodes.filter((n) => !p.nodes.some((c) => c.parent === n.id))

describe('hidden-class recordings', () => {
  it.skipIf(Boolean(missing)).each(HIDDEN_CLASS_PROGRAMS.map((p) => p.id))('%s: a fresh natives run equals the committed recording', (id) => {
    expect(fresh(id)).toEqual(MAP_RECORDINGS[id])
  })

  it('says why the re-recording skipped (no content checkout)', () => {
    if (missing && !missing.ok) console.info(`hidden classes: re-recording skipped: ${skipNote(missing.missing)}`)
    expect(true).toBe(true)
  })

  it('the preset is its recordings, rebuilt (fresh where the checkout has the code)', () => {
    const rec = { ...MAP_RECORDINGS }
    if (!missing) for (const p of HIDDEN_CLASS_PROGRAMS) rec[p.id] = fresh(p.id)
    expect(hiddenClassData(rec)).toEqual(hiddenClassTransitions.data)
    for (const prog of hiddenClassTransitions.programs) expect(prog.sha256).toBe(rec[prog.id].sha256)
    expect(annotatedTreeDescriptor.presets).toContain(hiddenClassTransitions)
  })
})

describe('hidden-class-transitions (engine-and-runtime)', () => {
  it('the register: %HaveSameMap(obj1, obj2) false before the fix, true after; {x, y} vs {y, x} false', () => {
    expect(panel('late').results).toEqual([{ expr: '%HaveSameMap(obj1, obj2)', value: 'false' }])
    expect(panel('fixed').results).toEqual([{ expr: '%HaveSameMap(obj1, obj2)', value: 'true' }])
    expect(panel('order').results.map((r) => r.value)).toEqual(['true', 'false'])
  })

  it('late properties: {} → {a} → {a, b}, then a fork, obj1 and obj2 on two leaves', () => {
    const p = panel('late')
    expect(p.nodes.map((n) => shapeLabel(n.keys))).toEqual(['{}', '{a}', '{a, b}', '{a, b, c}', '{a, b, d}'])
    expect(leaves(p).map((n) => [shapeLabel(n.keys), n.objects])).toEqual([
      ['{a, b, c}', ['obj1']],
      ['{a, b, d}', ['obj2']],
    ])
    // Both leaves' back pointer is the {a, b} map both objects had right after new.
    const rec = MAP_RECORDINGS[lateProgram.id]
    expect(mapAt(rec, 'obj1-ab', 'obj1')).toBe(mapAt(rec, 'obj2-ab', 'obj2'))
    expect(leaves(p).every((n) => n.parent === mapAt(rec, 'obj1-ab', 'obj1'))).toBe(true)
    expect(p.nodes.some((n) => n.inferred)).toBe(false)
  })

  it('the constructor fix: one path, both objects on one leaf, and a value write adds no node', () => {
    const p = panel('fixed')
    expect(p.nodes.map((n) => shapeLabel(n.keys))).toEqual(['{}', '{a}', '{a, b}', '{a, b, c}', '{a, b, c, d}'])
    expect(leaves(p)).toHaveLength(1)
    expect(leaves(p)[0].objects).toEqual(['obj1', 'obj2'])
    const rec = MAP_RECORDINGS[fixedProgram.id]
    expect(mapAt(rec, 'obj1-before', 'obj1')).toBe(mapAt(rec, 'obj1-after', 'obj1'))
  })

  it('property order: two parents (V8 back pointers differ), so the fork is at the first key', () => {
    const p = panel('order')
    const rec = MAP_RECORDINGS[orderProgram.id].pauses[0].maps
    expect(rec.a.map).toBe(rec.b.map)
    expect(rec.a.parent).not.toBe(rec.c.parent)
    expect(p.nodes.filter((n) => n.inferred).map((n) => shapeLabel(n.keys))).toEqual(['{}', '{x}', '{y}'])
  })

  it('every panel fits 288 px and keeps its labels apart from its boxes', () => {
    for (const p of hiddenClassTransitions.data.panels as ShapesPanel[]) {
      const g = layoutShapes(p)
      const boxes = Object.values(g.boxes)
      for (const b of boxes) expect(b.x >= 0 && b.x + b.w <= g.width, `${p.id}/${b.id} inside`).toBe(true)
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, c] = [boxes[i], boxes[j]]
          expect(a.y !== c.y || a.x + a.w <= c.x || c.x + c.w <= a.x, `${p.id}: ${a.id} and ${c.id} overlap`).toBe(true)
        }
    }
  })
})

describe('lies fail', () => {
  it('a tampered map, a missing back pointer, or a value write that moved the map', () => {
    const rec = clone(MAP_RECORDINGS)
    rec[lateProgram.id].pauses.at(-1)!.maps.obj2.map = rec[lateProgram.id].pauses.at(-1)!.maps.obj1.map
    expect(() => hiddenClassData(rec)).toThrow(/different keys or parents/)
    const moved = clone(MAP_RECORDINGS)
    moved[fixedProgram.id].pauses.find((p) => p.probe === 'obj1-after')!.maps.obj1.map = 'm9'
    expect(() => hiddenClassData(moved)).toThrow(/would lie/)
    const two = clone(MAP_RECORDINGS[lateProgram.id])
    two.pauses[0].maps.this.parent = 'm7'
    expect(() => shapesPanel(two, { id: 'x', heading: '', objects: [], results: [] })).toThrow()
    expect(() => parseDebugPrint('DebugPrint: nothing here')).toThrow(/no map/)
  })
})
