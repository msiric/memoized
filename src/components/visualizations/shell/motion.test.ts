import { describe, expect, it } from 'vitest'
import { motionRules } from '../primitives/tokens-v3'
import { STATIC_GATE, animates, motionBudget, presence, vacating, type MotionGate } from './motion'
import { BURST_WINDOW_MS, INITIAL_PACE, escapePauses, isBurst, pace } from './pace'

const gate = (over: Partial<MotionGate> = {}): MotionGate => ({
  reduce: false,
  instant: false,
  epoch: 0,
  direction: 1,
  allow: null,
  ...over,
})
const set = (...ids: string[]) => new Set(ids)

describe('motion budget (spec §4 rule 1, S-1)', () => {
  it('never lets more than two stage glyphs animate per step', () => {
    expect(motionRules.maxAnimatedPerStep).toBe(2)
    // Event loop, Basics 6 -> 7: the timer moves to the stack, its output is
    // logged and the finished `then` frame leaves: three changes.
    const before = set('stack', 'console', 'then', 'timer', 'out-0', 'out-1', 'out-2')
    const after = set('stack', 'console', 'timer', 'out-0', 'out-1', 'out-2', 'out-3')
    const allow = motionBudget(before, after, ['timer', 'out-3'])
    expect([...allow]).toEqual(['timer', 'out-3'])
  })

  it('ranks the authored focus first, then arrivals, then departures', () => {
    const allow = motionBudget(set('a', 'gone'), set('a', 'new1', 'new2'), ['a'])
    expect([...allow]).toEqual(['a', 'new1'])
    expect([...motionBudget(set('x', 'y'), set(), [])]).toEqual(['x', 'y'])
  })

  it('gives a single change and an exit both slots (script ends: timer moves, script leaves)', () => {
    const allow = motionBudget(set('script', 'timer'), set('timer'), ['timer'])
    expect([...allow]).toEqual(['timer', 'script'])
  })

  it('mirrors Back: the step being undone decides the glyphs', () => {
    // Back 7 -> 6 replays the same two glyphs; `then` re-enters instantly.
    const s7 = set('timer', 'out-3')
    const s6 = set('timer', 'then')
    expect([...motionBudget(s7, s6, ['timer', 'out-3'])]).toEqual(['timer', 'out-3'])
  })

  it('ignores focus ids that are not glyphs on either side (region focus)', () => {
    expect([...motionBudget(set('timer'), set(), ['console'])]).toEqual(['timer'])
  })
})

describe('presence: enter and exit (D7, D8)', () => {
  const vectors = { from: { x: -1 }, to: { x: 1 } }
  const leave = (p: ReturnType<typeof presence>, g: MotionGate, present?: Set<string>) =>
    p.variants.leave({ gate: g, present }) as {
      opacity: number
      x?: number
      transition: { duration?: number }
    }

  it('enters from `from` going forward and from `to` going back', () => {
    expect(presence('t', gate(), vectors).initial).toMatchObject({
      opacity: 0,
      x: -8,
    })
    expect(presence('t', gate({ direction: -1 }), vectors).initial).toMatchObject({ opacity: 0, x: 8 })
  })

  it('exits toward `to` going forward and back toward `from` on Back', () => {
    const p = presence('t', gate(), vectors)
    expect(leave(p, gate())).toMatchObject({ opacity: 0, x: 8 })
    expect(leave(p, gate({ direction: -1 }))).toMatchObject({
      opacity: 0,
      x: -8,
    })
  })

  it('snaps an exit when the *current* render is instant, whatever the glyph rendered with (M01)', () => {
    const p = presence('t', gate(), vectors)
    expect(leave(p, gate({ instant: true, epoch: 3 }))).toEqual({
      opacity: 0,
      transition: { duration: 0 },
    })
  })

  it('snaps glyphs outside the budget and glyphs that moved elsewhere', () => {
    const p = presence('t', gate(), vectors)
    expect(leave(p, gate({ allow: set('other') }))).toEqual({
      opacity: 0,
      transition: { duration: 0 },
    })
    expect(leave(p, gate(), set('t'))).toEqual({
      opacity: 0,
      transition: { duration: 0 },
    })
    expect(presence('t', gate({ allow: set('other') }), vectors).initial).toBe(false)
    expect(presence('t', gate(), vectors, { moved: true }).initial).toBe(false)
  })

  it('never translates under reduced motion and never animates when static', () => {
    expect(presence('t', gate({ reduce: true }), vectors).initial).toMatchObject({ opacity: 0, x: 0 })
    expect(presence('t', STATIC_GATE, vectors).initial).toBe(false)
    expect(animates(STATIC_GATE, 't')).toBe(false)
  })
})

describe('pace: one burst window and one Esc (D13)', () => {
  it('uses the 250 ms window', () => {
    expect(BURST_WINDOW_MS).toBe(250)
    expect(isBurst(1000, 1249)).toBe(true)
    expect(isBurst(1000, 1250)).toBe(false)
  })

  it('renders a burst and a forced command instantly and counts instant epochs', () => {
    const a = pace(INITIAL_PACE, 10_000)
    expect(a).toEqual({ at: 10_000, instant: false, epoch: 0 })
    const b = pace(a, 10_100)
    expect(b).toEqual({ at: 10_100, instant: true, epoch: 1 })
    const c = pace(b, 20_000, true)
    expect(c).toEqual({ at: 20_000, instant: true, epoch: 2 })
  })

  it('Esc pauses only while playing and never does anything else', () => {
    let paused = 0
    let prevented = 0
    const e = { key: 'Escape', preventDefault: () => prevented++ }
    expect(escapePauses(e, true, () => paused++)).toBe(true)
    expect(escapePauses(e, false, () => paused++)).toBe(false)
    expect(escapePauses({ ...e, key: 'Enter' }, true, () => paused++)).toBe(false)
    expect({ paused, prevented }).toEqual({ paused: 1, prevented: 1 })
  })
})

describe('vacate (R1M-13)', () => {
  // Basics 6 -> 7: the timer's task moves from Tasks onto the stack, where
  // the .then callback's frame is leaving.
  const where6: Record<string, string> = { then: 'stack', timer: 'tasks' }
  const where7: Record<string, string> = { timer: 'stack' }
  const before = new Set(['then', 'timer', 'out-0', 'out-1', 'out-2'])
  const after = new Set(['timer', 'out-0', 'out-1', 'out-2', 'out-3'])

  it('lets the glyph a mover replaces fade in place, outside the budget', () => {
    const allow = motionBudget(before, after, ['timer', 'out-3'])
    expect([...allow]).toEqual(['timer', 'out-3'])
    const v = vacating(before, after, allow, (id) => where6[id], (id) => where7[id])
    expect([...v]).toEqual(['then'])
  })

  it('does nothing when no mover enters the region the glyph leaves', () => {
    const v = vacating(before, after, new Set(['out-3']), (id) => where6[id], (id) => where7[id])
    expect(v.size).toBe(0)
  })

  it('fades a vacating glyph on the vacate token, and snaps it on an instant render', () => {
    const p = presence('then', gate({ allow: new Set(['timer']), vacate: new Set(['then']) }), { from: {}, to: {} })
    const leave = p.variants.leave({ gate: gate({ allow: new Set(['timer']), vacate: new Set(['then']) }) })
    expect(leave).toMatchObject({ opacity: 0, transition: { duration: 0.1 } })
    expect(leave).not.toHaveProperty('x')
    const snap = p.variants.leave({ gate: gate({ instant: true, vacate: new Set(['then']) }) })
    expect(snap).toMatchObject({ opacity: 0, transition: { duration: 0 } })
  })
})
