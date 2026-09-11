import { describe, expect, it, vi } from 'vitest'
import { parsePublishContentArgs } from './publish-content'
import { DEFAULT_CHANGE_CLASS, STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID } from './content-release/scope'

vi.mock('@/lib/prisma', () => ({ default: { $disconnect: vi.fn() } }))

describe('publish-content CLI change-class contract', () => {
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
