import { describe, expect, it } from 'vitest'
import { envRecordsDescriptor } from './descriptor'
import { isFunction, type EnvSection } from './model'
import { litRows, pathCss, pathLabel, pathParts, pathSelectors } from './paths'

const section = (preset: string, id: string): EnvSection =>
  envRecordsDescriptor.presets.find((p) => p.id === preset)!.data.sections.find((s) => s.id === id)!
const fn = (s: EnvSection, id: string) => {
  const n = s.nodes.find((x) => x.id === id)
  if (!n || !isFunction(n)) throw new Error(id)
  return n
}

describe('closures traced paths (D21, H3 R11)', () => {
  it('lights the function, its [[Environment]] link, its record and the row it reads; the outer chain stays at rest', () => {
    const let_ = section('var-vs-let-loop', 'let')
    expect(pathParts(let_, fn(let_, 'f1'))).toEqual({
      lit: ['[data-node=f1]', '[data-edge="env:f1"]', '[data-o=f1]', '[data-node=it1]', '[data-node=it1] [data-b=i]'],
      hold: [],
    })
    expect(pathSelectors(let_, fn(let_, 'f1'))).not.toContain('[data-node=call]')
    const v = section('var-vs-let-loop', 'var')
    expect(pathParts(v, fn(v, 'f2')).lit).toContain('[data-node=call] [data-b=i]')
  })

  it('lights every name that aliases the function, and only those; their record is held, not lit', () => {
    const c = section('factory-calls-vs-aliases', 'counters')
    const a = pathParts(c, fn(c, 'fA'))
    expect(a.lit).toEqual(
      expect.arrayContaining([
        '[data-edge="ref:module.counter1"]',
        '[data-edge="ref:module.sameCounter"]',
        '[data-node=module] [data-b=counter1]',
        '[data-node=module] [data-b=sameCounter]',
        '[data-node=callA] [data-b=count]',
      ]),
    )
    expect(a.hold).toEqual(['[data-node=module]'])
    expect([...a.lit, ...a.hold].join()).not.toMatch(/counter2|callB/)
    // drawOuter: false: the record's outer link is not drawn, so it is not on the path.
    expect(a.lit.some((x) => x.includes('outer:'))).toBe(false)
  })

  it('tints only rows that some function reads or that name a function', () => {
    const c = section('factory-calls-vs-aliases', 'counters')
    expect(Object.fromEntries([...litRows(c)].map(([k, v]) => [k, [...v].sort()]))).toEqual({
      callA: ['count'],
      callB: ['count'],
      module: ['counter1', 'counter2', 'sameCounter'],
    })
    expect([...litRows(section('var-vs-let-loop', 'let')).keys()].sort()).toEqual(['it0', 'it1', 'it2'])
  })

  it('names each function by its record, its aliases and what it reads', () => {
    const c = section('factory-calls-vs-aliases', 'counters')
    expect(pathLabel(c, fn(c, 'fA'))).toBe(
      'ƒ A, named counter1 and sameCounter, created in createCounter() call A; it reads count = 2',
    )
    const v = section('var-vs-let-loop', 'var')
    expect(pathLabel(v, fn(v, 'f0'))).toBe('ƒ #0, created in buildFunctions() call; it reads i = 3')
  })

  it('one path at a time: hover wins, keyboard focus only as :focus-visible, :focus only where nothing can hover', () => {
    for (const p of envRecordsDescriptor.presets) {
      const css = pathCss(p.data)
      const fns = p.data.sections.flatMap((s) => s.nodes.filter(isFunction))
      const [main, touch] = css.split('@media screen and (hover:none)')
      expect(main.match(/\{color:var\(--vz-k\)/g)).toHaveLength(fns.length)
      expect(touch.match(/\{color:var\(--vz-k\)/g)).toHaveLength(fns.length)
      // G ruling 1: emphasis only; nothing is dimmed or faded.
      expect(css).not.toMatch(/opacity/)
      expect(main).not.toMatch(/:focus[^-]/)
      // Every function's keyboard path yields to any hovered function.
      for (const f of fns)
        expect(main).toContain(`:not(:has([tabindex]:hover)):has([data-node=${f.id}]:focus-visible)`)
      expect(touch).not.toMatch(/:hover|:focus-visible/)
      expect(css).not.toMatch(/[<>]/)
    }
  })
})
