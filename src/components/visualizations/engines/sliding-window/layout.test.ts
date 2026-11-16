// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupIndices } from '../../shell/footprint'
import { sansWidth } from '../../substrates/text-metrics'
import { slidingWindowDescriptor } from './descriptor'
import { G, STAGE_MIN, STRIP, TIGHT_PANEL, bandSpan, headingWidth, layoutStrip, slidingWindowMetrics, storeLabel, tagBox } from './layout'

/**
 * The strip and its panels hold every state of every preset without a
 * collision, a spill or a scale-down at the default text size: the heading
 * and the store label stay on one line in the tight frame (very large
 * text), the strip is drawn 1:1 beside the code at 768 and on a 320 phone,
 * the edge tags and the band stay inside it.
 */

const presets = slidingWindowDescriptor.presets

describe.each(presets.map((p, i) => [p.id, i] as const))('sliding-window/%s layout', (id, i) => {
  const log = presets[i].log
  const group = groupIndices(slidingWindowDescriptor, i).map((k) => presets[k].log)
  const m = slidingWindowMetrics([log], group)

  it('keeps the heading and the store label on one line in the tight frame, at every step', () => {
    for (const [k, s] of log.steps.entries()) {
      expect(headingWidth(s.state), `step ${k}`).toBeLessThanOrEqual(TIGHT_PANEL)
      expect(sansWidth(storeLabel(s.state), G.small), `step ${k}`).toBeLessThanOrEqual(TIGHT_PANEL)
    }
  })

  it('draws the strip 1:1 on a 320 phone and beside the code at 768', () => {
    expect(m.strip.width).toBeLessThanOrEqual(STAGE_MIN.narrow - 2 * 6 - 2 * G.border)
    const right = STAGE_MIN.wide - m.codeColumn.md - G.columnGap - 2 * G.pad - 2 * G.border
    expect(m.strip.width, `right column ${right}`).toBeLessThanOrEqual(right)
  })

  it('keeps every tag and the band inside the strip, the tags in their own lanes, the cells apart', () => {
    const g = m.strip
    for (const [k, { state }] of log.steps.entries()) {
      const l = tagBox(g, state.names.left, state.left, 'left')
      expect(l.x).toBeGreaterThanOrEqual(0)
      expect(l.x + l.w, `step ${k}`).toBeLessThanOrEqual(g.width)
      if (state.right === null) continue
      const r = tagBox(g, state.names.right, state.right, 'right')
      expect(r.x + r.w).toBeLessThanOrEqual(g.width)
      expect(r.y).toBeGreaterThanOrEqual(l.y + STRIP.tag)
      const [x, w] = bandSpan(g, state.left, state.right)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x + w).toBeLessThanOrEqual(g.width)
    }
    for (let c = 1; c < g.x.length; c++) expect(g.x[c] - g.x[c - 1]).toBeGreaterThanOrEqual(STRIP.cell)
    expect(r1(g.height)).toBe(g.lanes.right + STRIP.tag)
  })

  it('fixes the code column across the lesson group, so a preset switch never moves it', () => {
    for (const k of groupIndices(slidingWindowDescriptor, i))
      expect(slidingWindowMetrics([presets[k].log], group).codeColumn).toEqual(m.codeColumn)
  })
})

describe('the strip geometry', () => {
  it('centres the cells and widens for a long edge name', () => {
    const g = layoutStrip(2, { left: 'windowStart', right: 'windowEnd' })
    expect(g.width).toBeGreaterThan(2 * STRIP.cell + STRIP.cellGap)
    expect(g.x[0]).toBeCloseTo(g.width - (g.x[1] + STRIP.cell))
  })
})

const r1 = (n: number) => Math.round(n * 10) / 10
