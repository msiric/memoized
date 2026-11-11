import { describe, expect, it } from 'vitest'
import { dockMode, initialState, reduce, type Action, type MachineState, type PresetShape } from './machine'

const presets: PresetShape[] = [
  { steps: 9, checkpoints: [{ beforeStep: 6, answer: 'c' }] },
  { steps: 10, checkpoints: [{ beforeStep: 7, answer: 'm' }] },
]
const run = (actions: Action[], s: MachineState = initialState(presets)) =>
  actions.reduce((acc, a) => reduce(presets, acc, a), s)
const nexts = (n: number): Action[] => Array.from({ length: n }, () => ({ type: 'next' }))

describe('StepThrough machine', () => {
  it('loads paused at Start (A1)', () => {
    const s = initialState(presets)
    expect(s).toMatchObject({ index: 0, playing: false })
    expect(dockMode(presets, s)).toBe('controls')
  })

  it('asks before the reveal step and blocks Next until answered', () => {
    const s = run(nexts(5))
    expect(s.index).toBe(5)
    expect(dockMode(presets, s)).toBe('ask')
    expect(run([{ type: 'next' }], s).index).toBe(5)
  })

  it('reveals in the same transition as the answer, then Next comes back', () => {
    const s = run([...nexts(5), { type: 'answer', choice: 'b' }])
    expect(s).toMatchObject({ index: 6, reveal: 0, status: ['answered'], picked: ['b'] })
    expect(dockMode(presets, s)).toBe('reveal')
    const after = run([{ type: 'next' }], s)
    expect(after.index).toBe(7)
    expect(dockMode(presets, after)).toBe('controls')
  })

  it('"Skip, show me" reveals without an answer', () => {
    const s = run([...nexts(5), { type: 'skip' }])
    expect(s).toMatchObject({ index: 6, status: ['skipped'], picked: [null] })
    expect(dockMode(presets, s)).toBe('reveal')
  })

  it('Back stays available at a checkpoint', () => {
    expect(run([...nexts(5), { type: 'back' }]).index).toBe(4)
  })

  it('End marks checkpoints passed over as skipped; landing on one asks it', () => {
    expect(run([{ type: 'end' }])).toMatchObject({ index: 8, status: ['skipped'] })
    const landed = run([{ type: 'seek', to: 5 }])
    expect(dockMode(presets, landed)).toBe('ask')
  })

  it('Restart re-asks and remembers the last answer', () => {
    const s = run([...nexts(5), { type: 'answer', choice: 'b' }, { type: 'restart' }])
    expect(s).toMatchObject({ index: 0, status: ['open'], picked: [null], memory: { '0:0': 'b' } })
  })

  it('play advances on tick and stops at an unanswered checkpoint, at the end and on manual input', () => {
    let s = run([{ type: 'play' }])
    expect(s.playing).toBe(true)
    for (let i = 0; i < 10; i++) s = reduce(presets, s, { type: 'tick' })
    expect(s).toMatchObject({ index: 5, playing: false })
    s = run([{ type: 'answer', choice: 'c' }, { type: 'play' }], s)
    for (let i = 0; i < 10; i++) s = reduce(presets, s, { type: 'tick' })
    expect(s).toMatchObject({ index: 8, playing: false })
    const manual = run([{ type: 'play' }, { type: 'back' }])
    expect(manual.playing).toBe(false)
  })

  it('cannot play at an open checkpoint or the end', () => {
    expect(run([...nexts(5), { type: 'play' }]).playing).toBe(false)
    expect(run([{ type: 'end' }, { type: 'play' }]).playing).toBe(false)
  })

  it('switching presets resets to Start with fresh checkpoints and keeps speed', () => {
    const s = run([{ type: 'speed', speed: 2 }, ...nexts(3), { type: 'preset', preset: 1 }])
    expect(s).toMatchObject({ preset: 1, index: 0, speed: 2, status: ['open'] })
  })
})
