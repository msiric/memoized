import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyContentRelease, applyInPlaceRelease, checkReleaseState, describeInPlacePlan, planInPlaceRelease, prepareContentRelease, readReleaseCatalog } from './plan'
import { ADDITIVE_CHANGE_CLASS, ADDITIVE_PROFILE, STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID, digest } from './scope'
import { G3B_CARD_ORDER, G3B_LESSON_CONTENT_ID, G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3B_TASK_METADATA } from './catalog'

const mocks = vi.hoisted(() => ({
  content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
  lesson: vi.fn(), problem: vi.fn(), resource: vi.fn(),
  create: vi.fn(), findProblems: vi.fn(),
  stats: { courses: 1, sections: 1, lessons: 1, problems: 1, resources: 1 },
}))
vi.mock('../sync-content', () => ({ prepareContent: mocks.content }))
vi.mock('../sync-resources', () => ({ prepareResources: mocks.resources }))
vi.mock('./scope', async (original) => ({
  ...(await original<typeof import('./scope')>()),
  assertInPlaceScope: mocks.scope,
}))
vi.mock('@/constants/content-stats', () => ({
  CONTENT_STATS: mocks.stats,
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
    course: { findMany: vi.fn() }, section: { findMany: vi.fn() },
    lesson: { findMany: vi.fn(), updateMany: mocks.lesson },
    problem: { findMany: mocks.findProblems, updateMany: mocks.problem, create: mocks.create },
    resource: { findMany: vi.fn(), updateMany: mocks.resource },
  },
}))

const compiled = (text: string) => ({ compiledSource: `compiled: ${text}`, scope: {}, frontmatter: {} })

function snapshot(version: string) {
  const course = {
    contentId: '/course', slug: 'course', title: 'Course', description: 'Course',
    href: '/courses/course', order: 0, body: '# Course', serializedBody: compiled('# Course'),
  }
  const section = {
    contentId: '/course/section', slug: 'section', title: 'Section', description: 'Section',
    href: '/courses/course/section', order: 0, courseSlug: 'course',
    body: '# Section', serializedBody: compiled('# Section'),
  }
  const lesson = {
    contentId: '/course/section/example', slug: 'example', title: 'Example', description: 'Example',
    href: '/courses/course/section/example', order: 0, access: 'FREE',
    sectionContentId: section.contentId, body: `${version} lesson`, serializedBody: compiled(`${version} lesson`),
  }
  const problem = {
    contentId: `${lesson.contentId}/question`, slug: 'question', title: 'Question',
    href: '', link: `${lesson.href}#question`, difficulty: 'EASY', type: 'THEORY',
    lessonContentId: lesson.contentId, question: 'Explain this.', answer: `${version} answer`,
    serializedQuestion: compiled('Explain this.'), serializedAnswer: compiled(`${version} answer`),
  }
  const resource = {
    contentId: '/reference', slug: 'reference', title: 'Reference', description: 'Reference',
    href: '/resources/reference', order: 1, access: 'FREE',
    lessonSlug: 'example', sectionSlug: 'section', courseSlug: 'course',
    body: `${version} resource`, serializedBody: compiled(`${version} resource`),
  }
  return { content: { courses: [course], sections: [section], lessons: [lesson], problems: [problem] }, resources: [resource] }
}

function database(source: ReturnType<typeof snapshot>) {
  const updatedAt = new Date('2026-01-01T00:00:00Z')
  const { courseSlug, ...section } = source.content.sections[0]
  const { sectionContentId, ...lesson } = source.content.lessons[0]
  const { lessonSlug, sectionSlug, courseSlug: resourceCourse, ...resource } = source.resources[0]
  const courses = [{ ...source.content.courses[0], id: 'c', updatedAt }]
  const sections = [{ ...section, id: 's', updatedAt, course: { slug: courseSlug } }]
  const lessons = [{ ...lesson, id: 'l', updatedAt, sectionId: 's', section: { contentId: sectionContentId } }]
  const problems = source.content.problems.map(({ lessonContentId, ...problem }, index) => ({
    ...problem, id: problem.contentId === G3B_TASK.contentId ? nativeUuid : index ? `p${index}` : 'p',
    updatedAt, lessonId: 'l', lesson: { contentId: lessonContentId },
  }))
  const resources = [{ ...resource, id: 'r', updatedAt, lessonId: 'l', lesson: { slug: lessonSlug, section: { slug: sectionSlug, course: { slug: resourceCourse } } } }]
  return [courses, sections, lessons, problems, resources] as const
}

const before = snapshot('before')
const after = snapshot('after')
const nativeUuid = '11111111-2222-4333-8444-555555555555'
let live = database(before)

function prepare(first = before, second = after) {
  mocks.content.mockResolvedValueOnce(first.content).mockResolvedValueOnce(second.content)
  mocks.resources.mockResolvedValueOnce(first.resources).mockResolvedValueOnce(second.resources)
  return planInPlaceRelease('/base', '/candidate')
}

function successfulWrites(target = after) {
  const next = database(target)
  mocks.lesson.mockImplementation(async () => { live[2][0] = next[2][0]; return { count: 1 } })
  mocks.problem.mockImplementation(async ({ where }) => {
    const index = live[3].findIndex(row => row.contentId === where.contentId)
    live[3][index] = next[3][index]
    return { count: 1 }
  })
  mocks.resource.mockImplementation(async () => { live[4][0] = next[4][0]; return { count: 1 } })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.stats.problems = 1
  live = database(before)
  mocks.scope.mockReturnValue({ changedFiles: [] })
  mocks.transaction.mockImplementation(async () => live)
  successfulWrites()
})

function g3bSnapshot(version: string, added = false) {
  const source = snapshot(version)
  const lesson = source.content.lessons[0]
  lesson.contentId = G3B_LESSON_CONTENT_ID
  lesson.href = `/courses/${G3B_LESSON_UID}`
  lesson.slug = 'longest-common-substring'
  source.resources = snapshot('before').resources
  source.content.problems = G3B_CARD_ORDER.slice(0, 3).map((contentId, index) => ({
    ...source.content.problems[0], contentId, lessonContentId: lesson.contentId,
    slug: contentId.split('/').pop()!, title: `Old task ${index}`,
    link: `${lesson.href}#${contentId.split('/').pop()}`,
  }))
  if (added) source.content.problems.push({
    ...G3B_TASK_METADATA,
    question: G3B_TASK.question, answer: 'Complete standalone native answer.',
    serializedQuestion: compiled(G3B_TASK.question), serializedAnswer: compiled('Complete standalone native answer.'),
  })
  return source
}

function prepareG3b(first = g3bSnapshot('before'), second = g3bSnapshot('after', true)) {
  mocks.stats.problems = 3
  mocks.scope.mockReturnValue({
    changedFiles: [],
    addition: first.content.problems.length === 3 && second.content.problems.length === 4
      ? { contentId: G3B_TASK.contentId } : undefined,
    structural: {
      profile: ADDITIVE_PROFILE,
      allowedChangedFields: [
        { contentId: G3B_LESSON_CONTENT_ID, field: 'body' },
        ...G3B_CARD_ORDER.slice(0, 3).map(contentId => ({ contentId, field: 'answer' })),
      ],
    },
  })
  mocks.content.mockResolvedValueOnce(first.content).mockResolvedValueOnce(second.content)
  mocks.resources.mockResolvedValueOnce(first.resources).mockResolvedValueOnce(second.resources)
  return planInPlaceRelease('/base', '/candidate', { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3B_LESSON_UID })
}

describe('atomic complete native task persistence (unit mocks, not service integration)', () => {
  beforeEach(() => {
    live = database(g3bSnapshot('before'))
    successfulWrites(g3bSnapshot('after', true))
    mocks.create.mockImplementation(async () => {
      const created = database(g3bSnapshot('after', true))[3][3]
      live[3].push(created)
      return created
    })
    mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR
      ? live[3].filter(row => row.contentId === G3B_TASK.contentId) : undefined)
  })

  it('plans deterministically and creates one complete record before dependent authored writes', async () => {
    const plan = await prepareG3b()
    const described = describeInPlacePlan(plan)
    expect(described).toMatchObject({
      changeClass: ADDITIVE_CHANGE_CLASS, profile: ADDITIVE_PROFILE,
      inventories: {
        before: { counts: { problems: 3 } }, candidate: { counts: { problems: 4 } },
      },
      createdEntities: [{ contentId: G3B_TASK.contentId, serializedSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }],
    })
    const repeated = describeInPlacePlan(await prepareG3b())
    expect(digest(JSON.stringify(described))).toBe(digest(JSON.stringify(repeated)))
    const journal: unknown[] = []
    const result = await applyInPlaceRelease(plan, event => { journal.push(event) })
    expect(result[0]).toEqual({ kind: 'problem', contentId: G3B_TASK.contentId, status: 'created', id: nativeUuid })
    const data = mocks.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      contentId: G3B_TASK.contentId, question: G3B_TASK.question, answer: 'Complete standalone native answer.',
      serializedQuestion: compiled(G3B_TASK.question), serializedAnswer: compiled('Complete standalone native answer.'),
      lesson: { connect: { id: 'l', AND: expect.objectContaining({ contentId: G3B_LESSON_CONTENT_ID, body: 'before lesson' }) } },
    })
    expect(data).not.toHaveProperty('id')
    expect(data).not.toHaveProperty('order')
    expect(data).not.toHaveProperty('userProblemProgress')
    expect(mocks.create.mock.invocationCallOrder[0]).toBeLessThan(mocks.lesson.mock.invocationCallOrder[0])
    expect(journal).toEqual(result)
  })

  it('blocks all dependent writes after failed creation, including a 503', async () => {
    const plan = await prepareG3b()
    mocks.create.mockRejectedValue(Object.assign(new Error('503 database gateway'), { status: 503 }))
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/503/)
    expect(mocks.lesson).not.toHaveBeenCalled()
    expect(mocks.problem).not.toHaveBeenCalled()
    expect(live[3]).toHaveLength(3)
  })

  it('fails closed on creation-journal failure and retries the exact UUID without creating again', async () => {
    const plan = await prepareG3b()
    await expect(applyInPlaceRelease(plan, () => { throw new Error('503 journal unavailable') })).rejects.toThrow(/journal/)
    expect(live[3][3].id).toBe(nativeUuid)
    expect(live[2][0].body).toBe('before lesson')
    expect(mocks.lesson).not.toHaveBeenCalled()
    const results = await applyInPlaceRelease(plan)
    expect(results[0]).toMatchObject({ status: 'already-created', id: nativeUuid })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it.each([
    { code: 'P1017' }, { code: 'ECONNRESET' },
    { code: 'P2002', meta: { target: ['contentId'] } },
    { code: 'P2002', meta: { target: ['lessonId', 'slug'] } },
  ])('resolves an uncertain/unique-conflict create receipt narrowly: %j', async error => {
    const plan = await prepareG3b()
    mocks.create.mockImplementationOnce(async () => {
      live[3].push(database(g3bSnapshot('after', true))[3][3])
      throw Object.assign(new Error('uncertain receipt'), error)
    })
    expect((await applyInPlaceRelease(plan))[0]).toMatchObject({ status: 'already-created', id: nativeUuid })
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.findProblems).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ contentId: G3B_TASK.contentId }, { lessonId: 'l', slug: G3B_TASK.slug }] },
    }))
  })

  it.each(['missing', 'duplicate', 'owner', 'identity', 'uuid', 'answer', 'compiled', 'metadata'])('rejects %s receipt before old-field writes', async variant => {
    const plan = await prepareG3b()
    const actual = structuredClone(database(g3bSnapshot('after', true))[3][3])
    if (variant === 'owner') actual.lessonId = 'other-owner'
    if (variant === 'identity') actual.contentId = '/some-other-identity'
    if (variant === 'uuid') actual.id = 'not-a-uuid'
    if (variant === 'answer') actual.answer = 'Different payload'
    if (variant === 'compiled') actual.serializedAnswer = compiled('Different compiled payload')
    if (variant === 'metadata') actual.difficulty = 'HARD'
    mocks.create.mockRejectedValueOnce(Object.assign(new Error('unknown'), { code: 'P1017' }))
    mocks.findProblems.mockImplementation(({ where } = {}) => where?.OR
      ? variant === 'missing' ? [] : variant === 'duplicate' ? [actual, actual] : [actual] : undefined)
    await expect(applyInPlaceRelease(plan)).rejects.toThrow()
    expect(mocks.lesson).not.toHaveBeenCalled()
    expect(mocks.problem).not.toHaveBeenCalled()
  })

  it('does not treat other unique violations as canonical concurrency', async () => {
    const plan = await prepareG3b()
    mocks.create.mockRejectedValue(Object.assign(new Error('other unique constraint'), { code: 'P2002', meta: { target: ['id'] } }))
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/other unique/)
    expect(mocks.findProblems.mock.calls.some(([args]) => args?.where?.OR)).toBe(false)
  })

  it('keeps an unclassified lost receipt fail-closed, then inspects canonical identity on retry', async () => {
    const plan = await prepareG3b()
    mocks.create.mockImplementationOnce(async () => {
      live[3].push(database(g3bSnapshot('after', true))[3][3])
      throw new Error('unclassified lost create response')
    })
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/unclassified/)
    expect(mocks.lesson).not.toHaveBeenCalled()
    const retry = await applyInPlaceRelease(plan)
    expect(retry[0]).toMatchObject({ status: 'already-created', id: nativeUuid })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })

  it('rejects a changed canonical row UUID between creation and final verification', async () => {
    const plan = await prepareG3b()
    const oldUpdate = mocks.problem.getMockImplementation()!
    mocks.problem.mockImplementation(async args => {
      const result = await oldUpdate(args)
      live[3][3].id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
      return result
    })
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/identity replacement/)
  })

  it('refuses a canonical-row payload mismatch on retry or a dependent body without the row', async () => {
    const plan = await prepareG3b()
    live = database(g3bSnapshot('after', true))
    live[3][3].answer = 'Unknown authored state'
    live[3][3].serializedAnswer = compiled('Unknown authored state')
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/Unexpected database/)
    expect(mocks.create).not.toHaveBeenCalled()
    live = database(g3bSnapshot('after'))
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/without the complete G3B/)
    expect(mocks.lesson).not.toHaveBeenCalled()
  })

  it('retains new task identity across a concurrent old-row change and a retry', async () => {
    const plan = await prepareG3b()
    mocks.lesson.mockResolvedValueOnce({ count: 0 })
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/Concurrent authored/)
    expect(live[3][3].id).toBe(nativeUuid)
    expect(mocks.problem).not.toHaveBeenCalled()
    expect((await applyInPlaceRelease(plan))[0]).toMatchObject({ status: 'already-created', id: nativeUuid })
  })

  it('recovers old text at 507 without deleting/recreating the new row or touching progress', async () => {
    const first = g3bSnapshot('after', true), recovery = g3bSnapshot('before', true)
    live = database(first)
    const newProgress = { problemId: nativeUuid, completed: true, userId: 'synthetic-new-user' }
    const plan = await prepareG3b(first, recovery)
    successfulWrites(recovery)
    expect(plan.creations).toEqual([])
    const result = await applyInPlaceRelease(plan)
    expect(result[0]).toMatchObject({ status: 'already-created', id: nativeUuid })
    expect(live[3]).toHaveLength(4)
    expect(live[3][3]).toEqual(database(first)[3][3])
    expect(live[2][0].body).toBe('before lesson')
    expect(newProgress).toEqual({ problemId: nativeUuid, completed: true, userId: 'synthetic-new-user' })
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.problem.mock.calls.every(([args]) => args.where.contentId !== G3B_TASK.contentId)).toBe(true)
    expect(describeInPlacePlan(plan).inventories.before.counts.problems).toBe(4)
    expect(describeInPlacePlan(plan).inventories.candidate.counts.problems).toBe(4)
  })

  it('admits unchanged/retained full catalogs for future default and TS repairs', async () => {
    mocks.stats.problems = 3
    const source = g3bSnapshot('before', true)
    const defaultPlan = await prepare(source, source)
    // The synthetic baseline is still three old records; no count exemption.
    expect(defaultPlan.creations).toEqual([])
    mocks.scope.mockReturnValue({ changedFiles: [], structural: { profile: 'ts-basics-g3a-minimum', allowedChangedFields: [] } })
    mocks.content.mockResolvedValueOnce(source.content).mockResolvedValueOnce(source.content)
    mocks.resources.mockResolvedValueOnce(source.resources).mockResolvedValueOnce(source.resources)
    const tsPlan = await planInPlaceRelease('/base', '/candidate', {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })
    expect(tsPlan.creations).toEqual([])
    expect(tsPlan.changes).toEqual([])
    expect(describeInPlacePlan(tsPlan).inventories.candidate.counts.problems).toBe(4)
  })
})

describe('complete preparation and supported field planning', () => {
  it('exposes explicit prepare/apply APIs without replacing the existing publisher exports', () => {
    expect(prepareContentRelease).toBe(planInPlaceRelease)
    expect(applyContentRelease).toBe(applyInPlaceRelease)
  })

  it('prepares the whole content/resource pair and identifies only three authored changes', async () => {
    const plan = await prepare()
    expect(plan.changes.map((change) => [change.kind, change.field])).toEqual([
      ['lesson', 'body'], ['problem', 'answer'], ['resource', 'body'],
    ])
    expect(mocks.scope).toHaveBeenNthCalledWith(1, '/base', '/candidate')
    expect(mocks.resources).toHaveBeenCalledWith({ contentPath: '/candidate/content', resourcesPath: '/candidate/resources' })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.lesson).not.toHaveBeenCalled()
  })

  it('passes structural opt-in options to scope and binds structural evidence into the described plan', async () => {
    const structuralAfter = snapshot('after')
    structuralAfter.resources = before.resources
    mocks.scope.mockReturnValue({
      changedFiles: [],
      structural: {
        profile: 'ts-basics-g3a-minimum',
        allowedChangedFields: [
          { kind: 'lesson', contentId: before.content.lessons[0].contentId, field: 'body' },
          { kind: 'problem', contentId: before.content.problems[0].contentId, field: 'answer' },
        ],
      },
    })
    mocks.content.mockResolvedValueOnce(before.content).mockResolvedValueOnce(structuralAfter.content)
    mocks.resources.mockResolvedValueOnce(before.resources).mockResolvedValueOnce(structuralAfter.resources)
    const plan = await planInPlaceRelease('/base', '/candidate', {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })
    expect(mocks.scope).toHaveBeenNthCalledWith(1, '/base', '/candidate', {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })
    const described = describeInPlacePlan(plan)
    expect(described).toMatchObject({
      changeClass: STRUCTURAL_CHANGE_CLASS,
      profile: 'ts-basics-g3a-minimum',
      lesson: STRUCTURAL_LESSON_UID,
      allowedChangedFields: expect.any(Array),
    })
  })

  it('rejects structural plans containing otherwise-supported rows outside TS Basics', async () => {
    mocks.scope.mockReturnValue({
      changedFiles: [],
      structural: {
        profile: 'ts-basics-g3a-minimum',
        allowedChangedFields: [
          { kind: 'lesson', contentId: before.content.lessons[0].contentId, field: 'body' },
          { kind: 'problem', contentId: before.content.problems[0].contentId, field: 'answer' },
        ],
      },
    })
    mocks.content.mockResolvedValueOnce(before.content).mockResolvedValueOnce(after.content)
    mocks.resources.mockResolvedValueOnce(before.resources).mockResolvedValueOnce(after.resources)
    await expect(planInPlaceRelease('/base', '/candidate', {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).rejects.toThrow(/outside the selected TS Basics fields/)
  })

  it('does not persist when resource preparation fails after content preparation', async () => {
    mocks.content.mockResolvedValueOnce(before.content).mockResolvedValueOnce(after.content)
    mocks.resources.mockResolvedValueOnce(before.resources).mockRejectedValueOnce(new Error('resource compilation failed'))
    await expect(planInPlaceRelease('/base', '/candidate')).rejects.toThrow('resource compilation failed')
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.lesson).not.toHaveBeenCalled()
  })

  it('rejects missing entities, changed question contracts and metadata even after scope validation', async () => {
    const missing = snapshot('after')
    missing.resources = []
    await expect(prepare(before, missing)).rejects.toThrow(/inventory/)
    const question = snapshot('after')
    question.content.problems[0].question = 'Different task'
    question.content.problems[0].serializedQuestion = compiled('Different task')
    await expect(prepare(before, question)).rejects.toThrow(/Unsupported authored-field/)
    const metadata = snapshot('after')
    metadata.content.lessons[0].title = 'Renamed'
    await expect(prepare(before, metadata)).rejects.toThrow(/metadata/)
  })

  it('rejects serialized error/empty results before database activity', async () => {
    const invalid = snapshot('after')
    invalid.content.lessons[0].serializedBody.compiledSource = ''
    await expect(prepare(before, invalid)).rejects.toThrow(/MDX compilation/)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})

describe('conditional, resumable in-place persistence', () => {
  it('updates only authored pairs and matches metadata, relationships and serialized state', async () => {
    const plan = await prepare()
    const results = await applyInPlaceRelease(plan)
    expect(results.map((result) => result.status)).toEqual(['updated', 'updated', 'updated'])
    expect(mocks.problem).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'p', title: 'Question', question: 'Explain this.', lessonId: 'l',
        answer: 'before answer',
        serializedQuestion: { equals: compiled('Explain this.') },
        serializedAnswer: { equals: compiled('before answer') },
      }),
      data: { answer: 'after answer', serializedAnswer: compiled('after answer') },
    })
    expect(mocks.lesson.mock.calls[0][0].data).toEqual({
      body: 'after lesson', serializedBody: compiled('after lesson'),
    })
  })

  it('rejects unexpected text, metadata or identity before any update', async () => {
    const plan = await prepare()
    live[2][0].body = 'a different author change'
    live[2][0].serializedBody = compiled(live[2][0].body)
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/Unexpected database/)
    expect(mocks.lesson).not.toHaveBeenCalled()
    live = database(before)
    live[3][0].title = 'unexpected title'
    expect(() => checkReleaseState(plan, [])).toThrow(/inventory/)
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/Unexpected database/)
  })

  it('stops if an observed row changes between preflight and conditional update', async () => {
    const plan = await prepare()
    mocks.lesson.mockResolvedValue({ count: 0 })
    await expect(applyInPlaceRelease(plan)).rejects.toThrow(/Concurrent authored change/)
    expect(mocks.problem).not.toHaveBeenCalled()
    expect(mocks.resource).not.toHaveBeenCalled()
  })

  it('retries a partial write without repeating the already applied row', async () => {
    const plan = await prepare()
    mocks.problem.mockRejectedValueOnce(new Error('interrupted persistence'))
    await expect(applyInPlaceRelease(plan)).rejects.toThrow('interrupted persistence')
    expect(live[2][0].body).toBe('after lesson')
    expect(live[3][0].answer).toBe('before answer')
    const results = await applyInPlaceRelease(plan)
    expect(results.map((result) => result.status)).toEqual(['already-applied', 'updated', 'updated'])
    expect(mocks.lesson).toHaveBeenCalledTimes(1)
  })

  it('supports reverse-source recovery without replacing entity identities', async () => {
    live = database(after)
    successfulWrites(before)
    const plan = await prepare(after, before)
    await applyInPlaceRelease(plan)
    expect(live[2][0].id).toBe('l')
    expect(live[3][0].id).toBe('p')
    expect(live[4][0].id).toBe('r')
    expect(live[2][0].body).toBe('before lesson')
    expect(live[3][0].answer).toBe('before answer')
  })

  it('makes an already applied change a no-op but validates its complete state', async () => {
    live = database(after)
    const plan = await prepare()
    const results = await applyInPlaceRelease(plan)
    expect(results.every((result) => result.status === 'already-applied')).toBe(true)
    expect(mocks.lesson).not.toHaveBeenCalled()
    expect(mocks.problem).not.toHaveBeenCalled()
    expect(mocks.resource).not.toHaveBeenCalled()
    expect((await readReleaseCatalog()).map((row) => row.contentId)).toHaveLength(5)
  })
})
