import { beforeEach, describe, expect, it, vi } from 'vitest'
import { G3B_LESSON_CONTENT_ID, G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_LESSON_CONTENT_ID, G3C_LESSON_UID, G3C_OLD_TASK_IDS, G3C_TASK } from '@/lib/g3c-task'
import { G3C_TASK_METADATA } from '@/lib/g3c-publication'
import { G3B_TASK_METADATA } from './catalog'
import { applyContentRelease, checkReleaseState, describeInPlacePlan, prepareContentRelease, readReleaseCatalog } from './plan'
import { ADDITIVE_CHANGE_CLASS, G3C_ADDITIVE_PROFILE, STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID, digest, type ReleaseScopeOptions } from './scope'
import { syntheticQuestion } from './g3c-fixtures'

const mocks = vi.hoisted(() => ({
  content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
  updateLesson: vi.fn(), updateProblem: vi.fn(), create: vi.fn(), findProblems: vi.fn(),
}))
vi.mock('../sync-content', () => ({ prepareContent: mocks.content }))
vi.mock('../sync-resources', () => ({ prepareResources: mocks.resources }))
vi.mock('./scope', async original => ({ ...(await original<typeof import('./scope')>()), assertInPlaceScope: mocks.scope }))
vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  return { ...actual, assertG3cQuestion: (question: unknown) => {
    if (question !== fixture.syntheticQuestion) throw new Error('Synthetic complete question binding mismatch')
  } }
})
vi.mock('@/lib/prisma', () => ({ default: {
  $transaction: mocks.transaction, course: { findMany: vi.fn() }, section: { findMany: vi.fn() },
  lesson: { findMany: vi.fn(), updateMany: mocks.updateLesson },
  problem: { findMany: mocks.findProblems, updateMany: mocks.updateProblem, create: mocks.create },
  resource: { findMany: vi.fn(), updateMany: vi.fn() },
} }))

const compiled = (value: string) => ({ compiledSource: `compiled: ${value}`, scope: {}, frontmatter: {} })
const g3cUuid = '11111111-2222-4333-8444-555555555555'
const g3bUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const options = { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3C_LESSON_UID } as const
function snapshot(added = false, mask = 0) {
  const courses = Array.from({ length: 2 }, (_, i) => ({
    contentId: `/course-${i}`, slug: `course-${i}`, title: 'Course', description: 'Stable',
    href: `/courses/course-${i}`, order: i, body: 'Course body.', serializedBody: compiled('Course body.'),
  }))
  const sections = Array.from({ length: 8 }, (_, i) => ({
    contentId: `/course-0/section-${i}`, slug: `section-${i}`, title: 'Section', description: 'Stable',
    courseSlug: 'course-0', href: `/courses/course-0/section-${i}`, order: i,
    body: 'Section body.', serializedBody: compiled('Section body.'),
  }))
  const lessons = Array.from({ length: 120 }, (_, i) => {
    const contentId = i < 2 ? [G3B_LESSON_CONTENT_ID, G3C_LESSON_CONTENT_ID][i] : `/course-0/section-0/lesson-${i}`
    const body = i === 1 && mask & 1 ? 'After body.' : 'Before body.'
    return { contentId, slug: contentId.split('/').pop()!, title: i === 1 ? 'Frontend Interviews' : 'Lesson',
      description: i === 1 ? 'Practice common frontend interview questions.' : 'Stable',
      href: `/courses${contentId}`, order: i === 1 ? 15 : i, access: 'PREMIUM',
      sectionContentId: sections[0].contentId, body, serializedBody: compiled(body) }
  })
  const problems = Array.from({ length: 506 }, (_, i) => {
    const contentId = i < 5 ? `${G3C_LESSON_CONTENT_ID}/${G3C_OLD_TASK_IDS[i]}` : `/course-0/section-0/lesson-2/problem-${i}`
    const answer = i < 5 && mask & (1 << (i + 1)) ? `After answer ${i}.` : `Before answer ${i}.`
    return { contentId, slug: contentId.split('/').pop()!, title: `Old question ${i}`, href: '',
      link: `/courses${contentId.slice(0, contentId.lastIndexOf('/'))}#${contentId.split('/').pop()}`,
      type: 'THEORY', difficulty: 'MEDIUM', lessonContentId: i < 5 ? G3C_LESSON_CONTENT_ID : lessons[2].contentId,
      question: `Old question ${i}.`, answer, serializedQuestion: compiled(`Old question ${i}.`), serializedAnswer: compiled(answer) }
  })
  problems.push({ ...G3B_TASK_METADATA, question: G3B_TASK.question, answer: 'Complete retained G3B answer.',
    serializedQuestion: compiled(G3B_TASK.question), serializedAnswer: compiled('Complete retained G3B answer.') })
  if (added) problems.push({ ...G3C_TASK_METADATA, question: syntheticQuestion, answer: 'Complete reviewed synthetic G3C answer.',
    serializedQuestion: compiled(syntheticQuestion), serializedAnswer: compiled('Complete reviewed synthetic G3C answer.') })
  const resources = Array.from({ length: 33 }, (_, i) => ({
    contentId: `/resource-${i}`, slug: `resource-${i}`, title: 'Resource', description: 'Stable',
    href: `/resources/resource-${i}`, order: i, access: 'FREE', lessonSlug: lessons[2].slug,
    sectionSlug: sections[0].slug, courseSlug: courses[0].slug,
    body: 'Resource body.', serializedBody: compiled('Resource body.'),
  }))
  return { content: { courses, sections, lessons, problems }, resources }
}
function database(source: ReturnType<typeof snapshot>) {
  const updatedAt = new Date('2026-09-16T20:00:00Z')
  return [
    source.content.courses.map((course, i) => ({ ...course, id: `course-${i}`, updatedAt })),
    source.content.sections.map(({ courseSlug, ...section }, i) => ({ ...section, id: `section-${i}`, updatedAt, course: { slug: courseSlug } })),
    source.content.lessons.map(({ sectionContentId, ...lesson }, i) => ({
      ...lesson, id: `lesson-${i}`, updatedAt, sectionId: 'section-0', section: { contentId: sectionContentId },
    })),
    source.content.problems.map(({ lessonContentId, ...problem }, i) => ({
      ...problem, updatedAt, id: problem.contentId === G3C_TASK.contentId ? g3cUuid : problem.contentId === G3B_TASK.contentId ? g3bUuid : `problem-${i}`,
      lessonId: `lesson-${source.content.lessons.findIndex(lesson => lesson.contentId === lessonContentId)}`,
      lesson: { contentId: lessonContentId },
    })),
    source.resources.map(({ lessonSlug, sectionSlug, courseSlug, ...resource }, i) => ({
      ...resource, id: `resource-${i}`, updatedAt, lessonId: 'lesson-2',
      lesson: { slug: lessonSlug, section: { slug: sectionSlug, course: { slug: courseSlug } } },
    })),
  ] as const
}
let live = database(snapshot())
let target = database(snapshot(true, 63))
async function prepare(first = snapshot(), second = snapshot(true, 63), scope: ReleaseScopeOptions = options) {
  mocks.scope.mockReturnValue({
    changedFiles: [], addition: first.content.problems.length === 507 && second.content.problems.length === 508
      ? { contentId: G3C_TASK.contentId } : undefined,
    structural: { profile: G3C_ADDITIVE_PROFILE, allowedChangedFields: [
      { contentId: G3C_LESSON_CONTENT_ID, field: 'body' },
      ...G3C_OLD_TASK_IDS.map(id => ({ contentId: `${G3C_LESSON_CONTENT_ID}/${id}`, field: 'answer' })),
    ] },
  })
  mocks.content.mockResolvedValueOnce(first.content).mockResolvedValueOnce(second.content)
  mocks.resources.mockResolvedValueOnce(first.resources).mockResolvedValueOnce(second.resources)
  return prepareContentRelease('/synthetic-base', '/synthetic-candidate', scope)
}
beforeEach(() => {
  vi.resetAllMocks()
  live = database(snapshot())
  target = database(snapshot(true, 63))
  mocks.transaction.mockImplementation(async () => live)
  mocks.create.mockImplementation(async () => {
    const created = structuredClone(target[3].at(-1)!)
    live[3].push(created)
    return created
  })
  mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR ? live[3].filter(problem =>
    problem.contentId === G3C_TASK.contentId || (problem.lessonId === 'lesson-1' && problem.slug === G3C_TASK.slug)) : undefined)
  mocks.updateLesson.mockImplementation(async ({ where }) => {
    const index = live[2].findIndex(lesson => lesson.contentId === where.contentId)
    live[2][index] = target[2][index]
    return { count: 1 }
  })
  mocks.updateProblem.mockImplementation(async ({ where }) => {
    const index = live[3].findIndex(problem => problem.contentId === where.contentId)
    live[3][index] = target[3][index]
    return { count: 1 }
  })
})

describe('G3C complete-catalog publication capability (mock services, synthetic binding)', () => {
  it('plans deterministically at 507 -> 508 and creates one complete task before six conditional old-field changes', async () => {
    const plan = await prepare()
    const described = describeInPlacePlan(plan)
    expect(described).toMatchObject({
      profile: G3C_ADDITIVE_PROFILE, inventories: { before: { counts: { problems: 507 } }, candidate: { counts: { problems: 508 } } },
      createdEntities: [{ contentId: G3C_TASK.contentId, questionSha256: digest(syntheticQuestion),
        answerSha256: digest('Complete reviewed synthetic G3C answer.'), serializedSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }],
    })
    expect(describeInPlacePlan(await prepare())).toEqual(described)
    expect(plan.creations).toHaveLength(1)
    expect(plan.changes).toHaveLength(6)
    const receipts: unknown[] = []
    expect((await applyContentRelease(plan, receipt => { receipts.push(receipt) }))[0]).toEqual({
      kind: 'problem', contentId: G3C_TASK.contentId, status: 'created', id: g3cUuid,
    })
    const data = mocks.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      contentId: G3C_TASK.contentId, question: syntheticQuestion, answer: 'Complete reviewed synthetic G3C answer.',
      serializedQuestion: compiled(syntheticQuestion), serializedAnswer: compiled('Complete reviewed synthetic G3C answer.'),
      lesson: { connect: { id: 'lesson-1', AND: expect.objectContaining({ contentId: G3C_LESSON_CONTENT_ID, body: 'Before body.' }) } },
    })
    expect(Object.keys(data)).not.toEqual(expect.arrayContaining(['id', 'order', 'userProblemProgress']))
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.updateLesson.mock.invocationCallOrder[0])
    expect(mocks.updateLesson.mock.calls[0][0].data).toEqual({ body: 'After body.', serializedBody: compiled('After body.') })
    expect(mocks.updateProblem.mock.calls[0][0].where).toMatchObject({
      id: 'problem-0', lessonId: 'lesson-1', question: 'Old question 0.', answer: 'Before answer 0.',
      serializedQuestion: { equals: compiled('Old question 0.') }, serializedAnswer: { equals: compiled('Before answer 0.') },
    })
    expect(live[3].find(problem => problem.contentId === G3B_TASK.contentId)?.id).toBe(g3bUuid)
    expect(receipts).toHaveLength(7)
  })
  it('blocks dependent writes on an unclassified failed receipt and inspects the same UUID on retry', async () => {
    const plan = await prepare()
    mocks.create.mockImplementationOnce(async () => {
      live[3].push(structuredClone(target[3].at(-1)!))
      throw new Error('Unclassified lost create response')
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/lost create/)
    expect(mocks.updateLesson).not.toHaveBeenCalled()
    expect((await applyContentRelease(plan))[0]).toMatchObject({ status: 'already-created', id: g3cUuid })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it.each([
    { code: 'P1017' }, { code: 'ECONNRESET' }, { code: 'P2002', meta: { target: ['contentId'] } },
    { code: 'P2002', meta: { target: ['lessonId', 'slug'] } },
  ])('inspects the complete canonical row after an uncertain/unique conflict %j', async error => {
    const plan = await prepare()
    mocks.create.mockImplementationOnce(async () => {
      live[3].push(structuredClone(target[3].at(-1)!))
      throw Object.assign(new Error('Uncertain receipt'), error)
    })
    expect((await applyContentRelease(plan))[0]).toMatchObject({ status: 'already-created', id: g3cUuid })
    expect(mocks.findProblems).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ contentId: G3C_TASK.contentId }, { lessonId: 'lesson-1', slug: G3C_TASK.slug }] },
    }))
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it.each(['missing', 'duplicate', 'uuid', 'owner', 'identity', 'question', 'answer', 'compiled-question', 'compiled-answer', 'metadata'])(
    'rejects a %s receipt before dependent old-field writes', async variant => {
      const plan = await prepare()
      const receipt = structuredClone(target[3].at(-1)!)
      if (variant === 'uuid') receipt.id = 'not-a-uuid'
      if (variant === 'owner') receipt.lessonId = 'another-owner-row-id'
      if (variant === 'identity') receipt.contentId = '/foreign-identity'
      if (variant === 'question') receipt.question += ' foreign setup'
      if (variant === 'answer') receipt.answer += ' foreign answer'
      if (variant === 'compiled-question') receipt.serializedQuestion = compiled('foreign')
      if (variant === 'compiled-answer') receipt.serializedAnswer = compiled('foreign')
      if (variant === 'metadata') receipt.difficulty = 'EASY'
      mocks.create.mockRejectedValueOnce(Object.assign(new Error('Uncertain receipt'), { code: 'P1017' }))
      mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR
        ? variant === 'missing' ? [] : variant === 'duplicate' ? [receipt, receipt] : [receipt] : undefined)
      await expect(applyContentRelease(plan)).rejects.toThrow()
      expect(mocks.updateLesson).not.toHaveBeenCalled()
      expect(mocks.updateProblem).not.toHaveBeenCalled()
    },
  )
  it('keeps creation durable but stops on receipt-journal failure or an old authored race', async () => {
    const plan = await prepare()
    await expect(applyContentRelease(plan, () => { throw new Error('Receipt journal failed') })).rejects.toThrow(/journal/)
    expect(mocks.updateLesson).not.toHaveBeenCalled()
    mocks.updateLesson.mockResolvedValueOnce({ count: 0 })
    await expect(applyContentRelease(plan)).rejects.toThrow(/Concurrent authored/)
    expect(mocks.updateProblem).not.toHaveBeenCalled()
    expect((await applyContentRelease(plan))[0]).toMatchObject({ status: 'already-created', id: g3cUuid })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
  it('admits all 64 raw/compiled mixed authored states only after complete creation', async () => {
    const plan = await prepare()
    for (let mask = 0; mask < 64; mask += 1) {
      live = database(snapshot(true, mask))
      expect(checkReleaseState(plan, await readReleaseCatalog()).size).toBe(671)
    }
    live = database(snapshot(false, 1))
    await expect(applyContentRelease(plan)).rejects.toThrow(/without the complete G3C/)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('retains both genuine task IDs through 508 -> 508 authored recovery without recreation or progress writes', async () => {
    const current = snapshot(true, 63), recovery = snapshot(true)
    live = database(current)
    target = database(recovery)
    const identities = live[3].map(problem => problem.id)
    const plan = await prepare(current, recovery)
    expect(plan.creations).toEqual([])
    expect((await applyContentRelease(plan))[0]).toMatchObject({ status: 'already-created', id: g3cUuid })
    expect(live[3].map(problem => problem.id)).toEqual(identities)
    expect(live[3]).toHaveLength(508)
    expect(live[2][1].body).toBe('Before body.')
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.updateProblem.mock.calls.every(([args]) => args.where.contentId !== G3C_TASK.contentId && args.where.contentId !== G3B_TASK.contentId)).toBe(true)
  })
  it('allows future default, TS and G3B no-ops at 508 without acquiring G3C creation or task-edit rights', async () => {
    const source = snapshot(true)
    for (const scope of [{}, { changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID },
      { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3B_LESSON_UID }] satisfies ReleaseScopeOptions[]) {
      const plan = await prepare(source, source, scope)
      expect(plan.changes).toEqual([])
      expect(plan.creations).toEqual([])
      expect(describeInPlacePlan(plan).inventories.candidate.counts.problems).toBe(508)
      for (const field of ['question', 'answer', 'serializedQuestion', 'serializedAnswer'] as const) {
        const changed = snapshot(true)
        const task = changed.content.problems.at(-1)!
        if (field === 'question' || field === 'answer') task[field] += ' changed'
        else task[field] = compiled('changed')
        await expect(prepare(source, changed, scope)).rejects.toThrow()
      }
    }
    await expect(prepare(snapshot(), snapshot(true), {})).rejects.toThrow(/addition/)
  })
  it('rejects dropped/foreign/incomplete catalog rows or serialized task payloads before database access', async () => {
    for (const mutate of [
      (source: ReturnType<typeof snapshot>) => { source.content.problems.splice(0, 1) },
      (source: ReturnType<typeof snapshot>) => { source.content.problems.splice(506, 1) },
      (source: ReturnType<typeof snapshot>) => { source.content.problems.push({ ...source.content.problems[0], contentId: '/foreign-task' }) },
      (source: ReturnType<typeof snapshot>) => { source.content.problems.at(-1)!.serializedQuestion.compiledSource = '' },
      (source: ReturnType<typeof snapshot>) => { source.content.problems.at(-1)!.serializedAnswer.compiledSource = '' },
    ]) {
      const invalid = snapshot(true)
      mutate(invalid)
      await expect(prepare(snapshot(), invalid)).rejects.toThrow()
    }
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
