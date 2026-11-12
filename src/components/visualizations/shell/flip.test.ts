import { describe, expect, it } from 'vitest'
import { motion, motionRules } from '../primitives/tokens-v3'
import { springCurve } from './flip'

describe('move spring keyframes', () => {
  const m = motion.move.full
  if (m.type !== 'spring') throw new Error('move must be a spring')
  const curve = springCurve(m)

  it('never overshoots and only ever moves forward', () => {
    for (let i = 1; i < curve.progress.length; i++) {
      expect(curve.progress[i]).toBeGreaterThanOrEqual(curve.progress[i - 1])
      expect(curve.progress[i]).toBeLessThanOrEqual(1)
    }
  })

  it('settles within the 300 ms transition limit and ends exactly in place', () => {
    expect(curve.duration).toBeLessThanOrEqual(motionRules.maxTransitionMs)
    expect(curve.duration).toBeGreaterThan(200)
    expect(curve.progress.at(-1)).toBe(1)
    expect(curve.offsets.at(-1)).toBe(1)
  })
})
