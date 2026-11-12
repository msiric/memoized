import { describe, expect, it } from 'vitest'
import { envRecordsDescriptor } from './descriptor'
import { isFunction, type EnvSection } from './model'
import { pathCss, pathLabel, pathSelectors } from './paths'

const section = (preset: string, id: string): EnvSection =>
  envRecordsDescriptor.presets.find((p) => p.id === preset)!.data.sections.find((s) => s.id === id)!
const fn = (s: EnvSection, id: string) => {
  const n = s.nodes.find((x) => x.id === id)
  if (!n || !isFunction(n)) throw new Error(id)
  return n
}

describe('closures hover paths (D21)', () => {
  it('follows the [[Environment]] link and every outer link a lookup walks', () => {
    const let_ = section('var-vs-let-loop', 'let')
    expect(pathSelectors(let_, fn(let_, 'f1'))).toEqual([
      '[data-node=f1]',
      '[data-edge="env:f1"]',
      '[data-o=f1]',
      '[data-node=it1]',
      '[data-edge="outer:it1"]',
      '[data-node=call]',
    ])
  })

  it('brings forward every name that aliases the function, and only those', () => {
    const c = section('factory-calls-vs-aliases', 'counters')
    const a = pathSelectors(c, fn(c, 'fA'))
    expect(a).toEqual(
      expect.arrayContaining(['[data-edge="ref:module.counter1"]', '[data-edge="ref:module.sameCounter"]', '[data-node=module]']),
    )
    expect(a).not.toContain('[data-edge="ref:module.counter2"]')
    // drawOuter: false: the record's outer link is not drawn, so it is not on the path.
    expect(a.some((x) => x.includes('outer:'))).toBe(false)
  })

  it('names each function by its record and its aliases', () => {
    const c = section('factory-calls-vs-aliases', 'counters')
    expect(pathLabel(c, fn(c, 'fA'))).toBe('ƒ A, named counter1 and sameCounter, created in createCounter() call A')
    const v = section('var-vs-let-loop', 'var')
    expect(pathLabel(v, fn(v, 'f0'))).toBe('ƒ #0, created in buildFunctions() call')
  })

  it('writes one scoped rule per function', () => {
    for (const p of envRecordsDescriptor.presets) {
      const css = pathCss(p.data)
      const fns = p.data.sections.flatMap((s) => s.nodes.filter(isFunction))
      expect(css.match(/\{opacity:1\}/g)?.length).toBe(fns.length)
      expect(css).not.toMatch(/[<>]/)
    }
  })
})
