import { describe, expect, it } from 'vitest'
import { DRAW_W, G, SCREEN_CONTENT, WIRE_COLS, slotRowWidth, ssrMetrics, wireWidth } from './layout'
import { SLOTS } from './model'
import { sansWidth } from '../../substrates/text-metrics'
import { streamLog, stringLog } from './presets/ssr'

describe('ssr-stream layout', () => {
  const logs = [streamLog, stringLog]
  it('every wire row (time, line, the end mark) fits the drawing, 1:1 at the default text size', () => {
    expect(wireWidth(logs)).toBeLessThanOrEqual(DRAW_W)
    for (const log of logs) for (const l of log.steps[log.steps.length - 1].state.wire) expect([...l.text].length).toBeLessThanOrEqual(WIRE_COLS)
  })
  it('the time column holds its widest time with a gap before the lines', () => {
    for (const log of logs) for (const c of log.steps[log.steps.length - 1].state.chunks) expect(2 + sansWidth(`${c.ms} ms`, 12) + 4).toBeLessThanOrEqual(G.timeCol)
  })
  it('every slot row (label or body, then the widest badge) fits the drawing', () => {
    for (const s of SLOTS) expect(slotRowWidth(s, streamLog.steps[0].state.dataMs[s]), s).toBeLessThanOrEqual(DRAW_W)
  })
  it('each preset reserves its own rows: the wire never grows past its band while stepping', () => {
    for (const log of logs) {
      const m = ssrMetrics([log])
      expect(m.rows).toBe(Math.max(...log.steps.map((s) => s.state.wire.length)))
      expect(m.wireDraw.h).toBe(m.rows * G.row)
      expect(m.layout.stage.narrow).toBe(m.wire.narrow + G.gap + m.screen.narrow)
      expect(m.wire.wide).toBe(m.screen.wide)
    }
    expect(ssrMetrics([stringLog]).rows).toBeLessThan(ssrMetrics([streamLog]).rows)
  })
  it('the screen holds the Header, two slots and the handler log', () => {
    expect(SCREEN_CONTENT).toBe(G.header + 2 * G.slot + 3 * G.slotGap + G.out)
  })
})
