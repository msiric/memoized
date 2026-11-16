// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupIndices } from '../../shell/footprint'
import { monoWidth } from '../../substrates/text-metrics'
import { dpTableDescriptor } from './descriptor'
import { G, ROW_LABELS, STAGE_MIN, TABLE, TIGHT_PANEL, arcPath, dpTableMetrics, headingWidth, layoutTable, tagBox, tagNames } from './layout'

/**
 * The table and its panel hold every state of every preset without a
 * collision, a spill or a scale-down at the default text size: the heading
 * stays on one line in the tight frame (very large text), the table is
 * drawn 1:1 beside the code at 768 and on a 320 phone, the tags stay in
 * their lanes and inside the cells' span, the arc stays in its lane.
 */

const presets = dpTableDescriptor.presets

describe.each(presets.map((p, i) => [p.id, i] as const))('dp-table-dependencies/%s layout', (id, i) => {
  const log = presets[i].log
  const group = groupIndices(dpTableDescriptor, i).map((k) => presets[k].log)
  const m = dpTableMetrics([log], group)

  it('keeps the heading on one line in the tight frame, at every step', () => {
    for (const [k, s] of log.steps.entries()) expect(headingWidth(s.state), `step ${k}`).toBeLessThanOrEqual(TIGHT_PANEL)
  })

  it('draws the table 1:1 on a 320 phone and beside the code at 768', () => {
    expect(m.table.width).toBeLessThanOrEqual(STAGE_MIN.narrow - 2 * 6 - 2 * G.border)
    const right = STAGE_MIN.wide - m.codeColumn.md - G.columnGap - 2 * G.pad - 2 * G.border
    expect(m.table.width, `right column ${right}`).toBeLessThanOrEqual(right)
  })

  it('keeps both tags inside the cells’ span, in their own lanes, and the arc inside its lane', () => {
    const g = m.table
    const t = tagNames(log.steps[0].state.names)
    for (const [k, { state }] of log.steps.entries()) {
      if (state.j === null) continue
      const j = tagBox(g, t.j, state.j, 'j')
      const r = tagBox(g, t.read, state.read!, 'read')
      for (const b of [j, r]) {
        expect(b.x, `step ${k}`).toBeGreaterThanOrEqual(g.gutter)
        expect(b.x + b.w, `step ${k}`).toBeLessThanOrEqual(g.width)
      }
      expect(r.y).toBeGreaterThanOrEqual(j.y + TABLE.tag)
      const arc = arcPath(g, state.read!, state.j)
      // A quadratic's apex is halfway between its end and its control point.
      expect((arc.tail.y + arc.head.y) / 2, `step ${k}`).toBeGreaterThanOrEqual(0)
      expect(arc.head.y).toBe(g.cellTop)
    }
    for (let c = 1; c < g.x.length; c++) expect(g.x[c] - g.x[c - 1]).toBeGreaterThanOrEqual(TABLE.cell)
    expect(g.x[0]).toBeGreaterThanOrEqual(monoWidth(ROW_LABELS.bar, G.small))
  })

  it('fixes the code column across the lesson group, so a preset switch never moves it', () => {
    for (const k of groupIndices(dpTableDescriptor, i)) expect(dpTableMetrics([presets[k].log], group).codeColumn).toEqual(m.codeColumn)
  })
})

describe('the table geometry', () => {
  it('puts the bar row under the cells and the lanes under the bar', () => {
    const g = layoutTable(5, { table: 'f', item: 'x', index: 'j', target: 'm' })
    expect(g.barY).toBeGreaterThan(g.cellTop + TABLE.cell)
    expect(g.indexY).toBeGreaterThan(g.barY + TABLE.bar)
    expect(g.lanes.j).toBeGreaterThan(g.indexY + TABLE.indexRow)
    expect(g.height).toBe(g.lanes.read + TABLE.tag)
  })
})
