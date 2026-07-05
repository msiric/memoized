import prisma from '@/lib/prisma'
import {
  getLessonBySlug,
  getLessonMetadataBySlug,
  getLessonsAndProblems,
  getLessonsAndProblemsCounts,
  getLessonsWithProblems,
  getLessonsWithResourcesAndProblems,
  getProblemsCounts,
  getSectionBySlug,
  markLessonProgress,
  upsertCourse,
  upsertSection,
  upsertLesson,
  upsertProblem,
} from '@/services/lesson'
import { ServiceError } from '@/lib/sentry'
import { AccessOptions, ProblemDifficulty, ProblemType, Prisma } from '@prisma/client'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}))

// Mocking the Prisma client
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      userLessonProgress: { upsert: vi.fn() },
      section: { findFirst: vi.fn() },
      lesson: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      problem: { findMany: vi.fn(), count: vi.fn() },
    },
  }
})

describe('Lesson services', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('markLessonProgress', () => {
    it('should mark lesson progress when lesson exists', async () => {
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue({ id: '1' })
      const mockProgress = {
        userId: '1',
        lessonId: '1',
        completed: true,
        completedAt: new Date(),
      }
      ;(prisma.userLessonProgress.upsert as Mock).mockResolvedValue(
        mockProgress,
      )

      const progress = await markLessonProgress({
        userId: '1',
        lessonId: '1',
        completed: true,
      })
      expect(progress).toEqual(mockProgress)
      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        select: { id: true },
      })
      expect(prisma.userLessonProgress.upsert).toHaveBeenCalledWith({
        where: { userId_lessonId: { userId: '1', lessonId: '1' } },
        update: { completed: true, completedAt: expect.any(Date) },
        create: {
          userId: '1',
          lessonId: '1',
          completed: true,
          completedAt: expect.any(Date),
        },
      })
    })

    it('should throw ServiceError when lesson does not exist', async () => {
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(null)

      await expect(
        markLessonProgress({ userId: '1', lessonId: 'nonexistent', completed: true }),
      ).rejects.toThrow(ServiceError)

      expect(prisma.userLessonProgress.upsert).not.toHaveBeenCalled()
    })
  })

  describe('getLessonMetadataBySlug', () => {
    it('should return title and description for existing lesson', async () => {
      ;(prisma.lesson.findFirst as Mock).mockResolvedValue({
        title: 'Variables',
        description: 'Learn about variable declarations',
      })

      const result = await getLessonMetadataBySlug(
        'js-track',
        'core-fundamentals',
        'variables',
      )

      expect(result).toEqual({
        title: 'Variables',
        description: 'Learn about variable declarations',
      })
      expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'variables',
          section: { slug: 'core-fundamentals', course: { slug: 'js-track' } },
        },
        select: { title: true, description: true },
      })
    })

    it('should return null for non-existent lesson', async () => {
      ;(prisma.lesson.findFirst as Mock).mockResolvedValue(null)

      const result = await getLessonMetadataBySlug(
        'js-track',
        'core-fundamentals',
        'nonexistent',
      )

      expect(result).toBeNull()
    })
  })

  describe('getSectionBySlug', () => {
    it('should return section by slug', async () => {
      const mockSection = {
        id: '1',
        title: 'Section Title',
        description: 'Section Description',
        serializedBody: { compiledSource: 'compiled' },
        course: { slug: 'course-slug' },
      }
      ;(prisma.section.findFirst as Mock).mockResolvedValue(mockSection)

      const section = await getSectionBySlug('js-track', 'section-slug')
      expect(section).toEqual(mockSection)
      expect(prisma.section.findFirst).toHaveBeenCalledWith({
        where: { slug: 'section-slug', course: { slug: 'js-track' } },
        select: {
          id: true,
          serializedBody: true,
          course: { select: { slug: true } },
        },
      })
    })

    it('should return null if section is not found', async () => {
      ;(prisma.section.findFirst as Mock).mockResolvedValue(null)

      const section = await getSectionBySlug('js-track', 'invalid-slug')
      expect(section).toBeNull()

      expect(prisma.section.findFirst).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug', course: { slug: 'js-track' } },
        select: {
          id: true,
          serializedBody: true,
          course: { select: { slug: true } },
        },
      })
    })
  })

  describe('getLessonBySlug', () => {
    it('should return lesson by slug', async () => {
      const mockLesson = {
        id: '1',
        slug: 'lesson-slug',
        problems: [],
        title: 'Lesson Title',
        body: 'Lesson body content',
        serializedBody: { compiledSource: 'compiled' },
        access: AccessOptions.FREE,
        section: { slug: 'section-slug', course: { slug: 'course-slug' } },
      }
      ;(prisma.lesson.findFirst as Mock).mockResolvedValue(mockLesson)

      const lesson = await getLessonBySlug(
        'js-track',
        'section-slug',
        'lesson-slug',
      )
      expect(lesson).toEqual(mockLesson)
      expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'lesson-slug',
          section: { slug: 'section-slug', course: { slug: 'js-track' } },
        },
        select: {
          id: true,
          title: true,
          serializedBody: true,
          body: true,
          access: true,
          problems: {
            orderBy: { difficulty: 'asc' },
            select: {
              id: true,
              difficulty: true,
              href: true,
              link: true,
              title: true,
              createdAt: true,
              updatedAt: true,
              lessonId: true,
              type: true,
              question: true,
              slug: true,
              serializedAnswer: true,
            },
          },
          section: {
            select: { slug: true, course: { select: { slug: true } } },
          },
        },
      })
    })

    it('should return null if lesson is not found', async () => {
      ;(prisma.lesson.findFirst as Mock).mockResolvedValue(null)

      const lesson = await getLessonBySlug(
        'js-track',
        'section-slug',
        'invalid-slug',
      )
      expect(lesson).toBeNull()

      expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
        where: {
          slug: 'invalid-slug',
          section: { slug: 'section-slug', course: { slug: 'js-track' } },
        },
        select: {
          id: true,
          title: true,
          serializedBody: true,
          body: true,
          access: true,
          problems: {
            orderBy: { difficulty: 'asc' },
            select: {
              id: true,
              difficulty: true,
              href: true,
              link: true,
              title: true,
              createdAt: true,
              updatedAt: true,
              lessonId: true,
              type: true,
              question: true,
              slug: true,
              serializedAnswer: true,
            },
          },
          section: {
            select: { slug: true, course: { select: { slug: true } } },
          },
        },
      })
    })
  })

  describe('getLessonsAndProblems', () => {
    it('should return all lessons and problems', async () => {
      const mockLessons = [
        {
          id: 'lesson1',
          title: 'Lesson 1',
          href: '/lesson1',
          description: 'Description 1',
          access: AccessOptions.FREE,
          order: 1,
          slug: 'lesson-1',
          section: {
            id: 'section1',
            title: 'Section 1',
            href: '/section1',
            order: 1,
            slug: 'section-1',
            description: 'Section description',
            course: {
              id: 'course1',
              title: 'Course 1',
              description: 'Course description',
              slug: 'course-1',
              order: 1,
              href: '/course1',
            },
          },
        },
      ]
      const mockProblems = [
        {
          id: 'problem1',
          title: 'Problem 1',
          difficulty: ProblemDifficulty.EASY,
          href: '/problem1',
        },
      ]

      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)
      vi.spyOn(prisma.problem, 'findMany').mockResolvedValue(
        mockProblems as any,
      )

      const result = await getLessonsAndProblems()

      expect(result).toEqual({
        allLessons: mockLessons,
        allProblems: mockProblems,
      })
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        select: expect.objectContaining({
          section: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              title: true,
              href: true,
              order: true,
              slug: true,
              description: true,
              course: expect.objectContaining({
                select: expect.objectContaining({
                  id: true,
                  title: true,
                  description: true,
                  slug: true,
                  order: true,
                  href: true,
                }),
              }),
            }),
          }),
        }),
        orderBy: { order: 'asc' },
      })
      expect(prisma.problem.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
        },
      })
    })
  })

  describe('getLessonsWithProblems', () => {
    it('should return all lessons with their problems', async () => {
      const mockLessons = [
        {
          id: 'lesson1',
          title: 'Lesson 1',
          href: '/lesson1',
          description: 'Description 1',
          access: AccessOptions.FREE,
          slug: 'lesson-1',
          order: 1,
          section: { order: 1 },
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem1',
              difficulty: ProblemDifficulty.EASY,
            },
          ],
        },
      ]

      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)

      const result = await getLessonsWithProblems()

      expect(result).toEqual({ allLessons: mockLessons })
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        select: expect.objectContaining({
          section: expect.objectContaining({
            select: expect.objectContaining({ order: true }),
          }),
        }),
        orderBy: { order: 'asc' },
      })
    })
  })

  describe('getLessonsAndProblemsCounts', () => {
    it('should return lesson and problem counts', async () => {
      vi.spyOn(prisma.lesson, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.problem, 'count').mockResolvedValue(50)

      const result = await getLessonsAndProblemsCounts()

      expect(result).toEqual({ lessonCount: 10, problemCount: 50 })
      expect(prisma.lesson.count).toHaveBeenCalled()
      expect(prisma.problem.count).toHaveBeenCalled()
    })
  })

  describe('getProblemsCounts', () => {
    it('should return problem count', async () => {
      vi.spyOn(prisma.problem, 'count').mockResolvedValue(50)

      const result = await getProblemsCounts()

      expect(result).toEqual({ problemCount: 50 })
      expect(prisma.problem.count).toHaveBeenCalled()
    })
  })

  describe('getLessonsWithResourcesAndProblems', () => {
    it('should return all lessons with their resources and problems', async () => {
      const mockLessons = [
        {
          id: 'lesson1',
          title: 'Lesson 1',
          href: '/lesson1',
          description: 'Description 1',
          access: AccessOptions.FREE,
          slug: 'lesson-1',
          order: 1,
          section: { order: 1 },
          resources: [
            {
              id: 'resource1',
              title: 'Resource 1',
              href: '/resource1',
              order: 1,
            },
          ],
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem1',
              difficulty: ProblemDifficulty.EASY,
            },
          ],
        },
      ]

      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)

      const result = await getLessonsWithResourcesAndProblems()

      expect(result).toEqual({ allLessons: mockLessons })
      expect(prisma.lesson.findMany).toHaveBeenCalledWith({
        select: expect.objectContaining({
          resources: expect.any(Object),
          problems: expect.any(Object),
          section: expect.objectContaining({
            select: expect.objectContaining({ order: true }),
          }),
        }),
        orderBy: { order: 'asc' },
      })
    })
  })
})

// The content-sync upsert helpers run inside sync-content's $transaction, so they
// operate on a transaction client (tx). They match on the stable contentId first,
// fall back to the legacy slug, and update by row id so progress FKs survive a rename.
describe('content-sync upserts (stable identity)', () => {
  const makeTx = () =>
    ({
      course: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      section: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      lesson: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      problem: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    }) as unknown as Prisma.TransactionClient & Record<string, any>

  afterEach(() => vi.clearAllMocks())

  it('upsertCourse creates keyed by contentId + slug when nothing matches', async () => {
    const tx = makeTx() as any
    tx.course.findUnique.mockResolvedValue(null)
    tx.course.create.mockResolvedValue({ id: '1' })

    await upsertCourse(tx, '/js-track', 'course-slug', 'T', 'D', 'body', '/c', 1, {
      compiledSource: 'x',
    } as InputJsonValue)

    expect(tx.course.findUnique).toHaveBeenCalledWith({
      where: { contentId: '/js-track' },
      select: { id: true },
    })
    expect(tx.course.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ contentId: '/js-track', slug: 'course-slug', title: 'T' }),
    })
    expect(tx.course.update).not.toHaveBeenCalled()
  })

  it('upsertCourse updates the matched row by id (rename-safe)', async () => {
    const tx = makeTx() as any
    tx.course.findUnique.mockResolvedValueOnce({ id: 'existing' })
    tx.course.update.mockResolvedValue({ id: 'existing' })

    await upsertCourse(tx, '/js-track', 'renamed', 'T', 'D', 'body', '/c', 1)

    expect(tx.course.update).toHaveBeenCalledWith({
      where: { id: 'existing' },
      data: expect.objectContaining({ contentId: '/js-track', slug: 'renamed' }),
    })
    expect(tx.course.create).not.toHaveBeenCalled()
  })

  it('upsertSection creates then updates by id on a later contentId match', async () => {
    const tx = makeTx() as any
    tx.section.findUnique.mockResolvedValue(null)
    tx.section.create.mockResolvedValue({ id: 's1' })
    await upsertSection(tx, '/js-track/core', 'sec-slug', 'T', 'D', 'body', 1, '/s', 'course-1')
    expect(tx.section.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ contentId: '/js-track/core', courseId: 'course-1' }),
    })

    const tx2 = makeTx() as any
    tx2.section.findUnique.mockResolvedValueOnce({ id: 'sec' })
    tx2.section.update.mockResolvedValue({ id: 'sec' })
    await upsertSection(tx2, '/js-track/core', 'renamed', 'T', 'D', 'body', 1, '/s', 'course-1')
    expect(tx2.section.update).toHaveBeenCalledWith({
      where: { id: 'sec' },
      data: expect.objectContaining({ contentId: '/js-track/core', slug: 'renamed' }),
    })
  })

  it('upsertLesson creates then updates by id on a later contentId match', async () => {
    const tx = makeTx() as any
    tx.lesson.findUnique.mockResolvedValue(null)
    tx.lesson.create.mockResolvedValue({ id: 'l1' })
    await upsertLesson(
      tx,
      '/js-track/core/data-types',
      'lesson-slug',
      'T',
      'D',
      'body',
      { compiledSource: 'x' } as InputJsonValue,
      1,
      AccessOptions.FREE,
      '/l',
      'section-1',
    )
    expect(tx.lesson.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contentId: '/js-track/core/data-types',
        sectionId: 'section-1',
        access: AccessOptions.FREE,
      }),
    })
    // Identity is contentId only: one lookup, no slug fallback.
    expect(tx.lesson.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.lesson.findUnique).toHaveBeenCalledWith({
      where: { contentId: '/js-track/core/data-types' },
      select: { id: true },
    })

    const tx2 = makeTx() as any
    tx2.lesson.findUnique.mockResolvedValueOnce({ id: 'les' })
    tx2.lesson.update.mockResolvedValue({ id: 'les' })
    await upsertLesson(
      tx2,
      '/js-track/core/data-types',
      'renamed',
      'T',
      'D',
      'body',
      Prisma.DbNull,
      1,
      AccessOptions.FREE,
      '/l',
      'section-1',
    )
    expect(tx2.lesson.update).toHaveBeenCalledWith({
      where: { id: 'les' },
      data: expect.objectContaining({ contentId: '/js-track/core/data-types', slug: 'renamed' }),
    })
  })

  it('upsertProblem updates by id when contentId matches (progress-preserving)', async () => {
    const tx = makeTx() as any
    tx.problem.findUnique.mockResolvedValueOnce({ id: 'existing' })
    tx.problem.update.mockResolvedValue({ id: 'existing' })

    await upsertProblem(
      tx,
      '/js-track/core/data-types/pure-functions',
      'renamed-slug',
      '/h',
      '/l',
      'T',
      ProblemDifficulty.EASY,
      'q',
      'a',
      ProblemType.CODING,
      'lesson-1',
    )

    expect(tx.problem.update).toHaveBeenCalledWith({
      where: { id: 'existing' },
      data: expect.objectContaining({
        contentId: '/js-track/core/data-types/pure-functions',
        slug: 'renamed-slug',
      }),
    })
    expect(tx.problem.create).not.toHaveBeenCalled()
  })

  it('upsertProblem creates a new row when contentId does not match (no slug fallback)', async () => {
    const tx = makeTx() as any
    tx.problem.findUnique.mockResolvedValue(null)
    tx.problem.create.mockResolvedValue({ id: 'new' })

    await upsertProblem(
      tx,
      '/js-track/core/data-types/pure-functions',
      'some-slug',
      '/h',
      '/l',
      'T',
      ProblemDifficulty.EASY,
      'q',
      'a',
      ProblemType.CODING,
      'lesson-1',
    )

    // Identity is contentId only: a single lookup, then create. There is no
    // slug fallback (that was the mechanism that overwrote same-titled rows).
    expect(tx.problem.findUnique).toHaveBeenCalledTimes(1)
    expect(tx.problem.findUnique).toHaveBeenCalledWith({
      where: { contentId: '/js-track/core/data-types/pure-functions' },
      select: { id: true },
    })
    expect(tx.problem.create).toHaveBeenCalled()
    expect(tx.problem.update).not.toHaveBeenCalled()
  })
})
