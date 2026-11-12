import { describe, expect, it } from 'vitest'
import { chipPath } from './Columns'
import { CARD, rowTop } from './layout'
import { KEY_STRATEGIES, LIST_ACTIONS } from './model'
import { LIST_OUTCOMES } from './outcomes'

/**
 * The state chip rides its own match line and rests at the After end (M09,
 * M11): for every recorded outcome, with both rows checked, at the gutter
 * widths the layout produces (32 px at 320 up to the wide gutters), no two
 * resting chips (20 x 20) overlap, and every sampled point lies on its curve.
 */
const center = (i: number) => rowTop(i) + CARD.height / 2
const CHIP = 20

describe('state chips', () => {
  const cases = KEY_STRATEGIES.flatMap((k) => LIST_ACTIONS.map((a) => [`${k}/${a}`, LIST_OUTCOMES[`${k}/${a}`]] as const))
  it.each(cases)('%s: resting chips never meet', (_id, outcome) => {
    for (const w of [32, 48, 66, 120, 240]) {
      const rests = outcome.reused.flatMap((from, i) => {
        if (from === null) return []
        const pts = chipPath(w, center(from), center(i))
        return [pts[pts.length - 1]]
      })
      for (let a = 0; a < rests.length; a++)
        for (let b = a + 1; b < rests.length; b++) {
          const apart = Math.abs(rests[a].x - rests[b].x) >= CHIP || Math.abs(rests[a].y - rests[b].y) >= CHIP
          expect(apart, `w=${w}: ${JSON.stringify(rests)}`).toBe(true)
        }
    }
  })

  it('travels along the curve (not a chord) and ends inside the gutter, at its After row', () => {
    const w = 66
    const [y1, y2] = [center(0), center(2)]
    const pts = chipPath(w, y1, y2)
    expect(pts[0]).toEqual({ x: 0, y: y1 })
    const end = pts[pts.length - 1]
    expect(end.x).toBeCloseTo(w - 12, 3)
    expect(Math.abs(end.y - y2)).toBeLessThan(Math.abs(end.y - y1))
    // A chord from start to end would pass the midpoint of y at w/2; the
    // level-ended curve is still near y1 at a quarter of the width.
    const quarter = pts.find((p) => p.x >= w / 4)!
    expect(Math.abs(quarter.y - y1)).toBeLessThan(Math.abs(y2 - y1) / 4)
  })
})
