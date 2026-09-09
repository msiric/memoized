import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyInPlaceRelease, checkReleaseState, planInPlaceRelease, readReleaseCatalog } from './plan'

const mocks = vi.hoisted(() => ({
  content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
  lesson: vi.fn(), problem: vi.fn(), resource: vi.fn(),
}))
vi.mock('../sync-content', () => ({ prepareContent: mocks.content }))
vi.mock('../sync-resources', () => ({ prepareResources: mocks.resources }))
vi.mock('./scope', async (original) => ({
  ...(await original<typeof import('./scope')>()),
  assertInPlaceScope: mocks.scope,
}))
vi.mock('@/constants/content-stats', () => ({
  CONTENT_STATS: { courses: 1, sections: 1, lessons: 1, problems: 1, resources: 1 },
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
    course: { findMany: vi.fn() }, section: { findMany: vi.fn() },
    lesson: { findMany: vi.fn(), updateMany: mocks.lesson },
    problem: { findMany: vi.fn(), updateMany: mocks.problem },
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
  const { lessonContentId, ...problem } = source.content.problems[0]
  const { lessonSlug, sectionSlug, courseSlug: resourceCourse, ...resource } = source.resources[0]
  const courses = [{ ...source.content.courses[0], id: 'c', updatedAt }]
  const sections = [{ ...section, id: 's', updatedAt, course: { slug: courseSlug } }]
  const lessons = [{ ...lesson, id: 'l', updatedAt, sectionId: 's', section: { contentId: sectionContentId } }]
  const problems = [{ ...problem, id: 'p', updatedAt, lessonId: 'l', lesson: { contentId: lessonContentId } }]
  const resources = [{ ...resource, id: 'r', updatedAt, lessonId: 'l', lesson: { slug: lessonSlug, section: { slug: sectionSlug, course: { slug: resourceCourse } } } }]
  return [courses, sections, lessons, problems, resources] as const
}

const before = snapshot('before')
const after = snapshot('after')
let live = database(before)

function prepare(first = before, second = after) {
  mocks.content.mockResolvedValueOnce(first.content).mockResolvedValueOnce(second.content)
  mocks.resources.mockResolvedValueOnce(first.resources).mockResolvedValueOnce(second.resources)
  return planInPlaceRelease('/base', '/candidate')
}

function successfulWrites(target = after) {
  const next = database(target)
  mocks.lesson.mockImplementation(async () => { live[2][0] = next[2][0]; return { count: 1 } })
  mocks.problem.mockImplementation(async () => { live[3][0] = next[3][0]; return { count: 1 } })
  mocks.resource.mockImplementation(async () => { live[4][0] = next[4][0]; return { count: 1 } })
}

beforeEach(() => {
  vi.resetAllMocks()
  live = database(before)
  mocks.scope.mockReturnValue({ changedFiles: [] })
  mocks.transaction.mockImplementation(async () => live)
  successfulWrites()
})

describe('complete preparation and supported field planning', () => {
  it('prepares the whole content/resource pair and identifies only three authored changes', async () => {
    const plan = await prepare()
    expect(plan.changes.map((change) => [change.kind, change.field])).toEqual([
      ['lesson', 'body'], ['problem', 'answer'], ['resource', 'body'],
    ])
    expect(mocks.resources).toHaveBeenCalledWith({ contentPath: '/candidate/content', resourcesPath: '/candidate/resources' })
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.lesson).not.toHaveBeenCalled()
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
