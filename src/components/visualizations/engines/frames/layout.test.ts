import { describe, expect, it } from 'vitest'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import { emitFramesDescriptor, generatorFramesDescriptor, workerPoolDescriptor } from './descriptor'
import { G, STAGE_TIGHT, framesMetrics, readoutWidth } from './layout'

/**
 * Frames geometry: nothing a step draws is clipped, truncated or spills at
 * the tightest stage (very large text on a phone): every chip fits its lane
 * on its own, the readout line (with an inline output) fits on one line, and
 * every lane label fits. Heights never depend on the step.
 */

const ALL = [generatorFramesDescriptor, workerPoolDescriptor, emitFramesDescriptor]
const laneIn = STAGE_TIGHT - 2 * G.laneInset - 2 * G.border

describe.each(ALL.flatMap((d) => d.presets.map((p) => [`${d.id}/${p.id}`, p.log] as const)))('%s', (_id, log) => {
  const m = framesMetrics([log])

  it('fits every chip, label and readout line at the tight stage', () => {
    for (const { state } of log.steps) {
      for (const lane of state.lanes) {
        expect(sansWidth(lane.label, G.small), lane.label).toBeLessThanOrEqual(laneIn)
        for (const c of lane.chips) expect(monoWidth(c.label, G.small) + 6, c.label).toBeLessThanOrEqual(laneIn)
      }
      expect(readoutWidth(state, m.inlineOut), JSON.stringify(state.vars)).toBeLessThanOrEqual(STAGE_TIGHT)
    }
  })

  it('reserves a band for every lane any step draws, and the same lanes on every step', () => {
    const ids = log.steps[0].state.lanes.map((l) => l.id)
    for (const { state } of log.steps) expect(state.lanes.map((l) => l.id)).toEqual(ids)
    for (const id of ids) expect(m.lanes[id].narrow).toBeGreaterThan(0)
  })
})
