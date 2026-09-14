import { describe, expect, it } from 'vitest'
import { createFirstPassLessonFixture } from '@/test-fixtures/typescript-first-pass'
import { resolveTypescriptFirstPass } from './typescript-first-pass'
import { TS_FIRST_PASS_STEPS } from '@/lib/typescript-first-pass'

describe('first-pass identity resolution and public projection', () => {
  it('resolves four existing IDs in curated order without copying the paid body', () => {
    const lesson = createFirstPassLessonFixture()
    lesson.problems.reverse()
    const result = resolveTypescriptFirstPass(lesson)
    expect(result.status).toBe('ready')
    if (result.status !== 'ready') throw new Error('Expected a valid fixture')
    expect(result.path.questions.map(question => question.stepId)).toEqual(TS_FIRST_PASS_STEPS.map(step => step.id))
    expect(result.path.questions).toHaveLength(4)
    expect(JSON.stringify(result.path)).not.toContain('PRIVATE_LESSON_BODY')
    expect(result.path).not.toHaveProperty('serializedBody')
    expect(result.path.questions[0]).not.toHaveProperty('lessonId')
    expect(result.path.optionalQuestion.title).toBe("TypeScript's Intentional Unsoundness")
  })

  it('never silently shrinks the denominator for missing or duplicate rows', () => {
    const missing = createFirstPassLessonFixture()
    missing.problems.pop()
    expect(resolveTypescriptFirstPass(missing).status).toBe('unavailable')
    const duplicate = createFirstPassLessonFixture()
    duplicate.problems.push(duplicate.problems[0])
    expect(resolveTypescriptFirstPass(duplicate).status).toBe('unavailable')
  })

  it.each(['owner', 'identity', 'slug', 'title', 'type', 'difficulty', 'question', 'feedback'])(
    'rejects a changed %s contract instead of matching by title',
    change => {
      const lesson = createFirstPassLessonFixture()
      const question = lesson.problems[0]
      if (change === 'owner') question.lessonId = 'another-lesson'
      if (change === 'identity') question.contentId = '/different'
      if (change === 'slug') question.slug = 'renamed'
      if (change === 'title') question.title = 'Different question'
      if (change === 'type') question.type = 'CODING'
      if (change === 'difficulty') question.difficulty = 'HARD'
      if (change === 'question') question.question += ' Extra task.'
      if (change === 'feedback') question.serializedAnswer = { error: 'bad compile' }
      expect(resolveTypescriptFirstPass(lesson).status).toBe('unavailable')
    },
  )

  it('rejects the wrong lesson or changed body entitlement', () => {
    const lesson = createFirstPassLessonFixture()
    lesson.contentId = '/wrong-owner'
    expect(resolveTypescriptFirstPass(lesson).status).toBe('unavailable')
    const free = createFirstPassLessonFixture()
    free.access = 'FREE'
    expect(resolveTypescriptFirstPass(free).status).toBe('unavailable')
  })
})
