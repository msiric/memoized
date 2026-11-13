import { describe, expect, it } from 'vitest'
import { arc } from './Columns'
import { AFTER_TOP, CARD, CHECK_Y, COLUMNS, STACK_BELOW, rowTop } from './layout'
import { MIN_TEXT_WIDTH } from '../../shell/footprint'

/**
 * The H3 geometry: lines meet the cards at checkbox height (R6), the columns
 * stay side by side at a 320 px phone and stack under Chrome's "Very large"
 * text on a 375 px phone (R9), and stacked arcs never cross.
 */
describe('list-keys geometry', () => {
  it('puts the checkbox on the first line, above the key line', () => {
    expect(CHECK_Y).toBe(13)
    // The 16 px rider at checkbox height clears the key line under it.
    const keyLineTop = CARD.border + (CARD.height - 2 * CARD.border - 38) / 2 + 20 + CARD.lineGap
    expect(CHECK_Y + 8).toBeLessThanOrEqual(keyLineTop)
  })

  it('keeps the columns side by side at 320 and stacks them at 150 % text on 375', () => {
    expect(STACK_BELOW).toBeLessThanOrEqual(MIN_TEXT_WIDTH.narrow)
    // 375 viewport, 16 px padding each side, at a 24 px root: the frame in layout px.
    expect(((375 - 32) * 16) / 24).toBeLessThan(STACK_BELOW)
  })

  it('draws nested stacked arcs that never cross', () => {
    const bulge = (y1: number, y2: number) => Number(arc(COLUMNS.rail, y1, y2).split(' ')[3])
    const y = (i: number) => rowTop(i) + CHECK_Y
    const a = (i: number) => AFTER_TOP + rowTop(i) + CHECK_Y
    // Reverse: before-0 to after-1 spans after-0's arc from before-1.
    expect(bulge(y(0), a(1))).toBeGreaterThan(bulge(y(1), a(0)))
    for (const [y1, y2] of [[y(0), a(2)], [y(1), a(0)]]) expect(bulge(y1, y2) * 0.75).toBeLessThanOrEqual(COLUMNS.rail)
  })
})
