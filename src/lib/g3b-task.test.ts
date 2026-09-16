import { describe, expect, it } from 'vitest'
import { G3B_CARD_ORDER, G3B_LESSON_CONTENT_ID, G3B_LESSON_HREF, G3B_TASK, hasG3bPractice, orderG3bPractice } from './g3b-task'
import { isNativeCodingProblem } from './problem-presentation'

const ordered: { contentId: string | null; id: string; label: number }[] =
  G3B_CARD_ORDER.map((contentId, index) => ({ contentId, id: `existing-row-${index}`, label: index }))

describe('bounded G3B practice contract', () => {
  it('keeps the native task identity, requested string result and input bounds explicit', () => {
    expect(G3B_TASK.contentId).toBe(`${G3B_LESSON_CONTENT_ID}/${G3B_TASK.id}`)
    expect(G3B_TASK.link).toBe(`${G3B_LESSON_HREF}#${G3B_TASK.id}`)
    expect(G3B_TASK).toMatchObject({ type: 'CODING', difficulty: 'MEDIUM', href: '' })
    expect(G3B_TASK.question).toContain('one longest contiguous substring')
    expect(G3B_TASK.question).toContain('0 to 500 characters')
    expect(G3B_TASK.question).toContain('U+0020 to U+007E')
    expect(G3B_TASK.question).toContain('return any one of them')
  })

  it('places the new medium task fourth without modifying original row identities or input order', () => {
    const input = [ordered[0], ordered[1], ordered[3], ordered[2]]
    const output = orderG3bPractice(G3B_LESSON_CONTENT_ID, input)
    expect(output).toEqual(ordered)
    expect(output[2]).toBe(ordered[2])
    expect(output[3]).toBe(ordered[3])
    expect(input.map(row => row.label)).toEqual([0, 1, 3, 2])
  })

  it('does not impose this order on any other lesson', () => {
    const input = [...ordered].reverse()
    expect(orderG3bPractice('/other/lesson', input)).toBe(input)
  })

  it('preserves the old three-question view before real creation', () => {
    const old = ordered.slice(0, 3)
    expect(orderG3bPractice(G3B_LESSON_CONTENT_ID, old)).toBe(old)
    expect(hasG3bPractice(G3B_LESSON_CONTENT_ID, old)).toBe(false)
  })

  it('advertises the primary attempt only with the complete active identity set in its own lesson', () => {
    expect(hasG3bPractice(G3B_LESSON_CONTENT_ID, ordered)).toBe(true)
    expect(hasG3bPractice('/another/lesson', ordered)).toBe(false)
  })

  it.each([
    { input: [...ordered, { contentId: '/other', id: 'other-row', label: 4 }] },
    { input: [ordered[0], ordered[1], ordered[2], ordered[2]] },
    { input: [ordered[0], ordered[1], ordered[2], { contentId: null, id: 'missing-id', label: 3 }] },
  ])('never drops or reorders an unexpected catalog shape', ({ input }) => {
    expect(orderG3bPractice(G3B_LESSON_CONTENT_ID, input)).toBe(input)
    expect(hasG3bPractice(G3B_LESSON_CONTENT_ID, input)).toBe(false)
  })
})

describe('native coding presentation', () => {
  it.each([
    ['CODING', '', true],
    ['CODING', '   ', true],
    ['CODING', undefined, true],
    ['CODING', null, true],
    ['CODING', 'https://leetcode.com/problems/longest-common-prefix/', false],
    ['THEORY', '', false],
  ] as const)('classifies %s with href %j', (type, href, expected) => {
    expect(isNativeCodingProblem({ type, href })).toBe(expected)
  })
})
