import { describe, expect, it, vi } from 'vitest'
import {
  G7_CHANGE_CLASS, G7_CONTRACTS, G7_DATA_TYPES, G7_TYPE_COERCION, G7_REVIEWED_BINDINGS,
  assertG7Body, assertG7SourceLesson, g7ValueHash, requireG7Binding,
} from './g7-contracts'
import { normalizeReleaseScopeOptions } from '@/scripts/content-release/scope'

describe('G7 local candidate contracts (real immutable constants, no synthetic binding)', () => {
  it('binds only the complete Data Types review candidate, with Coercion still unavailable', () => {
    expect(Object.keys(G7_REVIEWED_BINDINGS)).toEqual([G7_DATA_TYPES])
    const binding = requireG7Binding(G7_DATA_TYPES)
    expect(binding.sourceLessonSha256).toBe('3b38e3da312ced7db557041fcd487d6966b62d165514cf17a4856c7196516b5d')
    expect(binding.problems).toHaveLength(6)
    expect(binding.problems.at(-1)).toMatchObject({
      id: 'implement-deepclone-structural-deep-copy', type: 'CODING',
      questionSha256: '44cee8cf3decdaaf9d37964fb0c9fcf439e5ab912fb92d2aef6bf140f0f3e9bf',
      answerSha256: '83ff3c99040ee690c7171ffd4943aa14f81f0ade44244c144ad77daac8bf9207',
    })
    expect(() => requireG7Binding(G7_TYPE_COERCION)).toThrow(/inactive.*missing complete reviewed/)
  })
  it('requires code-reviewed complete bindings even for no-op/before/recovery plans, with no environment fallback', () => {
    const bound = G7_REVIEWED_BINDINGS[G7_DATA_TYPES]
    delete G7_REVIEWED_BINDINGS[G7_DATA_TYPES]
    vi.stubEnv('G7_QUESTION_SHA256', 'a'.repeat(64))
    vi.stubEnv('G7_SOURCE_SHA256', 'b'.repeat(64))
    try {
      for (const lesson of [G7_DATA_TYPES, G7_TYPE_COERCION] as const) {
        expect(() => requireG7Binding(lesson)).toThrow(/inactive.*missing complete reviewed/)
        expect(() => assertG7Body('unreviewed', lesson)).toThrow(/inactive/)
        expect(() => assertG7SourceLesson({}, lesson)).toThrow(/inactive/)
      }
    } finally {
      G7_REVIEWED_BINDINGS[G7_DATA_TYPES] = bound
      vi.unstubAllEnvs()
    }
  })
  it('freezes original lesson metadata, six identities, questions, answers and the exact Coercion recovery hash', () => {
    expect(G7_CONTRACTS[G7_DATA_TYPES].metadata).toEqual({
      id: '/data-types', title: 'Data Types', description: 'Master JavaScript data types and structures.', order: 1, access: 'FREE',
    })
    expect(G7_CONTRACTS[G7_TYPE_COERCION].metadata.order).toBe(2)
    expect(G7_CONTRACTS[G7_TYPE_COERCION].bodySha256).toBe('6d172b53bb2f6f81d24d35395ef2de28df4aa330c8178b3fb5c0a171b7bb8a1d')
    for (const contract of Object.values(G7_CONTRACTS)) {
      expect(contract.problems).toHaveLength(6)
      expect(contract.problems.at(-1)?.difficulty).toBe('HARD')
      for (const problem of contract.problems) {
        expect(problem.questionSha256).toMatch(/^[a-f0-9]{64}$/)
        expect(problem.answerSha256).toMatch(/^[a-f0-9]{64}$/)
      }
    }
    expect(G7_CONTRACTS[G7_DATA_TYPES].headings).toHaveLength(8)
    expect(G7_CONTRACTS[G7_TYPE_COERCION].headings.filter(item => item.id !== item.beforeId).map(item => item.id))
      .toEqual(['boolean-contexts', 'addition-and-coercion'])
  })
  it('accepts only the exact class/lesson pair and canonicalizes complete-payload hashes deterministically', () => {
    for (const lesson of [G7_DATA_TYPES, G7_TYPE_COERCION]) {
      expect(normalizeReleaseScopeOptions({ changeClass: G7_CHANGE_CLASS, lesson })).toEqual({ changeClass: G7_CHANGE_CLASS, lesson })
    }
    for (const lesson of ['', `/${G7_DATA_TYPES}`, 'data-types', `${G7_DATA_TYPES},${G7_TYPE_COERCION}`]) {
      expect(() => normalizeReleaseScopeOptions({ changeClass: G7_CHANGE_CLASS, lesson })).toThrow()
    }
    expect(g7ValueHash({ b: [1, { y: 2, x: 3 }], a: 0 })).toBe(g7ValueHash({ a: 0, b: [1, { x: 3, y: 2 }] }))
    expect(g7ValueHash([1, 2])).not.toBe(g7ValueHash([2, 1]))
  })
})
