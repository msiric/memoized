// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import type { TreeRecording } from '../annotated-tree/programs/types'
import { recordTree } from '../annotated-tree/truth/record'
import { buildProtoPanel, recordedGraph } from './proto-build'
import { describeProto } from './proto-descriptor'
import { layoutProto } from './proto-layout'
import { spineOf, type ProtoPanel } from './proto-model'
import { PROTOTYPE_PROGRAMS } from './proto-programs'
import { PROTO_RECORDINGS, constructorData, constructorFix, constructorPanels, lookupAndShadowing, lookupData, lookupPanels } from './presets/prototypes'

/**
 * The prototype object graph is a recording, not a drawing: every object,
 * own property, [[Prototype]] link and lookup path is read in the paused
 * frame of a real Node 24 run of the lesson code (the annotated-tree
 * recorder). With a local content checkout this test checks each block's
 * sha256 and re-records every program; everywhere it rebuilds both presets
 * from the recording, checks the register's verification (the
 * getPrototypeOf chain, hasOwn, `.constructor` identity before and after
 * the fix) and that lies fail.
 */

const missing = PROTOTYPE_PROGRAMS.map((p) => loadProgram(p.source)).find((l) => !l.ok)

function fresh(id: string): TreeRecording {
  const p = PROTOTYPE_PROGRAMS.find((x) => x.id === id)!
  const loaded = loadProgram(p.source)
  if (!loaded.ok) throw new Error(loaded.missing)
  const { runtime, ...rec } = recordTree(p, loaded.text)
  expect(runtime).toMatch(/^node@24\./)
  return rec
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const panel = (d: { panels: ProtoPanel[] }, id: string) => d.panels.find((p) => p.id === id)!

describe('prototype recordings', () => {
  it.skipIf(Boolean(missing)).each(PROTOTYPE_PROGRAMS.map((p) => p.id))('%s: a fresh Node 24 run equals the committed recording', (id) => {
    expect(fresh(id)).toEqual(PROTO_RECORDINGS[id])
  })

  it('says why the re-recording skipped (no content checkout)', () => {
    if (missing && !missing.ok) console.info(`prototypes: re-recording skipped: ${skipNote(missing.missing)}`)
    expect(true).toBe(true)
  })

  it('both presets are their recordings, rebuilt (fresh where the checkout has the code)', () => {
    const rec = { ...PROTO_RECORDINGS }
    if (!missing) for (const p of PROTOTYPE_PROGRAMS) rec[p.id] = fresh(p.id)
    expect(lookupData(rec)).toEqual(lookupAndShadowing.data)
    expect(constructorData(rec)).toEqual(constructorFix.data)
    for (const preset of [lookupAndShadowing, constructorFix])
      for (const prog of preset.programs) {
        expect(prog.sha256).toBe(rec[prog.id].sha256)
        expect(prog.observed).toEqual(rec[prog.id].stdout)
      }
  })
})

describe('lookup-and-shadowing', () => {
  const inherited = panel(lookupAndShadowing.data, 'inherited')
  const shadowed = panel(lookupAndShadowing.data, 'shadowed')

  it('the getPrototypeOf chain: alice → Person.prototype → Object.prototype → null', () => {
    expect([...spineOf(inherited).map((o) => o.id), 'null']).toEqual(['alice', 'Person.prototype', 'Object.prototype', 'null'])
    expect(spineOf(inherited).at(-1)!.proto).toBeNull()
  })

  it('three distinct links: [[Prototype]] down the spine, Person.prototype, Person.prototype.constructor', () => {
    const s = layoutProto(lookupAndShadowing.data).panels[0]
    const kinds = Object.groupBy(s.edges, (e) => e.kind)
    expect(kinds.proto!.map((e) => `${e.from}>${e.to}`)).toEqual(['alice>Person.prototype', 'Person.prototype>Object.prototype', 'Object.prototype>null'])
    expect(kinds.prototype!.map((e) => `${e.from}>${e.to}`)).toEqual(['Person>Person.prototype'])
    expect(kinds.constructor!.map((e) => `${e.from}>${e.to}`)).toEqual(['Person.prototype>Person'])
    // A property arrow starts at a dot; the internal [[Prototype]] link does not.
    expect(kinds.proto!.every((e) => !e.dot)).toBe(true)
    expect([...kinds.prototype!, ...kinds.constructor!].every((e) => e.dot)).toBe(true)
  })

  it('hasOwn: toString is on none but Object.prototype; the lookup marks both links and that row', () => {
    expect(inherited.lookup).toEqual({ from: 'alice', key: 'toString', visited: ['alice', 'Person.prototype', 'Object.prototype'], found: 'Object.prototype' })
    const s = layoutProto(lookupAndShadowing.data).panels[0]
    expect(s.edges.filter((e) => e.changed).map((e) => e.id)).toEqual(['proto:alice', 'proto:Person.prototype'])
    expect(s.boxes.flatMap((b) => b.rows.filter((r) => r.changed).map((r) => `${b.id}.${r.key}`))).toEqual(['Object.prototype.toString'])
    expect(inherited.results).toEqual([{ expr: 'alice.toString()', text: '[object Object]' }])
    // The recording's own lookups, the ones not drawn, agree: sayHello one link up, name own.
    const g = recordedGraph(PROTO_RECORDINGS.person, 'person')
    expect(g.lookups.find((l) => l.key === 'sayHello')!.visited).toEqual([['alice', false], ['Person.prototype', true]])
    expect(g.lookups.find((l) => l.key === 'name')!.visited).toEqual([['alice', true]])
  })

  it('Object.prototype owns 12 properties: one drawn, 11 counted', () => {
    const op = inherited.objects.find((o) => o.id === 'Object.prototype')!
    expect(op.rows.map((r) => r.key)).toEqual(['toString'])
    expect(op.hidden).toBe(11)
    expect(shadowed.objects.find((o) => o.id === 'Object.prototype')!.hidden).toBe(12)
  })

  it('shadowing: dog owns sound, so the lookup stops at dog; after delete the prototype answers', () => {
    expect(shadowed.lookup).toEqual({ from: 'dog', key: 'sound', visited: ['dog'], found: 'dog' })
    expect(shadowed.objects.find((o) => o.id === 'animal')!.rows).toEqual([{ key: 'sound', value: { text: "'silent'" } }])
    expect(shadowed.results.map((r) => r.text)).toEqual(['bark', 'silent'])
    expect(layoutProto(lookupAndShadowing.data).panels[1].edges.filter((e) => e.changed)).toEqual([])
  })
})

describe('constructor-fix', () => {
  const before = panel(constructorFix.data, 'before')
  const after = panel(constructorFix.data, 'after')

  it('before the fix: Child.prototype owns nothing, child.constructor is Parent (found on Parent.prototype)', () => {
    expect(before.objects.find((o) => o.id === 'Child.prototype')!.rows).toEqual([])
    expect(before.lookup).toEqual({ from: 'child', key: 'constructor', visited: ['child', 'Child.prototype', 'Parent.prototype'], found: 'Parent.prototype' })
    expect(recordedGraph(PROTO_RECORDINGS['constructor-before'], 'b').lookups[0].value).toEqual({ ref: 'Parent' })
    expect(constructorFix.programs[0].observed).toEqual(['false'])
  })

  it('after the fix: Child.prototype owns constructor → Child; the chain is unchanged', () => {
    expect(after.objects.find((o) => o.id === 'Child.prototype')!.rows).toEqual([{ key: 'constructor', value: { ref: 'Child' } }])
    expect(after.lookup!.found).toBe('Child.prototype')
    expect(spineOf(after).map((o) => o.id)).toEqual(spineOf(before).map((o) => o.id))
    expect(constructorFix.programs[1].observed).toEqual(['true'])
    // The assignment makes an enumerable property; the built-in one is not (recorded, in the text alternative's terms).
    const g = recordedGraph(PROTO_RECORDINGS['constructor-after'], 'a')
    expect(g.objects.find((o) => o.label === 'Child.prototype')!.keys[0][2]).toBe(true)
    expect(g.objects.find((o) => o.label === 'Parent.prototype')!.keys[0][2]).toBe(false)
  })

  it('the text alternative names every link and the lookup', () => {
    const alt = describeProto(constructorFix.data)
    expect(alt.parts[0].lines).toContain('Marked lookup of child.constructor: child, then Child.prototype have no own constructor; found on Parent.prototype.')
    expect(alt.parts[1].lines).toContain('Child.prototype: constructor → Child (dashed arrow).')
  })
})

describe('lies fail', () => {
  it('a row the run never recorded, an undrawn [[Prototype]], or a constructor beside the wrong object', () => {
    const rec = clone(PROTO_RECORDINGS)
    expect(() => buildProtoPanel({ ...lookupPanels[0], show: { ...lookupPanels[0].show, alice: ['age'] } }, rec)).toThrow(/no own age/)
    expect(() => buildProtoPanel({ ...lookupPanels[0], show: { alice: 'all', Person: ['prototype'] } }, rec)).toThrow(/not drawn/)
    // A tampered recording: Child.prototype claiming an own constructor before the fix.
    const g = recordedGraph(rec['constructor-before'], 'b')
    g.objects.find((o) => o.label === 'Child.prototype')!.keys.push(['constructor', { ref: 'Child' }, false])
    expect(buildProtoPanel(constructorPanels[0], rec)).not.toEqual(panel(constructorFix.data, 'before'))
    // A tampered lookup that says toString is own on alice.
    const t = clone(PROTO_RECORDINGS)
    recordedGraph(t.person, 'p').lookups[0].visited = [['alice', true]]
    expect(() => buildProtoPanel(lookupPanels[0], t)).toThrow(/whose row is not drawn/)
  })
})
