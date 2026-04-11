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
} from '@/services/lesson'
import { ServiceError } from '@/lib/error-tracking'
import { AccessOptions, ProblemDifficulty } from '@prisma/client'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

// Note: upsert functions (upsertCourse, upsertSection, upsertLesson, upsertProblem)
// were moved into sync-content.ts as part of the two-phase transactional sync refactor.
// Their tests now live in sync-content.test.ts.

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
      section: { findUnique: vi.fn() },
      lesson: {
        findUnique: vi.fn(),
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
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue({
        title: 'Variables',
        description: 'Learn about variable declarations',
      })

      const result = await getLessonMetadataBySlug('variables')

      expect(result).toEqual({
        title: 'Variables',
        description: 'Learn about variable declarations',
      })
      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { slug: 'variables' },
        select: { title: true, description: true },
      })
    })

    it('should return null for non-existent lesson', async () => {
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(null)

      const result = await getLessonMetadataBySlug('nonexistent')

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
      ;(prisma.section.findUnique as Mock).mockResolvedValue(mockSection)

      const section = await getSectionBySlug('section-slug')
      expect(section).toEqual(mockSection)
      expect(prisma.section.findUnique).toHaveBeenCalledWith({
        where: { slug: 'section-slug' },
        select: {
          id: true,
          serializedBody: true,
          course: { select: { slug: true } },
        },
      })
    })

    it('should return null if section is not found', async () => {
      ;(prisma.section.findUnique as Mock).mockResolvedValue(null)

      const section = await getSectionBySlug('invalid-slug')
      expect(section).toBeNull()

      expect(prisma.section.findUnique).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug' },
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
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(mockLesson)

      const lesson = await getLessonBySlug('lesson-slug')
      expect(lesson).toEqual(mockLesson)
      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { slug: 'lesson-slug' },
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
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(null)

      const lesson = await getLessonBySlug('invalid-slug')
      expect(lesson).toBeNull()

      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug' },
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
