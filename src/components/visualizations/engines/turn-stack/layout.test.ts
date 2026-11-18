// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { groupIndices } from '../../shell/footprint'
import { monoWidth } from '../../substrates/text-metrics'
import { turnStackDescriptor } from './descriptor'
import { COLUMN, G, PLOT, STAGE_MIN, STAGE_TIGHT, at, chainName, columnRows, labelProblems, ruleText, turnStackMetrics } from './layout'
import { key } from './model'

/**
 * The plot and its panel hold every state of every preset without a
 * collision, a spill or a scale-down at the default text size: every label
 * clear of every point, label and line any step draws; the plot and the turn
 * column side by side 1:1 on a 320 phone and in the full column, stacked
 * beside the code at 768; the column's rows inside its width and row count;
 * the heading on one line in the tight frame.
 */

const presets = turnStackDescriptor.presets

describe.each(presets.map((p, i) => [p.id, i] as const))('hull-turn-stack/%s layout', (id, i) => {
  const log = presets[i].log
  const group = groupIndices(turnStackDescriptor, i).map((k) => presets[k].log)
  const m = turnStackMetrics([log], group)

  it('places every label clear of every point, label and line of every step, inside the plot', () => {
    expect(labelProblems(m.plot, [log])).toEqual([])
  })

  it('draws every point inside the plot, a lattice unit apart at least', () => {
    for (const p of log.steps[0].state.points) {
      const c = at(m.plot, p)
      expect(c.x - PLOT.r).toBeGreaterThanOrEqual(0)
      expect(c.x + PLOT.r).toBeLessThanOrEqual(m.plot.width)
      expect(c.y - PLOT.r).toBeGreaterThanOrEqual(0)
      expect(c.y + PLOT.r).toBeLessThanOrEqual(m.plot.height)
    }
    const keys = log.steps[0].state.points.map(key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('fits the plot and the turn column side by side on a 320 phone, and stacked beside the code at 768', () => {
    expect(m.plot.width + G.split + m.column).toBeLessThanOrEqual(STAGE_MIN.narrow - 2 * G.padNarrow - 2 * G.border)
    const right = STAGE_MIN.wide - m.codeColumn.md - G.columnGap - 2 * G.pad - 2 * G.border
    expect(Math.max(m.plot.width, m.column), `right column ${right}`).toBeLessThanOrEqual(right)
    expect(m.panel.wide).toBeLessThanOrEqual(m.layout.stage.wide)
    expect(m.panelCol).toBeLessThanOrEqual(m.layout.stage.wide)
  })

  it('keeps every column row inside the column, in its six rows, at every step', () => {
    for (const [k, s] of log.steps.entries()) {
      const rows = columnRows(s.state)
      expect(rows.length, `step ${k}`).toBeLessThanOrEqual(COLUMN.rows)
      for (const r of rows) expect(monoWidth(r, G.small), `step ${k} "${r}"`).toBeLessThanOrEqual(m.column)
    }
  })

  it('keeps the heading on one line on a 320 phone (chain and rule) and in the tight frame (the chain alone), at every step', () => {
    const narrow = STAGE_MIN.narrow - 2 * G.padNarrow - 2 * G.border
    const tight = STAGE_TIGHT - 2 * 4 - 2 * G.border
    for (const [k, s] of log.steps.entries()) {
      // The chain (sans 12/600, about 0.58 em) and the rule (mono 12), with the 12 px gap.
      const chain = chainName(s.state).length * 12 * 0.58
      expect(chain + 12 + monoWidth(ruleText(s.state), G.small), `step ${k}`).toBeLessThanOrEqual(narrow)
      expect(chain, `step ${k}`).toBeLessThanOrEqual(tight)
    }
  })

  it('fixes the code column across the lesson group, so a preset switch never moves it', () => {
    for (const k of groupIndices(turnStackDescriptor, i)) expect(turnStackMetrics([presets[k].log], group).codeColumn).toEqual(m.codeColumn)
  })
})
