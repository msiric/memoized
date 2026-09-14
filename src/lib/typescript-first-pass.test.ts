import { describe, expect, it } from 'vitest'
import {
  firstPassHref,
  firstUnmarkedStep,
  isTsBasicsRoute,
  resolveFirstPassSelection,
  TS_BASICS_HREF,
  TS_FIRST_PASS_STEPS,
} from './typescript-first-pass'

describe('TypeScript first-pass navigation', () => {
  const first = TS_FIRST_PASS_STEPS[0].id
  const third = TS_FIRST_PASS_STEPS[2].id

  it('uses only the existing lesson pathname and matching question fragment', () => {
    const url = new URL(firstPassHref(third), 'https://www.memoized.io')
    expect(url.pathname).toBe(TS_BASICS_HREF)
    expect(url.searchParams.get('path')).toBe('typescript-first-pass')
    expect(url.searchParams.get('step')).toBe(third)
    expect(url.hash).toBe(`#${third}`)
  })

  it('honors a valid explicit step and explains a conflicting fragment', () => {
    expect(resolveFirstPassSelection(third, `#${third}`, first)).toEqual({ step: third, notice: null })
    expect(resolveFirstPassSelection(third, `#${first}`, first)).toMatchObject({
      step: third, notice: expect.stringContaining('did not match'),
    })
  })

  it('honors an existing core fragment when no step query is supplied', () => {
    expect(resolveFirstPassSelection(undefined, `#${third}`, first)).toEqual({ step: third, notice: null })
  })

  it.each(['not-a-step', '', ['typescript-vs-javascript', 'typescript-vs-javascript']])(
    'does not silently accept an invalid or duplicate step query',
    value => {
      expect(resolveFirstPassSelection(value, `#${third}`, first)).toMatchObject({
        step: first, notice: expect.stringContaining('not in this first pass'),
      })
    },
  )

  it('does not promote a reference or optional question into the core', () => {
    expect(resolveFirstPassSelection(undefined, '#classes-and-inheritance', first)).toMatchObject({
      step: first, notice: expect.stringContaining('not a core question'),
    })
  })

  it('uses fixed definition order regardless of completed/unrelated IDs', () => {
    const questions = TS_FIRST_PASS_STEPS.map((step, index) => ({ id: `db-${index}`, stepId: step.id }))
    for (let mask = 0; mask < 16; mask++) {
      const completed = new Set(['optional-p5', 'unrelated', 'lesson-row'])
      for (let bit = 0; bit < 4; bit++) if (mask & (1 << bit)) completed.add(`db-${bit}`)
      const expectedIndex = [0, 1, 2, 3].find(bit => !(mask & (1 << bit)))
      expect(firstUnmarkedStep(questions, completed)).toBe(expectedIndex === undefined ? null : questions[expectedIndex].stepId)
    }
  })

  it('never enables the same slug in another course or section', () => {
    expect(isTsBasicsRoute({ courseSlug: 'js-track', sectionSlug: 'typescript-introduction', lessonSlug: 'ts-basics' })).toBe(true)
    expect(isTsBasicsRoute({ courseSlug: 'dsa-track', sectionSlug: 'typescript-introduction', lessonSlug: 'ts-basics' })).toBe(false)
    expect(isTsBasicsRoute({ courseSlug: 'js-track', sectionSlug: 'core-fundamentals', lessonSlug: 'ts-basics' })).toBe(false)
  })
})
