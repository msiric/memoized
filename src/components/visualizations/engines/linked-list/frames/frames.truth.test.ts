// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { detectCycleProgram } from '../programs/fast-and-slow-pointers'
import { reverseFullProgram } from '../programs/linked-list-reversal'
import { loadProgram } from '../../../step-log/lesson-block'
import type { PointerRecording } from '../program'
import fastSlow from '../recordings/fast-and-slow-pointers.json'
import reversal from '../recordings/linked-list-reversal.json'
import { recordPointers } from '../truth/record'
import { linkedListFramesDescriptor } from './descriptor'
import type { RhoPanel } from './model'
import { floydData, floydRho, fullReversalData, fullReversalStrip } from './presets'

/**
 * The static frames are rebuilt from a fresh Node 24 run and must equal the
 * committed presets: every node, arrow, tag, mark and listed pair is a
 * recorded probe hit (the recordings themselves are checked hit by hit in
 * `linked-list.truth.test.ts`). Without a local content checkout (CI) the
 * lesson's code is absent, so the presets are rebuilt from the committed
 * recordings, which that test checks against a fresh run where it can.
 */

const REC = { ...reversal, ...fastSlow } as unknown as Record<string, PointerRecording>
const committed = (p: typeof reverseFullProgram) => REC[p.id]

/** A fresh run from the local content checkout, or the committed recording where the checkout lacks it (CI). */
const fresh = (p: typeof reverseFullProgram) => {
  const loaded = loadProgram(p.source)
  if (!loaded.ok) return committed(p)
  const { runtime: _r, ...rec } = recordPointers(p, loaded.text)
  return rec
}

describe('linked-list frames', () => {
  it('full-reversal-strip is the recorded run, pass by pass', () => {
    expect(fullReversalData(fresh(reverseFullProgram))).toEqual(fullReversalStrip.data)
    expect(fullReversalStrip.programs[0].observed).toEqual(['5', '4', '3', '2', '1'])
  })

  it('floyd-rho is the recorded run: phase 1 meets at 5, phase 2 at the entry 3, a = c - b', () => {
    const d = floydData(fresh(detectCycleProgram))
    expect(d).toEqual(floydRho.data)
    const [one, two] = d.panels as RhoPanel[]
    const v = (i: number) => one.state.nodes[i].label
    expect(one.pairs.values).toEqual(['(2,3)', '(3,5)', '(4,3)', '(5,5)'])
    expect(v(one.mark!.node)).toBe('5')
    expect(v(one.rho.entry)).toBe('3')
    expect(one.mark!.node).not.toBe(one.rho.entry)
    expect(two.pairs.values).toEqual(['(1,5)', '(2,6)', '(3,3)'])
    expect(v(two.mark!.node)).toBe('3')
    const { a, b, c } = two.distances!
    expect([a, b, c]).toEqual([2, 2, 4])
    expect(a).toBe(c - b)
    expect(floydRho.programs[0].observed).toEqual(['3'])
  })

  it('catches a frame that the run does not support', () => {
    const d = floydData(fresh(detectCycleProgram))
    const lie = { ...d, panels: d.panels.map((p, i) => (i === 0 ? { ...p, mark: { node: 2, label: 'meet' } } : p)) }
    expect(lie).not.toEqual(floydRho.data)
  })

  it('describes every panel in text (links, pointers, the mark)', () => {
    for (const p of linkedListFramesDescriptor.presets) {
      const alt = linkedListFramesDescriptor.engine.describe(p.data)
      expect(alt.parts).toHaveLength(p.data.panels.length)
      for (const part of alt.parts) expect(part.lines.join(' ')).toMatch(/Links: .*Pointers: /)
    }
    const rho = linkedListFramesDescriptor.engine.describe(floydRho.data).parts
    expect(rho[0].lines.join(' ')).toMatch(/Marked: 5, the meeting node \(not the entry\)/)
    expect(rho[1].lines.join(' ')).toMatch(/a = 2 from head to the entry, b = 2 .* c = 4/)
  })
})
