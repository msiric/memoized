import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  G7_CHANGE_CLASS, G7_CONTRACTS, G7_DATA_TYPES, G7_TYPE_COERCION, G7_PROFILE,
  g7LessonMetadata, g7ProblemMetadata, type G7LessonUid,
} from '@/lib/g7-contracts'
import { G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_LESSON_CONTENT_ID, G3C_TASK } from '@/lib/g3c-task'
import { G3C_TASK_METADATA } from '@/lib/g3c-publication'
import { G3B_TASK_METADATA } from './catalog'
import { compiledG7 as compiled, syntheticG7Body, syntheticG7Lesson } from './g7-fixtures'
import { syntheticQuestion } from './g3c-fixtures'
import {
  applyContentRelease, checkReleaseState, describeInPlacePlan, prepareContentRelease, readReleaseCatalog,
  type ChangeResult,
} from './plan'
import { digest, type ReleaseScopeOptions } from './scope'
import type { PreparedContent } from '../sync-content'

const mocks = vi.hoisted(() => ({
  content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
  updateLesson: vi.fn(), updateProblem: vi.fn(), create: vi.fn(), findProblems: vi.fn(),
}))
vi.mock('../sync-content', () => ({ prepareContent: mocks.content }))
vi.mock('../sync-resources', () => ({ prepareResources: mocks.resources }))
vi.mock('./scope', async original => ({ ...(await original<typeof import('./scope')>()), assertInPlaceScope: mocks.scope }))
vi.mock('@/lib/g7-contracts', async original => {
  const actual = await original<typeof import('@/lib/g7-contracts')>()
  const fixture = await import('./g7-fixtures')
  return fixture.bindSyntheticG7(actual)
})
vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  return { ...actual, assertG3cQuestion: (value: unknown) => {
    if (value !== fixture.syntheticQuestion) throw new Error('Synthetic retained G3C question mismatch')
  } }
})
vi.mock('@/lib/prisma', () => ({ default: {
  $transaction: mocks.transaction, course: { findMany: vi.fn() }, section: { findMany: vi.fn() },
  lesson: { findMany: vi.fn(), updateMany: mocks.updateLesson },
  problem: { findMany: mocks.findProblems, updateMany: mocks.updateProblem, create: mocks.create },
  resource: { findMany: vi.fn(), updateMany: vi.fn() },
} }))

const options = { changeClass: G7_CHANGE_CLASS, lesson: G7_DATA_TYPES } as const
function snapshot(mask = 0, selected: G7LessonUid = G7_DATA_TYPES) {
  const courses = Array.from({ length: 2 }, (_, i) => ({
    contentId: `/course-${i}`, slug: `course-${i}`, title: 'Course', description: 'Frozen',
    href: `/courses/course-${i}`, order: i, body: 'Course body.', serializedBody: compiled('Course body.'),
  }))
  const sections = Array.from({ length: 8 }, (_, i) => ({
    contentId: i ? `/course-0/section-${i}` : '/js-track/core-fundamentals', slug: i ? `section-${i}` : 'core-fundamentals',
    title: 'Section', description: 'Frozen', courseSlug: 'course-0', href: `/courses/course-0/section-${i}`, order: i,
    body: 'Section body.', serializedBody: compiled('Section body.'),
  }))
  const lessons = Array.from({ length: 120 }, (_, i) => {
    const uid = i === 0 ? G7_DATA_TYPES : i === 1 ? G7_TYPE_COERCION : undefined
    const contentId = i === 2 ? G3B_LESSON_CONTENT_ID : i === 3 ? G3C_LESSON_CONTENT_ID : `/course-0/section-0/lesson-${i}`
    const body = uid ? syntheticG7Body(G7_CONTRACTS[uid], uid === selected && Boolean(mask & 1)) : 'Frozen lesson body.'
    const metadata = uid ? g7LessonMetadata(uid) : {
      contentId, slug: contentId.split('/').pop()!, title: 'Frozen lesson', description: 'Frozen', href: `/courses${contentId}`,
      order: i, access: 'FREE' as const, sectionContentId: sections[0].contentId,
    }
    return { ...metadata, body, serializedBody: compiled(body) }
  })
  const problems: PreparedContent['problems'] = Array.from({ length: 506 }, (_, i) => {
    if (i < 12) {
      const uid = i < 6 ? G7_DATA_TYPES : G7_TYPE_COERCION
      const index = i % 6
      const after = uid === selected && Boolean(mask & (1 << (index + 1)))
      const problem = syntheticG7Lesson(G7_CONTRACTS[uid], after).problems[index]
      return { ...g7ProblemMetadata(uid, G7_CONTRACTS[uid].problems[index], problem.type),
        difficulty: index === 5 ? 'HARD' : index === 0 || index === 3 || index === 4 ? 'EASY' : 'MEDIUM',
        question: problem.question, answer: problem.answer, serializedQuestion: compiled(problem.question), serializedAnswer: compiled(problem.answer) }
    }
    const contentId = `${lessons[4].contentId}/problem-${i}`
    return { contentId, slug: `problem-${i}`, title: `Frozen question ${i}`, href: '',
      link: `${lessons[4].href}#problem-${i}`, type: i < 341 ? 'THEORY' : 'CODING', difficulty: 'MEDIUM',
      lessonContentId: lessons[4].contentId, question: 'Frozen question.', answer: 'Frozen answer.',
      serializedQuestion: compiled('Frozen question.'), serializedAnswer: compiled('Frozen answer.') }
  })
  // Preserve the immutable per-item difficulty rather than normalizing neighbors.
  for (const uid of [G7_DATA_TYPES, G7_TYPE_COERCION] as const) {
    const offset = uid === G7_DATA_TYPES ? 0 : 6
    G7_CONTRACTS[uid].problems.forEach((frozen, index) => {
      const difficulty = frozen.difficulty
      if (difficulty !== 'EASY' && difficulty !== 'MEDIUM' && difficulty !== 'HARD') throw new Error('Invalid fixture difficulty')
      problems[offset + index].difficulty = difficulty
    })
  }
  problems.push({ ...G3B_TASK_METADATA, question: G3B_TASK.question, answer: 'Complete retained G3B feedback.',
    serializedQuestion: compiled(G3B_TASK.question), serializedAnswer: compiled('Complete retained G3B feedback.') })
  problems.push({ ...G3C_TASK_METADATA, question: syntheticQuestion, answer: 'Complete retained G3C feedback.',
    serializedQuestion: compiled(syntheticQuestion), serializedAnswer: compiled('Complete retained G3C feedback.') })
  const resources = Array.from({ length: 33 }, (_, i) => ({
    contentId: `/resource-${i}`, slug: `resource-${i}`, title: 'Resource', description: 'Frozen',
    href: `/resources/resource-${i}`, order: i, access: 'FREE', lessonSlug: lessons[4].slug,
    sectionSlug: sections[0].slug, courseSlug: courses[0].slug,
    body: 'Resource body.', serializedBody: compiled('Resource body.'),
  }))
  return { content: { courses, sections, lessons, problems }, resources }
}
function database(source: ReturnType<typeof snapshot>) {
  const updatedAt = new Date('2026-09-17T23:28:08Z')
  return [
    source.content.courses.map((row, i) => ({ ...row, id: `course-${i}`, updatedAt })),
    source.content.sections.map(({ courseSlug, ...row }, i) => ({ ...row, id: `section-${i}`, updatedAt, course: { slug: courseSlug } })),
    source.content.lessons.map(({ sectionContentId, ...row }, i) => ({
      ...row, id: `lesson-${i}`, updatedAt, sectionId: 'section-0', section: { contentId: sectionContentId },
    })),
    source.content.problems.map(({ lessonContentId, ...row }, i) => ({
      ...row, updatedAt, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      lessonId: `lesson-${source.content.lessons.findIndex(lesson => lesson.contentId === lessonContentId)}`,
      lesson: { contentId: lessonContentId },
    })),
    source.resources.map(({ lessonSlug, sectionSlug, courseSlug, ...row }, i) => ({
      ...row, id: `resource-${i}`, updatedAt, lessonId: 'lesson-4',
      lesson: { slug: lessonSlug, section: { slug: sectionSlug, course: { slug: courseSlug } } },
    })),
  ] as const
}
let live = database(snapshot())
async function prepare(first = snapshot(), second = snapshot(127), scope: ReleaseScopeOptions = options) {
  const lesson = scope.lesson === G7_TYPE_COERCION ? G7_TYPE_COERCION : G7_DATA_TYPES
  mocks.scope.mockReturnValue({
    changedFiles: [], assessment: { bindingSha256: 'a'.repeat(64) },
    structural: { profile: G7_PROFILE, allowedChangedFields: [
      { contentId: `/${lesson}`, field: 'body' },
      ...G7_CONTRACTS[lesson].problems.map(problem => ({
        contentId: `/${lesson}/${problem.id}`,
        field: G7_CONTRACTS[lesson].changedQuestions.includes(problem.id) ? 'assessment' : 'answer',
      })),
    ] },
  })
  mocks.content.mockResolvedValueOnce(first.content).mockResolvedValueOnce(second.content)
  mocks.resources.mockResolvedValueOnce(first.resources).mockResolvedValueOnce(second.resources)
  return prepareContentRelease('/synthetic-base', '/synthetic-candidate', scope)
}
beforeEach(() => {
  vi.resetAllMocks()
  live = database(snapshot())
  mocks.transaction.mockImplementation(async () => live)
  mocks.updateLesson.mockImplementation(async ({ where, data }) => {
    const index = live[2].findIndex(row => row.contentId === where.contentId)
    Object.assign(live[2][index], data)
    return { count: 1 }
  })
  mocks.updateProblem.mockImplementation(async ({ where, data }) => {
    const index = live[3].findIndex(row => row.contentId === where.contentId)
    Object.assign(live[3][index], data)
    return { count: 1 }
  })
  mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR
    ? live[3].filter(row => where.OR.some((condition: { id?: string; contentId?: string }) =>
      condition.id === row.id || condition.contentId === row.contentId)) : undefined)
})

describe('G7 complete-catalog atomic existing assessments (mock database, synthetic binding)', () => {
  it('plans read-only/deterministically and writes each existing assessment in exactly one conditional update', async () => {
    const plan = await prepare()
    const description = describeInPlacePlan(plan)
    expect(description).toMatchObject({ profile: G7_PROFILE })
    expect(description.inventories.before).toEqual(description.inventories.candidate)
    expect(description.inventories.candidate.counts.problems).toBe(508)
    expect(plan.creations).toEqual([])
    expect(plan.changes).toHaveLength(7)
    expect(plan.changes.filter(change => change.field === 'assessment')).toHaveLength(2)
    expect(digest(JSON.stringify(description))).toBe(digest(JSON.stringify(describeInPlacePlan(await prepare()))))
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.updateProblem).not.toHaveBeenCalled()
    const journal: ChangeResult[] = []
    const identities = live[3].map(row => row.id)
    await applyContentRelease(plan, receipt => { journal.push(receipt) })
    const writes = mocks.updateProblem.mock.calls.filter(([args]) => Object.hasOwn(args.data, 'question'))
    expect(writes).toHaveLength(2)
    const clone = writes[1][0]
    expect(Object.keys(clone.data).sort()).toEqual(['answer', 'question', 'serializedAnswer', 'serializedQuestion', 'type'])
    expect(clone.data.type).toBe('CODING')
    expect(clone.where).toMatchObject({
      id: identities[5], lessonId: 'lesson-0', type: 'THEORY', difficulty: 'HARD', href: '',
      question: snapshot().content.problems[5].question, answer: snapshot().content.problems[5].answer,
      serializedQuestion: { equals: snapshot().content.problems[5].serializedQuestion },
      serializedAnswer: { equals: snapshot().content.problems[5].serializedAnswer },
    })
    expect(journal.filter(receipt => receipt.field === 'assessment').map(receipt => receipt.id)).toEqual([identities[1], identities[5]])
    expect(live[3].map(row => row.id)).toEqual(identities)
    expect(live[3].filter(row => row.type === 'THEORY')).toHaveLength(340)
    expect(live[3].filter(row => row.type === 'CODING')).toHaveLength(168)
    expect(mocks.create).not.toHaveBeenCalled()
    const calls = mocks.updateProblem.mock.calls.length
    expect((await applyContentRelease(plan)).every(receipt => receipt.status === 'already-applied')).toBe(true)
    expect(mocks.updateProblem).toHaveBeenCalledTimes(calls)
  })
  it('admits all 128 independent row states, but never a question/answer/type cross-product', async () => {
    const plan = await prepare()
    for (let mask = 0; mask < 128; mask++) {
      live = database(snapshot(mask))
      expect(checkReleaseState(plan, await readReleaseCatalog()).size).toBe(671)
    }
    for (const field of ['question', 'answer', 'serializedQuestion', 'serializedAnswer', 'type'] as const) {
      live = database(snapshot())
      Object.assign(live[3][5], { [field]: database(snapshot(127))[3][5][field] })
      await expect(applyContentRelease(plan)).rejects.toThrow(/Unexpected database content/)
    }
    expect(mocks.updateProblem).not.toHaveBeenCalled()
  })
  it.each(['question', 'answer', 'serializedQuestion', 'serializedAnswer', 'difficulty', 'href', 'lessonContentId', 'type'] as const)(
    'rejects incomplete/unapproved prepared %s before any database read', async field => {
      const candidate = snapshot(127)
      const row = candidate.content.problems[5]
      if (field === 'serializedQuestion' || field === 'serializedAnswer') row[field] = compiled('unreviewed serialization')
      else if (field === 'difficulty') row.difficulty = 'EASY'
      else if (field === 'type') row.type = 'THEORY'
      else row[field] += 'unreviewed payload'
      await expect(prepare(snapshot(), candidate)).rejects.toThrow()
      expect(mocks.transaction).not.toHaveBeenCalled()
    },
  )
  it.each(['question', 'answer', 'serializedQuestion', 'serializedAnswer'] as const)(
    'freezes retained G3B and G3C %s payloads, not only their IDs', async field => {
      for (const index of [506, 507]) {
        const candidate = snapshot(127), problem = candidate.content.problems[index]
        if (field === 'question' || field === 'answer') problem[field] += ' foreign change'
        else problem[field] = compiled('foreign')
        await expect(prepare(snapshot(), candidate)).rejects.toThrow()
      }
    },
  )
  it.each([{ code: 'P1017' }, { code: 'ECONNRESET' }, { code: 'ETIMEDOUT' }, { code: 'P1008' }])(
    'inspects the same complete row on uncertain receipt %j without blindly retrying', async error => {
      const plan = await prepare()
      const original = mocks.updateProblem.getMockImplementation()!
      mocks.updateProblem.mockImplementationOnce(original).mockImplementationOnce(async args => {
        await original(args)
        throw Object.assign(new Error('lost update receipt'), error)
      })
      const receipts = await applyContentRelease(plan)
      expect(receipts.find(receipt => receipt.contentId.endsWith('/modern-array-methods-at-findlast-findlastindex'))?.status).toBe('already-applied')
      expect(mocks.findProblems).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [{ id: live[3][1].id }, { contentId: live[3][1].contentId }] },
      }))
      expect(mocks.updateProblem).toHaveBeenCalledTimes(6)
      expect(mocks.create).not.toHaveBeenCalled()
    },
  )
  it.each(['missing', 'ambiguous', 'before', 'uuid', 'owner', 'metadata', 'question', 'answer', 'compiled-question', 'compiled-answer'])(
    'fails closed after a racing/uncertain %s receipt', async variant => {
      const plan = await prepare()
      const receipt = database(snapshot(127))[3][1]
      if (variant === 'uuid') receipt.id = 'foreign-uuid'
      if (variant === 'owner') receipt.lessonId = 'foreign-owner'
      if (variant === 'metadata') receipt.difficulty = 'HARD'
      if (variant === 'question') receipt.question += ' foreign'
      if (variant === 'answer') receipt.answer += ' foreign'
      if (variant === 'compiled-question') receipt.serializedQuestion = compiled('foreign')
      if (variant === 'compiled-answer') receipt.serializedAnswer = compiled('foreign')
      mocks.updateProblem.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 })
      mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR
        ? variant === 'missing' ? [] : variant === 'ambiguous' ? [receipt, receipt]
          : variant === 'before' ? [database(snapshot())[3][1]] : [receipt] : undefined)
      await expect(applyContentRelease(plan)).rejects.toThrow(/receipt/)
      expect(mocks.updateProblem).toHaveBeenCalledTimes(2)
      expect(mocks.create).not.toHaveBeenCalled()
    },
  )
  it('accepts a complete same-UUID concurrent winner but rejects final foreign drift', async () => {
    const plan = await prepare()
    const original = mocks.updateProblem.getMockImplementation()!
    mocks.updateProblem.mockImplementationOnce(original).mockImplementationOnce(async args => {
      await original(args)
      return { count: 0 }
    })
    await expect(applyContentRelease(plan)).resolves.toHaveLength(7)
    live = database(snapshot())
    mocks.updateProblem.mockImplementation(original)
    await expect(applyContentRelease(plan, receipt => {
      if (receipt.contentId.endsWith('/implement-deepclone-structural-deep-copy')) live[3][5].title = 'foreign title'
    })).rejects.toThrow(/Unexpected database content/)
  })
  it('preserves complete durable updates across unknown failures and journal failures, then retries and recovers without UUID replacement', async () => {
    const plan = await prepare()
    const original = mocks.updateProblem.getMockImplementation()!
    mocks.updateProblem.mockImplementationOnce(original).mockImplementationOnce(async args => {
      await original(args)
      throw new Error('unclassified response failure')
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/unclassified/)
    expect(mocks.findProblems.mock.calls.every(([args]) => !args?.where?.OR)).toBe(true)
    await expect(applyContentRelease(plan, receipt => {
      if (receipt.field === 'assessment') throw new Error('receipt journal failed')
    })).rejects.toThrow(/journal failed/)
    const identities = live[3].map(row => row.id)
    await applyContentRelease(plan)
    const recovery = await prepare(snapshot(127), snapshot())
    await applyContentRelease(recovery)
    expect(live[3].map(row => row.id)).toEqual(identities)
    expect(live[3][5].type).toBe('THEORY')
    expect(live[3][5].answer).toBe(snapshot().content.problems[5].answer)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('covers only the approved future Coercion assessment with a synthetic binding, never Data Types questions', async () => {
    const scope = { changeClass: G7_CHANGE_CLASS, lesson: G7_TYPE_COERCION } as const
    live = database(snapshot())
    const plan = await prepare(snapshot(), snapshot(127, G7_TYPE_COERCION), scope)
    expect(plan.changes.filter(change => change.field === 'assessment').map(change => change.contentId))
      .toEqual([`/${G7_TYPE_COERCION}/implement-deepequal-structural-equality`])
    await applyContentRelease(plan)
    expect(live[3][5].type).toBe('THEORY')
    expect(live[3][11].type).toBe('CODING')
  })
  it('selectively reverses one complete assessment, then one independent answer, retaining every other candidate row and UUID', async () => {
    live = database(snapshot(127))
    const published = structuredClone(live)
    const cloneRestored = 127 & ~(1 << 6)
    const assessmentRecovery = await prepare(snapshot(127), snapshot(cloneRestored))
    expect(assessmentRecovery.creations).toEqual([])
    expect(assessmentRecovery.changes).toMatchObject([{
      kind: 'problem', contentId: `/${G7_DATA_TYPES}/implement-deepclone-structural-deep-copy`, field: 'assessment',
      before: { type: 'CODING' }, after: { type: 'THEORY' },
    }])
    await applyContentRelease(assessmentRecovery)
    expect(mocks.updateProblem).toHaveBeenCalledTimes(1)
    expect(live[2]).toEqual(published[2])
    expect(live[3].filter((_, index) => index !== 5)).toEqual(published[3].filter((_, index) => index !== 5))
    expect(live[3][5]).toEqual(database(snapshot())[3][5])
    const answerRestored = cloneRestored & ~(1 << 1)
    const answerRecovery = await prepare(snapshot(cloneRestored), snapshot(answerRestored))
    expect(answerRecovery.changes).toMatchObject([{
      kind: 'problem', contentId: `/${G7_DATA_TYPES}/primitives-vs-objects`, field: 'answer',
    }])
    await applyContentRelease(answerRecovery)
    expect(mocks.updateProblem).toHaveBeenCalledTimes(2)
    expect(Object.keys(mocks.updateProblem.mock.calls[1][0].data).sort()).toEqual(['answer', 'serializedAnswer'])
    expect(live).toEqual(database(snapshot(answerRestored)))
    expect(live[3].map(row => row.id)).toEqual(published[3].map(row => row.id))
    expect(mocks.updateLesson).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('truthfully identifies G7 rather than G3B when prepared changes escape the selected fields', async () => {
    const candidate = snapshot(127)
    candidate.content.problems[20].answer = 'Unapproved neighboring answer.'
    candidate.content.problems[20].serializedAnswer = compiled(candidate.content.problems[20].answer)
    await expect(prepare(snapshot(), candidate)).rejects.toThrow(/outside the selected G7 fields/)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it('keeps existing 506/507/508 default baselines and rejects 505, unknown additions, removals and compiled-only drift', async () => {
    for (const count of [506, 507, 508]) {
      const source = snapshot()
      source.content.problems.length = count
      expect((await prepare(source, source, {})).changes).toEqual([])
    }
    for (const count of [505, 507]) {
      const missing = snapshot()
      missing.content.problems.splice(10, 508 - count)
      await expect(prepare(snapshot(), missing)).rejects.toThrow(/inventory/)
    }
    const unknown = snapshot()
    unknown.content.problems.push({ ...unknown.content.problems[0], contentId: '/unknown' })
    await expect(prepare(snapshot(), unknown)).rejects.toThrow(/inventory/)
    const changed = snapshot(127)
    changed.content.problems[20].serializedAnswer = compiled('foreign compiler output')
    await expect(prepare(snapshot(), changed)).rejects.toThrow(/unchanged authored/)
  })
})
