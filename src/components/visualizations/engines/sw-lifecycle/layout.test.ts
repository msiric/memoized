import { describe, expect, it } from 'vitest'
import type { StepLog } from '../../step-log/types'
import { swDescriptor } from './descriptor'
import { G, band, fitProblems, swMetrics } from './layout'
import type { SwState } from './model'

const logs = swDescriptor.presets.map((p) => p.log)

describe('sw-lifecycle layout', () => {
  it('one chip row per band: narrow stacks tabs, three slots and Cache Storage; wide is the taller column', () => {
    const m = swMetrics(logs)
    expect(m.band).toEqual({ narrow: band(G.padNarrow), wide: band(G.pad) })
    expect(m.layout.stage.narrow).toBe(5 * m.band.narrow + 4 * G.gap)
    expect(m.layout.stage.wide).toBe(Math.max(3 * m.band.wide + 2 * G.gap, 2 * m.band.wide + G.gap))
    expect(m.layout.codeRows).toEqual({ narrow: 0, wide: 0 })
  })

  it('every label fits its band at the tight frame', () => {
    expect(fitProblems(logs)).toEqual([])
  })

  it('lies fail: a cache list or a worker label too long for one row is caught, not clipped', () => {
    const base = logs[0]
    const long: StepLog<SwState> = {
      ...base,
      steps: base.steps.map((s) => ({ ...s, state: { ...s.state, caches: ['v1-static', 'v2-static', 'v3-static'] } })),
    }
    expect(fitProblems([long]).length).toBeGreaterThan(0)
    expect(() => swMetrics([long])).toThrow()
    const wide: StepLog<SwState> = {
      ...base,
      steps: base.steps.map((s) => ({ ...s, state: { ...s.state, slots: { ...s.state.slots, active: [{ v: 'v1', state: 'activating' }, { v: 'v2', state: 'activating' }] } } })),
    }
    expect(fitProblems([wide]).length).toBeGreaterThan(0)
  })
})
