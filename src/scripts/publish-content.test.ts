import { describe, expect, it, vi } from 'vitest'
import { parsePublishContentArgs } from './publish-content'
import { ADDITIVE_CHANGE_CLASS, DEFAULT_CHANGE_CLASS, STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID } from './content-release/scope'
import { G3B_LESSON_UID } from '@/lib/g3b-task'
import { G3C_LESSON_UID } from '@/lib/g3c-task'
import { G7_CHANGE_CLASS, G7_DATA_TYPES, G7_TYPE_COERCION } from '@/lib/g7-contracts'

vi.mock('@/lib/prisma', () => ({ default: { $disconnect: vi.fn() } }))

describe('publish-content CLI change-class contract', () => {
  it.each([G7_DATA_TYPES, G7_TYPE_COERCION])('accepts only the exact G7 class/lesson pair for %s and no binding overrides', lesson => {
    expect(parsePublishContentArgs(['--change-class', G7_CHANGE_CLASS, '--lesson', lesson]).scope)
      .toEqual({ changeClass: G7_CHANGE_CLASS, lesson })
    for (const invalid of ['', `/${lesson}`, `${lesson} `, `${lesson}\nmode=publish`, `${G7_DATA_TYPES},${G7_TYPE_COERCION}`]) {
      expect(() => parsePublishContentArgs(['--change-class', G7_CHANGE_CLASS, '--lesson', invalid])).toThrow()
    }
    expect(() => parsePublishContentArgs(['--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', lesson])).toThrow()
    expect(() => parsePublishContentArgs(['--lesson', lesson])).toThrow()
    for (const option of ['--question', '--source-hash', '--after-hash', '--binding']) {
      expect(() => parsePublishContentArgs(['--change-class', G7_CHANGE_CLASS, '--lesson', lesson, option, 'unreviewed'])).toThrow()
    }
  })
  it('accepts the exact separate G3C selector without exposing a generic additive publisher', () => {
    expect(parsePublishContentArgs(['--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', G3C_LESSON_UID]).scope)
      .toEqual({ changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3C_LESSON_UID })
    for (const lesson of [`/${G3C_LESSON_UID}`, `${G3C_LESSON_UID} `, `${G3C_LESSON_UID}\nmode=publish`]) {
      expect(() => parsePublishContentArgs(['--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', lesson])).toThrow(/requires --lesson/)
    }
    expect(() => parsePublishContentArgs(['--change-class', STRUCTURAL_CHANGE_CLASS, '--lesson', G3C_LESSON_UID])).toThrow()
    expect(() => parsePublishContentArgs(['--lesson', G3C_LESSON_UID])).toThrow()
  })
  it('accepts only the exact G3B class/UID pair without silently accepting aliases', () => {
    expect(parsePublishContentArgs(['--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', G3B_LESSON_UID]).scope)
      .toEqual({ changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3B_LESSON_UID })
    for (const lesson of ['', `/${G3B_LESSON_UID}`, `${G3B_LESSON_UID} `, STRUCTURAL_LESSON_UID]) {
      expect(() => parsePublishContentArgs(['--change-class', ADDITIVE_CHANGE_CLASS, '--lesson', lesson])).toThrow(/requires --lesson/)
    }
  })
  it('defaults to independent in-place text and rejects --lesson without structural opt-in', () => {
    expect(parsePublishContentArgs([]).scope).toEqual({ changeClass: DEFAULT_CHANGE_CLASS, lesson: '' })
    expect(() => parsePublishContentArgs(['--lesson', STRUCTURAL_LESSON_UID])).toThrow(/--lesson is only supported/)
  })

  it.each(['', ' ', '\t'])('rejects an explicitly supplied empty/default lesson option %j', lesson => {
    expect(() => parsePublishContentArgs(['--lesson', lesson])).toThrow(/--lesson is only supported/)
    expect(() => parsePublishContentArgs(['--change-class', DEFAULT_CHANGE_CLASS, '--lesson', lesson])).toThrow(/--lesson is only supported/)
  })

  it.each([` ${STRUCTURAL_LESSON_UID}`, `${STRUCTURAL_LESSON_UID} `])('does not silently normalize the structural lesson selector %j', lesson => {
    expect(() => parsePublishContentArgs(['--change-class', STRUCTURAL_CHANGE_CLASS, '--lesson', lesson])).toThrow(/requires --lesson/)
  })

  it('requires the selected TS Basics source lesson for structural text publishing', () => {
    expect(parsePublishContentArgs([
      '--change-class', STRUCTURAL_CHANGE_CLASS,
      '--lesson', STRUCTURAL_LESSON_UID,
    ]).scope).toEqual({ changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID })
    expect(() => parsePublishContentArgs(['--change-class', STRUCTURAL_CHANGE_CLASS])).toThrow(/requires --lesson/)
    expect(() => parsePublishContentArgs([
      '--change-class', STRUCTURAL_CHANGE_CLASS,
      '--lesson', 'js-track/typescript-introduction/basic-types',
    ])).toThrow(/requires --lesson/)
    expect(() => parsePublishContentArgs(['--change-class', 'other-class'])).toThrow(/Unsupported content change class/)
  })
})
