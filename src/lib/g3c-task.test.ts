import { describe, expect, it } from 'vitest'
import { G3C_LESSON_CONTENT_ID, G3C_OLD_TASK_IDS, G3C_TASK, hasG3cPractice, orderG3cPractice } from './g3c-task'

const old = G3C_OLD_TASK_IDS.map((id, index) => ({ contentId: `${G3C_LESSON_CONTENT_ID}/${id}`, id: `old-${index}` }))
const native = { contentId: G3C_TASK.contentId, id: 'new-row' }

describe('G3C native identity and order', () => {
  it('keeps its own free coding identity and local destination', () => {
    expect(G3C_TASK.type).toBe('CODING')
    expect(G3C_TASK.difficulty).toBe('HARD')
    expect(G3C_TASK.href).toBe('')
    expect(G3C_TASK.link).toBe('/courses/js-track/frontend-development/frontend-interviews#build-a-local-autocomplete')
  })

  it('moves only the native record last and leaves the existing returned sequence intact', () => {
    const input = [old[4], old[3], native, old[2], old[0], old[1]]
    const before = [...input]
    expect(hasG3cPractice(G3C_LESSON_CONTENT_ID, input)).toBe(true)
    const output = orderG3cPractice(G3C_LESSON_CONTENT_ID, input)
    expect(output).toEqual([old[4], old[3], old[2], old[0], old[1], native])
    expect(output[0]).toBe(input[0])
    expect(output[5]).toBe(native)
    expect(input).toEqual(before)
  })

  it.each([
    { lesson: G3C_LESSON_CONTENT_ID, problems: old },
    { lesson: null, problems: [...old, native] },
    { lesson: '/dsa-track/common-techniques/longest-common-substring', problems: [...old, native] },
    { lesson: G3C_LESSON_CONTENT_ID, problems: [...old, old[0]] },
    { lesson: G3C_LESSON_CONTENT_ID, problems: [...old, { contentId: null, id: 'missing' }] },
    { lesson: G3C_LESSON_CONTENT_ID, problems: [...old, native, { contentId: '/another', id: 'extra' }] },
  ])('does not advertise or change an incomplete, foreign or unexpected catalog', ({ lesson, problems }) => {
    expect(hasG3cPractice(lesson, problems)).toBe(false)
    expect(orderG3cPractice(lesson, problems)).toBe(problems)
  })
})
