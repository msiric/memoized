import { describe, expect, it } from 'vitest'
import { motion, motionRules } from '../primitives/tokens-v3'
import { liftAt, springCurve } from './flip'

const move = motion.move.full
if (move.type !== 'spring') throw new Error('move must be a spring')

describe('FLIP move curve (M08)', () => {
  const curve = springCurve(move)

  it('fits the 300 ms cap and lands exactly on the target', () => {
    expect(curve.duration).toBeLessThanOrEqual(motionRules.maxTransitionMs)
    expect(curve.duration).toBeGreaterThan(200)
    // It settles (0.5 %) before the cap, so the cap never truncates it.
    expect(curve.duration).toBeLessThan(motionRules.maxTransitionMs - 15)
    expect(curve.progress[0]).toBe(0)
    expect(curve.progress[curve.progress.length - 1]).toBe(1)
    expect(curve.offsets[curve.offsets.length - 1]).toBe(1)
  })

  it('never overshoots or reverses (critically damped)', () => {
    for (let i = 1; i < curve.progress.length; i++) {
      expect(curve.progress[i]).toBeGreaterThanOrEqual(curve.progress[i - 1])
      expect(curve.progress[i]).toBeLessThanOrEqual(1)
    }
  })

  it('has no end snap: the last sample step is under 0.5 % of the travel (2.3 px on 161 px before)', () => {
    const n = curve.progress.length
    expect(curve.progress[n - 1] - curve.progress[n - 2]).toBeLessThan(0.005)
  })
})

describe('lift (D6)', () => {
  it('ramps in over the first 20 %, holds, and is gone at the end', () => {
    expect(liftAt(0)).toBe(0)
    expect(liftAt(0.1)).toBeCloseTo(0.5)
    expect(liftAt(0.5)).toBe(1)
    expect(liftAt(0.85)).toBeCloseTo(0.5)
    expect(liftAt(1)).toBe(0)
  })
})
