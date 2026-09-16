import { describe, expect, it } from 'vitest'
import { getLessonNavigation } from './lesson-navigation'

const sections = [
  {
    title: 'First section', href: '/courses/track/first',
    lessons: [
      { title: 'First', href: '/courses/track/first/first' },
      { title: 'Middle', href: '/courses/track/first/middle' },
      { title: 'Last', href: '/courses/track/first/last' },
    ],
  },
  {
    title: 'Second section', href: '/courses/track/second',
    lessons: [{ title: 'Final lesson', href: '/courses/track/second/final' }],
  },
]

describe('lesson navigation destinations', () => {
  it('uses the adjacent lessons in the middle of a section', () => {
    const result = getLessonNavigation(sections, 0, 1)
    expect(result.previousPage).toBe(sections[0].lessons[0])
    expect(result.nextPage).toBe(sections[0].lessons[2])
  })

  it('keeps the section introduction before its first lesson', () => {
    expect(getLessonNavigation(sections, 0, 0)).toEqual({
      previousPage: sections[0], nextPage: sections[0].lessons[1],
    })
  })

  it('continues to the next section introduction at a section boundary', () => {
    expect(getLessonNavigation(sections, 0, 2)).toEqual({
      previousPage: sections[0].lessons[1], nextPage: sections[1],
    })
  })

  it('does not invent a next page at the end of the course', () => {
    expect(getLessonNavigation(sections, 1, 0)).toEqual({
      previousPage: sections[1], nextPage: null,
    })
  })

  it.each([[-1, 0], [2, 0], [0, -1], [0, 3]])('returns no links for an unavailable location %i/%i', (section, lesson) => {
    expect(getLessonNavigation(sections, section, lesson)).toEqual({
      previousPage: null, nextPage: null,
    })
  })
})
