import { describe, expect, it, vi } from 'vitest'
import {
  G7_CHANGE_CLASS, G7_CONTRACTS, G7_DATA_TYPES, G7_TYPE_COERCION, G7_REVIEWED_BINDINGS,
  assertG7Body, assertG7SourceLesson, g7LessonMetadata, g7ValueHash, requireG7Binding,
} from './g7-contracts'
import { normalizeReleaseScopeOptions } from '@/scripts/content-release/scope'

describe('G7 local candidate contracts (real immutable constants, no synthetic binding)', () => {
  it('preserves the published Data Types binding and binds the complete local Coercion candidate', () => {
    expect(Object.keys(G7_REVIEWED_BINDINGS)).toEqual([G7_DATA_TYPES, G7_TYPE_COERCION])
    const binding = requireG7Binding(G7_DATA_TYPES)
    expect(g7ValueHash(binding)).toBe('d34ac4f86e55f863f7a3b4a18574147e53e4fa1adf6b3f5a0a5c06a96a57b52b')
    expect(binding.sourceLessonSha256).toBe('3b38e3da312ced7db557041fcd487d6966b62d165514cf17a4856c7196516b5d')
    expect(binding.problems).toHaveLength(6)
    expect(binding.problems.at(-1)).toMatchObject({
      id: 'implement-deepclone-structural-deep-copy', type: 'CODING',
      questionSha256: '44cee8cf3decdaaf9d37964fb0c9fcf439e5ab912fb92d2aef6bf140f0f3e9bf',
      answerSha256: '83ff3c99040ee690c7171ffd4943aa14f81f0ade44244c144ad77daac8bf9207',
    })
    const coercion = requireG7Binding(G7_TYPE_COERCION)
    expect(coercion.sourceLessonSha256).toBe('e7e3e4a43e25074074152fdbd9aedd2f7a521e8da5aa65f2891b4410d82d3d4d')
    expect(coercion.problems).toHaveLength(6)
    expect(coercion.problems.at(-1)).toMatchObject({
      id: 'implement-deepequal-structural-equality', type: 'CODING',
      questionSha256: '5f1f4f987b44ff02bcafb674fa3d01496e7ceb3924a7f486e9055c823b4d5c96',
      answerSha256: '73fe18b77029c801b8225fcf3ddab318653f42fd244701cdca7b9ffbebf10f7a',
    })
    expect(() => assertG7Body('unreviewed body', G7_TYPE_COERCION)).toThrow(/complete frozen or reviewed/)
  })
  it('requires code-reviewed complete bindings even for no-op/before/recovery plans, with no environment fallback', () => {
    const bound = { ...G7_REVIEWED_BINDINGS }
    delete G7_REVIEWED_BINDINGS[G7_DATA_TYPES]
    delete G7_REVIEWED_BINDINGS[G7_TYPE_COERCION]
    vi.stubEnv('G7_QUESTION_SHA256', 'a'.repeat(64))
    vi.stubEnv('G7_SOURCE_SHA256', 'b'.repeat(64))
    try {
      for (const lesson of [G7_DATA_TYPES, G7_TYPE_COERCION] as const) {
        expect(() => requireG7Binding(lesson)).toThrow(/inactive.*missing complete reviewed/)
        expect(() => assertG7Body('unreviewed', lesson)).toThrow(/inactive/)
        expect(() => assertG7SourceLesson({}, lesson)).toThrow(/inactive/)
      }
    } finally {
      Object.assign(G7_REVIEWED_BINDINGS, bound)
      vi.unstubAllEnvs()
    }
  })
  it('freezes original lesson metadata, six identities, questions, answers and the exact Coercion recovery hash', () => {
    expect(G7_CONTRACTS[G7_DATA_TYPES].metadata).toEqual({
      id: '/data-types', title: 'Data Types', description: 'Master JavaScript data types and structures.', order: 1, access: 'FREE',
    })
    expect(G7_CONTRACTS[G7_TYPE_COERCION].metadata.order).toBe(2)
    expect(g7LessonMetadata(G7_DATA_TYPES).order).toBe(0)
    expect(g7LessonMetadata(G7_TYPE_COERCION).order).toBe(1)
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
