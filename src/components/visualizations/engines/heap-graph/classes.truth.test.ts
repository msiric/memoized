// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadProgram, skipNote } from '../../step-log/lesson-block'
import type { TreeRecording } from '../annotated-tree/programs/types'
import { recordTree } from '../annotated-tree/truth/record'
import { recordedGraph } from './proto-build'
import { describeProto } from './proto-descriptor'
import { layoutProto, twoColumns } from './proto-layout'
import { spineOf, type ProtoPanel } from './proto-model'
import { CLASS_PROGRAMS } from './proto-programs'
import { CLASS_RECORDINGS, classData, extendsTwoChains, superThisIsRex } from './presets/classes'

/**
 * Objects and Classes, `extends-two-chains`: every object, link and lookup is
 * read in the paused frame of a real Node 24 run (the annotated-tree
 * recorder). With a local content checkout the blocks' sha256s are checked
 * and both programs re-recorded; everywhere the figure is rebuilt from the
 * recording, the register's verification is checked on the recording itself
 * (getPrototypeOf identities, `this === rex` inside the parent's speak during
 * `super.speak()`), and lies must fail.
 */

const missing = CLASS_PROGRAMS.map((p) => loadProgram(p.source)).find((l) => !l.ok)

function fresh(id: string): TreeRecording {
  const p = CLASS_PROGRAMS.find((x) => x.id === id)!
  const loaded = loadProgram(p.source)
  if (!loaded.ok) throw new Error(loaded.missing)
  const { runtime, ...rec } = recordTree(p, loaded.text)
  expect(runtime).toMatch(/^node@24\./)
  return rec
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
const panel = (id: string): ProtoPanel => extendsTwoChains.data.panels.find((p) => p.id === id)!

/** The register's verification, read from a recording's graph: what the figure may claim. */
function verification(rec: Record<string, TreeRecording>): string[] {
  const errors: string[] = []
  const proto = (prog: string, label: string) => {
    const o = recordedGraph(rec[prog], prog).objects.find((x) => x.label === label)
    return o?.proto && 'ref' in o.proto ? o.proto.ref : (o?.proto ?? 'absent')
  }
  if (proto('extends', 'Dog') !== 'Animal') errors.push('Object.getPrototypeOf(Dog) is not Animal')
  if (proto('extends', 'Dog.prototype') !== 'Animal.prototype') errors.push('Object.getPrototypeOf(Dog.prototype) is not Animal.prototype')
  if (proto('extends', 'Animal') !== 'Function.prototype') errors.push('Object.getPrototypeOf(Animal) is not Function.prototype')
  if (proto('manual', 'Car') !== 'Function.prototype') errors.push('Object.getPrototypeOf(Car) is not Function.prototype')
  if (proto('manual', 'Car.prototype') !== 'Vehicle.prototype') errors.push('Object.getPrototypeOf(Car.prototype) is not Vehicle.prototype')
  if (!superThisIsRex(rec)) errors.push('this is not rex inside super.speak()')
  return errors
}

describe('class recordings', () => {
  it.skipIf(Boolean(missing)).each(CLASS_PROGRAMS.map((p) => p.id))('%s: a fresh Node 24 run equals the committed recording', (id) => {
    expect(fresh(id)).toEqual(CLASS_RECORDINGS[id])
  })

  it('says why the re-recording skipped (no content checkout)', () => {
    if (missing && !missing.ok) console.info(`classes: re-recording skipped: ${skipNote(missing.missing)}`)
    expect(true).toBe(true)
  })

  it('the figure is its recording, rebuilt (fresh where the checkout has the code)', () => {
    const rec = { ...CLASS_RECORDINGS }
    if (!missing) for (const p of CLASS_PROGRAMS) rec[p.id] = fresh(p.id)
    expect(classData(rec)).toEqual(extendsTwoChains.data)
    for (const prog of extendsTwoChains.programs) {
      expect(prog.sha256).toBe(rec[prog.id].sha256)
      expect(prog.observed).toEqual(rec[prog.id].stdout)
    }
  })
})

describe('extends-two-chains', () => {
  it("the register's verification holds in the recording", () => {
    expect(verification(CLASS_RECORDINGS)).toEqual([])
  })

  it('two chains with extends: rex → Dog.prototype → Animal.prototype → Object.prototype, and Dog → Animal → Function.prototype → Object.prototype', () => {
    const p = panel('extends')
    expect(spineOf(p).map((o) => o.id)).toEqual(['rex', 'Dog.prototype', 'Animal.prototype', 'Object.prototype'])
    const byId = new Map(p.objects.map((o) => [o.id, o]))
    expect(['Dog', 'Animal', 'Function.prototype'].map((id) => byId.get(id)!.proto)).toEqual(['Animal', 'Function.prototype', 'Object.prototype'])
  })

  it('one chain by hand: Car → Function.prototype, no link to a Vehicle function', () => {
    const p = panel('manual')
    expect(p.objects.find((o) => o.id === 'Car')!.proto).toBe('Function.prototype')
    expect(p.objects.some((o) => o.id === 'Vehicle')).toBe(false)
    expect(spineOf(p).map((o) => o.id)).toEqual(['myCar', 'Car.prototype', 'Vehicle.prototype', 'Object.prototype'])
  })

  it('the super mark: the hop from Dog.prototype to Animal.prototype and the speak row there, nothing else', () => {
    const s = layoutProto(extendsTwoChains.data).panels[0]
    expect(s.edges.filter((e) => e.changed).map((e) => e.id)).toEqual(['proto:Dog.prototype'])
    const marked = s.boxes.flatMap((b) => b.rows.filter((r) => r.changed).map((r) => `${b.id}.${r.key}`))
    expect(marked).toEqual(['Animal.prototype.speak'])
    expect(describeProto(extendsTwoChains.data).parts[0].lines.join(' ')).toMatch(/super\.speak .*starts at Animal\.prototype, the \[\[Prototype\]\] of Dog\.prototype, and finds speak on Animal\.prototype/)
  })

  it('the drawing: every link is one of the three kinds, constructor links run down their own column, nothing overlaps', () => {
    const cols = twoColumns(extendsTwoChains.data)
    expect(cols.width).toBeLessThanOrEqual(291)
    for (const s of layoutProto(extendsTwoChains.data).panels) {
      const rects = [...s.boxes.map((b) => ({ id: b.id, ...b.rect })), { id: 'null', ...s.nullRect }]
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i]
          const b = rects[j]
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          expect(apart, `${s.id}: ${a.id} overlaps ${b.id}`).toBe(true)
        }
      for (const r of rects) expect(r.x + r.w, `${s.id}: ${r.id} leaves the panel`).toBeLessThanOrEqual(s.width + 0.5)
      expect(s.edges.every((e) => ['proto', 'prototype', 'constructor'].includes(e.kind))).toBe(true)
    }
  })

  it('lies fail: Car linked to Vehicle, Dog to Function.prototype, this not rex, a super start that is not the home object', () => {
    const vehicle = clone(CLASS_RECORDINGS)
    const car = recordedGraph(vehicle.manual, 'manual').objects.find((o) => o.label === 'Car')!
    car.proto = { ref: 'Vehicle' }
    expect(verification(vehicle).join('\n')).toMatch(/getPrototypeOf\(Car\) is not Function\.prototype/)
    const dog = clone(CLASS_RECORDINGS)
    recordedGraph(dog.extends, 'extends').objects.find((o) => o.label === 'Dog')!.proto = { ref: 'Function.prototype' }
    expect(verification(dog).join('\n')).toMatch(/getPrototypeOf\(Dog\) is not Animal/)
    const notRex = clone(CLASS_RECORDINGS)
    notRex.extends.pauses.find((p) => p.probe === 'super')!.vars.thisIsRex = false
    expect(() => classData(notRex)).toThrow(/this === rex/)
    const moved = clone(CLASS_RECORDINGS)
    recordedGraph(moved.extends, 'extends').objects.find((o) => o.label === 'Dog.prototype')!.proto = { ref: 'Object.prototype' }
    expect(() => classData(moved)).toThrow(/is not the \[\[Prototype\]\] of Dog\.prototype/)
  })
})
