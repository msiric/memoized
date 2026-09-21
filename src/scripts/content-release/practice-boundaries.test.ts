import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticePublicationBinding } from '@/lib/practice-publication'
import {
  PRACTICE_CODING_TASKS, PRACTICE_LESSONS, isPracticeAssessment, isPracticeLesson,
  practiceAssessmentIds, requirePracticeBinding,
} from '@/lib/practice-publication'
import {
  assertPracticePreparedCatalog, assertPracticeSource,
  practiceProtectedPreparedHash, practiceProtectedSourceHash,
} from './practice-boundaries'
import {
  ALL_UNITS, ASSESSMENTS, EXPECTED_LESSONS, EXPECTED_TASKS, TC, TC_ANSWERS,
  compileFixture, editSource, expectedIds, expectedPreparedHash, inventory,
  practiceBinding, practiceSnapshot, rawHash, sourcePayload, valueHash,
} from './practice-fixtures'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3C_TASK } from '@/lib/g3c-task'

const trusted = vi.hoisted(() => ({ binding: undefined as PracticePublicationBinding | undefined }))
vi.mock('@/lib/practice-publication-binding', () => ({
  get REVIEWED_PRACTICE_BINDING() { return trusted.binding },
}))
vi.mock('@/lib/g7-contracts', async original => {
  const actual = await original<typeof import('@/lib/g7-contracts')>()
  return (await import('./g7-fixtures')).bindSyntheticG7(actual)
})
vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  return { ...actual, assertG3cQuestion: (value: unknown) => {
    if (value !== fixture.syntheticQuestion) throw new Error('Synthetic retained G3C question mismatch')
  } }
})

beforeEach(() => { trusted.binding = practiceBinding() })

describe('explicitly synthetic closed practice binding', () => {
  it('permits exactly the independent 17-lesson, 24-correction, 29-assessment inventory', () => {
    expect(PRACTICE_CODING_TASKS).toEqual(EXPECTED_TASKS)
    expect(PRACTICE_LESSONS).toEqual(EXPECTED_LESSONS)
    expect(EXPECTED_LESSONS).toHaveLength(17)
    expect(Object.values(EXPECTED_TASKS).flat()).toHaveLength(24)
    expect(ASSESSMENTS).toHaveLength(29)
    for (const uid of EXPECTED_LESSONS) {
      expect(practiceAssessmentIds(uid)).toEqual(expectedIds(uid))
      expect(isPracticeLesson(uid)).toBe(true)
      for (const id of expectedIds(uid)) expect(isPracticeAssessment(`/${uid}/${id}`)).toBe(true)
    }
    for (const uid of ['js-track/core-fundamentals/data-types', '__proto__', 'constructor', `${TC}/other`]) {
      expect(isPracticeLesson(uid)).toBe(false)
    }
    expect(isPracticeAssessment(`${TC}/implement-deepequal-structural-equality`)).toBe(false)
    expect(isPracticeAssessment(`/${TC}/unlisted`)).toBe(false)
    expect(isPracticeAssessment(G3B_TASK.contentId)).toBe(false)
    expect(isPracticeAssessment(G3C_TASK.contentId)).toBe(false)
    expect(requirePracticeBinding()).toBe(trusted.binding)
  })

  it.each([
    'absent', 'source-base', 'source-hash', 'prepared-hash', 'lesson-missing', 'lesson-duplicate',
    'lesson-foreign', 'assessment-missing', 'assessment-duplicate', 'assessment-foreign',
    'after-missing', 'before-missing', 'before-type', 'coding-after-type', 'theory-after-type',
    'body-missing', 'body-raw-hash', 'body-compiled-hash',
    'question-hash', 'answer-hash', 'compiled-question-hash', 'compiled-answer-hash',
  ])('rejects a %s trusted-binding defect without an override channel', variant => {
    const binding = trusted.binding!
    const lesson = binding.lessons[0]
    const coding = lesson.assessments.at(-1)!
    const theory = lesson.assessments[0]
    if (variant === 'absent') trusted.binding = undefined
    if (variant === 'source-base') Object.assign(binding, { sourceBase: 'foreign-commit' })
    if (variant === 'source-hash') binding.protectedSourceSha256 = 'z'.repeat(64)
    if (variant === 'prepared-hash') binding.protectedPreparedSha256 = ''
    if (variant === 'lesson-missing') binding.lessons.pop()
    if (variant === 'lesson-duplicate') binding.lessons[1] = structuredClone(lesson)
    if (variant === 'lesson-foreign') Object.assign(lesson, { uid: 'js-track/unlisted/lesson' })
    if (variant === 'assessment-missing') lesson.assessments.pop()
    if (variant === 'assessment-duplicate') lesson.assessments[1] = structuredClone(theory)
    if (variant === 'assessment-foreign') theory.id = 'unlisted'
    if (variant === 'after-missing') Reflect.deleteProperty(coding, 'after')
    if (variant === 'before-missing') Reflect.deleteProperty(coding, 'before')
    if (variant === 'before-type') coding.before.type = 'CODING'
    if (variant === 'coding-after-type') coding.after.type = 'THEORY'
    if (variant === 'theory-after-type') theory.after.type = 'CODING'
    if (variant === 'body-missing') Reflect.deleteProperty(lesson.body, 'after')
    if (variant === 'body-raw-hash') lesson.body.after.rawSha256 = 'A'.repeat(64)
    if (variant === 'body-compiled-hash') lesson.body.before.serializedSha256 = 'too-short'
    if (variant === 'question-hash') coding.after.questionSha256 = ''
    if (variant === 'answer-hash') coding.after.answerSha256 = ''
    if (variant === 'compiled-question-hash') coding.after.serializedQuestionSha256 = ''
    if (variant === 'compiled-answer-hash') coding.before.serializedAnswerSha256 = ''
    expect(() => requirePracticeBinding()).toThrow()
  })
})

describe('synthetic complete source and prepared freezes', () => {
  it('uses 671 identities with independent checksums and exactly 24 type transitions', () => {
    const before = practiceSnapshot(), after = practiceSnapshot('after')
    expect([before.content.courses.length, before.content.sections.length, before.content.lessons.length,
      before.content.problems.length, before.resources.length]).toEqual([2, 8, 120, 508, 33])
    const oldRows = inventory(before), nextRows = inventory(after)
    expect(oldRows).toHaveLength(671)
    expect(new Set(oldRows.map(row => `${row.kind}:${row.contentId}`)).size).toBe(671)
    expect(nextRows.map(row => `${row.kind}:${row.contentId}`)).toEqual(oldRows.map(row => `${row.kind}:${row.contentId}`))
    expect(before.content.problems.filter(row => row.type === 'THEORY')).toHaveLength(340)
    expect(after.content.problems.filter(row => row.type === 'THEORY')).toHaveLength(316)
    expect(after.content.problems.filter(row => row.type === 'CODING')).toHaveLength(192)
    expect(practiceProtectedPreparedHash(oldRows)).toBe(expectedPreparedHash(oldRows))
    expect(practiceProtectedPreparedHash(nextRows)).toBe(trusted.binding!.protectedPreparedSha256)
    for (const snapshot of [before, after]) {
      expect(() => assertPracticeSource(sourcePayload(snapshot))).not.toThrow()
      expect(() => assertPracticePreparedCatalog(inventory(snapshot))).not.toThrow()
      expect(practiceProtectedSourceHash(sourcePayload(snapshot))).toBe(trusted.binding!.protectedSourceSha256)
    }
  })

  it('accepts each of 46 independent complete units and their selective reverse complements', () => {
    for (const unit of ALL_UNITS) {
      for (const state of [new Set([unit]), new Set(ALL_UNITS.filter(item => item !== unit))]) {
        const snapshot = practiceSnapshot(state)
        expect(() => assertPracticeSource(sourcePayload(snapshot)), unit).not.toThrow()
        expect(() => assertPracticePreparedCatalog(inventory(snapshot)), unit).not.toThrow()
      }
    }
  })

  it('accepts 128 Type Coercion body/six-complete-assessment states, not global combinations', () => {
    const units = [`body:${TC}`, ...[...TC_ANSWERS, ...EXPECTED_TASKS[TC]].map(id => `assessment:/${TC}/${id}`)]
    expect(units).toHaveLength(7)
    const frozen = structuredClone(trusted.binding)
    for (let mask = 0; mask < 128; mask++) {
      const state = new Set(units.filter((_, bit) => mask & (1 << bit)))
      const snapshot = practiceSnapshot(state)
      expect(() => assertPracticeSource(sourcePayload(snapshot)), `source ${mask}`).not.toThrow()
      expect(() => assertPracticePreparedCatalog(inventory(snapshot)), `prepared ${mask}`).not.toThrow()
    }
    expect(trusted.binding).toEqual(frozen)
  })

  it('rejects all six partial question/answer/type cross-products for every coding correction', () => {
    const before = practiceSnapshot(), after = practiceSnapshot('after')
    for (const [uid, ids] of Object.entries(EXPECTED_TASKS)) {
      for (const id of ids) {
        const contentId = `/${uid}/${id}`
        const oldRow = before.content.problems.find(row => row.contentId === contentId)!
        const newRow = after.content.problems.find(row => row.contentId === contentId)!
        for (let mask = 1; mask < 7; mask++) {
          const snapshot = practiceSnapshot()
          const row = snapshot.content.problems.find(row => row.contentId === contentId)!
          for (const [bit, field] of ['question', 'answer', 'type'].entries()) {
            Object.assign(row, { [field]: mask & (1 << bit) ? newRow[field as 'question'] : oldRow[field as 'question'] })
          }
          row.serializedQuestion = compileFixture(row.question)
          row.serializedAnswer = compileFixture(row.answer)
          expect(() => assertPracticeSource(sourcePayload(snapshot)), `${id}:${mask}`).toThrow(/complete bound assessment/)
          expect(() => assertPracticePreparedCatalog(inventory(snapshot)), `${id}:${mask}`).toThrow(/one bound assessment/)
        }
      }
    }
  })

  it.each(['body-raw', 'body-compiled', 'question-raw', 'answer-raw', 'question-compiled', 'answer-compiled'])(
    'rejects %s cross-version drift while keeping an otherwise complete after catalog', variant => {
      const before = practiceSnapshot(), after = practiceSnapshot('after')
      if (variant === 'body-raw') after.content.lessons[0].body = before.content.lessons[0].body
      if (variant === 'body-compiled') after.content.lessons[0].serializedBody = before.content.lessons[0].serializedBody
      const old = before.content.problems[5], next = after.content.problems[5]
      if (variant === 'question-raw') next.question = old.question
      if (variant === 'answer-raw') next.answer = old.answer
      if (variant === 'question-compiled') next.serializedQuestion = old.serializedQuestion
      if (variant === 'answer-compiled') next.serializedAnswer = old.serializedAnswer
      expect(() => assertPracticePreparedCatalog(inventory(after))).toThrow(/complete binding|one bound assessment/)
    },
  )

  it('rejects all 30 partial five-field states of one representative complete coding assessment', () => {
    const before = practiceSnapshot(), after = practiceSnapshot('after')
    const fields = ['question', 'answer', 'type', 'serializedQuestion', 'serializedAnswer'] as const
    for (let mask = 1; mask < 31; mask++) {
      const snapshot = practiceSnapshot()
      const row = snapshot.content.problems[5]
      fields.forEach((field, bit) => {
        Object.assign(row, { [field]: mask & (1 << bit) ? after.content.problems[5][field] : before.content.problems[5][field] })
      })
      expect(() => assertPracticePreparedCatalog(inventory(snapshot)), `five-field mask ${mask}`).toThrow(/one bound assessment/)
    }
  })

  it('keeps each of the five non-coding Coercion answers coupled to its compiled feedback', () => {
    for (let index = 0; index < 5; index++) {
      const snapshot = practiceSnapshot()
      const after = practiceSnapshot('after')
      snapshot.content.problems[index].answer = after.content.problems[index].answer
      expect(snapshot.content.problems[index].type).toBe('THEORY')
      expect(snapshot.content.problems[index].question).toBe(after.content.problems[index].question)
      expect(() => assertPracticePreparedCatalog(inventory(snapshot))).toThrow(/one bound assessment/)
    }
  })

  it.each(['question', 'answer', 'body'] as const)('rejects unknown compiled %s even when valid MDX-shaped', field => {
    const rows = inventory(practiceSnapshot('after'))
    const row = rows.find(row => row.kind === (field === 'body' ? 'lesson' : 'problem'))!
    row.serialized[field] = compileFixture('unreviewed compiler output')
    expect(() => assertPracticePreparedCatalog(rows)).toThrow()
  })

  it.each(['unknown', 'title', 'difficulty', 'href', 'link', 'lessonContentId', 'access', 'order', 'sectionContentId'])(
    'freezes prepared %s metadata independently of approved type', field => {
      const rows = inventory(practiceSnapshot('after'))
      const kind = ['access', 'order', 'sectionContentId'].includes(field) ? 'lesson' : 'problem'
      const target = rows.find(row => row.kind === kind)!
      target.metadata[field] = field === 'order' ? 991 : 'foreign metadata'
      expect(() => assertPracticePreparedCatalog(rows)).toThrow(/metadata/)
    },
  )

  it.each(['course', 'section', 'resource', 'unselected-lesson', 'unselected-problem', 'data-types'])(
    'freezes all raw and compiled fields of %s rows', kind => {
      const baseline = inventory(practiceSnapshot('after'))
      const matches = (row: (typeof baseline)[number]) => kind === 'data-types'
        ? row.contentId === '/js-track/core-fundamentals/data-types'
        : kind === 'unselected-lesson' ? row.kind === 'lesson' && row.contentId.includes('/frozen-')
          : kind === 'unselected-problem' ? row.kind === 'problem' && row.contentId.includes('/frozen-problem-')
            : row.kind === kind
      for (const layer of ['text', 'serialized'] as const) {
        const rows = structuredClone(baseline), target = rows.find(matches)!
        const field = target.kind === 'problem' ? 'answer' : 'body'
        Object.assign(target[layer], { [field]: layer === 'text' ? 'foreign content' : compileFixture('foreign output') })
        expect(() => assertPracticePreparedCatalog(rows)).toThrow()
      }
    },
  )

  it.each(['missing', 'duplicate', 'added', 'renamed'])('rejects %s catalog identities', variant => {
    const rows = inventory(practiceSnapshot('after'))
    if (variant === 'missing') rows.splice(10, 1)
    if (variant === 'duplicate') rows.push(structuredClone(rows[10]))
    if (variant === 'added') rows.push({ ...structuredClone(rows[10]), contentId: '/new-identity' })
    if (variant === 'renamed') rows[10].contentId = '/renamed-identity'
    expect(() => assertPracticePreparedCatalog(rows)).toThrow()
  })

  it.each(['question', 'answer', 'compiled-question', 'compiled-answer', 'missing', 'owner'])(
    'freezes retained G3B/G3C %s rather than just recognizing their IDs', field => {
      for (const id of [G3B_TASK.contentId, G3C_TASK.contentId]) {
        const rows = inventory(practiceSnapshot('after')), index = rows.findIndex(row => row.contentId === id)
        if (field === 'missing') rows.splice(index, 1)
        else if (field === 'owner') rows[index].metadata.lessonContentId = '/foreign-owner'
        else if (field.startsWith('compiled-')) rows[index].serialized[field.slice(9) as 'question'] = compileFixture('foreign')
        else rows[index].text[field as 'question'] += ' changed'
        expect(() => assertPracticePreparedCatalog(rows)).toThrow()
      }
    },
  )

  it('rejects binary byte changes that are equal after UTF-8 replacement decoding', () => {
    const files = sourcePayload(practiceSnapshot())
    const filename = 'resources/fixture-resource-0/opaque.bin'
    const before = files.get(filename)!, after = Buffer.from([0xff, 0x81, 0x00])
    expect(before.toString('utf8')).toBe(after.toString('utf8'))
    expect(rawHash(before)).not.toBe(rawHash(after))
    files.set(filename, after)
    expect(() => assertPracticeSource(files)).toThrow(/metadata, neighbors or payload inventory/)
  })

  it.each(['question', 'answer', 'missing', 'duplicate'])('freezes retained native source %s', variant => {
    for (const contentId of [G3B_TASK.contentId, G3C_TASK.contentId]) {
      const files = sourcePayload(practiceSnapshot('after'))
      const parts = contentId.slice(1).split('/')
      const uid = parts.slice(0, -1).join('/'), id = parts.at(-1)!
      editSource(files, uid, lesson => {
        const index = lesson.problems.findIndex(problem => problem.id === id)
        if (variant === 'missing') lesson.problems.splice(index, 1)
        else if (variant === 'duplicate') lesson.problems.push({ ...lesson.problems[index] })
        else lesson.problems[index][variant] += ' foreign change'
      })
      expect(() => assertPracticeSource(files)).toThrow(/metadata, neighbors or payload inventory/)
    }
  })

  it.each(['unknown', 'access', 'order', 'title', 'difficulty', 'ownership', 'problem-order', 'lesson-order', 'neighbor'])(
    'freezes source %s outside the exact three assessment slots', variant => {
      const files = sourcePayload(practiceSnapshot('after'))
      editSource(files, TC, lesson => {
        if (variant === 'unknown') lesson.extra = { opaque: 'metadata' }
        if (variant === 'access') lesson.access = 'FREE'
        if (variant === 'order') lesson.order++
        if (variant === 'title') lesson.problems[0].title += ' renamed'
        if (variant === 'difficulty') lesson.problems[0].difficulty = 'HARD'
        if (variant === 'ownership') lesson.problems[0].lessonContentId = '/another'
        if (variant === 'problem-order') lesson.problems.reverse()
      })
      if (variant === 'lesson-order' || variant === 'neighbor') {
        const file = 'content/js-track/core-fundamentals/_lessons.json'
        const config = JSON.parse(files.get(file)!.toString('utf8'))
        if (variant === 'lesson-order') config.lessons.reverse()
        else config.lessons.find((lesson: { id: string }) => lesson.id === '/data-types').problems[0].answer += ' foreign'
        files.set(file, Buffer.from(JSON.stringify(config)))
      }
      expect(() => assertPracticeSource(files)).toThrow()
    },
  )

  it.each(['added-file', 'deleted-file', 'missing-body', 'missing-question', 'duplicate-question', 'unlisted-question', 'new-id'])(
    'rejects %s in the protected source inventory', variant => {
      const files = sourcePayload(practiceSnapshot())
      if (variant === 'added-file') files.set('content/unlisted.bin', Buffer.from('unlisted'))
      if (variant === 'deleted-file') files.delete('resources/fixture-resource-0/opaque.bin')
      if (variant === 'missing-body') files.delete(`content/${TC}/page.mdx`)
      if (!variant.endsWith('file') && variant !== 'missing-body') editSource(files, TC, lesson => {
        if (variant === 'missing-question') lesson.problems.pop()
        if (variant === 'duplicate-question') lesson.problems.push({ ...lesson.problems[0] })
        if (variant === 'unlisted-question') lesson.problems.push({ ...lesson.problems[0], id: 'unlisted' })
        if (variant === 'new-id') lesson.problems[0].id = 'renamed'
      })
      expect(() => assertPracticeSource(files)).toThrow()
    },
  )
})
