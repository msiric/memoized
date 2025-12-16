import prisma from '@/lib/prisma'
import {
  getLessonBySlug,
  getLessonsAndProblems,
  getLessonsAndProblemsCounts,
  getLessonsWithProblems,
  getLessonsWithResourcesAndProblems,
  getProblemsCounts,
  getSectionBySlug,
  markLessonProgress,
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import { AccessOptions, ProblemDifficulty, ProblemType } from '@prisma/client'
import { InputJsonValue } from '@prisma/client/runtime/library'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mocking the Prisma client
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      userLessonProgress: { upsert: vi.fn() },
      section: { findUnique: vi.fn(), upsert: vi.fn() },
      lesson: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        count: vi.fn(),
      },
      course: { upsert: vi.fn() },
      problem: { upsert: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    },
  }
})

describe('Lesson services', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('markLessonProgress', () => {
    it('should mark lesson progress', async () => {
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

  describe('upsertCourse', () => {
    it('should upsert a course', async () => {
      const mockCourse = { id: '1', slug: 'course-slug', title: 'Course Title' }
      ;(prisma.course.upsert as Mock).mockResolvedValue(mockCourse)

      const course = await upsertCourse(
        'course-slug',
        'Course Title',
        'Course Description',
        'Course body content',
        '/course',
        1,
        { compiledSource: 'compiled' } as InputJsonValue,
      )
      expect(course).toEqual(mockCourse)
      expect(prisma.course.upsert).toHaveBeenCalledWith({
        where: { slug: 'course-slug' },
        update: {
          title: 'Course Title',
          description: 'Course Description',
          body: 'Course body content',
          order: 1,
          href: '/course',
          serializedBody: { compiledSource: 'compiled' },
        },
        create: {
          title: 'Course Title',
          description: 'Course Description',
          body: 'Course body content',
          order: 1,
          slug: 'course-slug',
          href: '/course',
          serializedBody: { compiledSource: 'compiled' },
        },
      })
    })
  })

  describe('upsertSection', () => {
    it('should upsert a section', async () => {
      const mockSection = {
        id: '1',
        slug: 'section-slug',
        title: 'Section Title',
      }
      ;(prisma.section.upsert as Mock).mockResolvedValue(mockSection)

      const section = await upsertSection(
        'section-slug',
        'Section Title',
        'Section Description',
        'Section Content',
        1,
        'section-href',
        'course-id',
        { compiledSource: 'compiled' } as InputJsonValue,
      )
      expect(section).toEqual(mockSection)
      expect(prisma.section.upsert).toHaveBeenCalledWith({
        where: { slug: 'section-slug' },
        update: {
          title: 'Section Title',
          description: 'Section Description',
          body: 'Section Content',
          order: 1,
          href: 'section-href',
          courseId: 'course-id',
          serializedBody: { compiledSource: 'compiled' },
        },
        create: {
          title: 'Section Title',
          description: 'Section Description',
          body: 'Section Content',
          slug: 'section-slug',
          order: 1,
          href: 'section-href',
          courseId: 'course-id',
          serializedBody: { compiledSource: 'compiled' },
        },
      })
    })
  })

  describe('upsertLesson', () => {
    it('should upsert a lesson', async () => {
      const mockLesson = { id: '1', slug: 'lesson-slug', title: 'Lesson Title' }
      ;(prisma.lesson.upsert as Mock).mockResolvedValue(mockLesson)

      const lesson = await upsertLesson(
        'lesson-slug',
        'Lesson Title',
        'Lesson Description',
        'Lesson Content',
        {} as InputJsonValue,
        1,
        AccessOptions.PREMIUM,
        'lesson-href',
        'section-id',
      )
      expect(lesson).toEqual(mockLesson)
      expect(prisma.lesson.upsert).toHaveBeenCalledWith({
        where: { slug: 'lesson-slug' },
        update: {
          title: 'Lesson Title',
          description: 'Lesson Description',
          order: 1,
          body: 'Lesson Content',
          serializedBody: {},
          access: AccessOptions.PREMIUM,
          href: 'lesson-href',
          sectionId: 'section-id',
        },
        create: {
          title: 'Lesson Title',
          description: 'Lesson Description',
          order: 1,
          slug: 'lesson-slug',
          body: 'Lesson Content',
          serializedBody: {},
          access: AccessOptions.PREMIUM,
          href: 'lesson-href',
          sectionId: 'section-id',
        },
      })
    })
  })

  describe('upsertProblem', () => {
    it('should upsert a problem', async () => {
      const mockProblem = {
        id: '1',
        href: 'problem-href',
        link: 'problem-link',
        title: 'Problem Title',
        difficulty: ProblemDifficulty.MEDIUM,
        question: 'Problem Question',
        answer: 'Problem Answer',
        type: ProblemType.CODING,
        slug: 'problem-title',
      }
      ;(prisma.problem.upsert as Mock).mockResolvedValue(mockProblem)

      const problem = await upsertProblem(
        'problem-title',
        'problem-href',
        'problem-link',
        'Problem Title',
        ProblemDifficulty.MEDIUM,
        'Problem Question',
        'Problem Answer',
        ProblemType.CODING,
        'lesson-id',
      )
      expect(problem).toEqual(mockProblem)
      expect(prisma.problem.upsert).toHaveBeenCalledWith({
        where: { slug: 'problem-title' },
        update: {
          title: 'Problem Title',
          difficulty: ProblemDifficulty.MEDIUM,
          lessonId: 'lesson-id',
          question: 'Problem Question',
          answer: 'Problem Answer',
          type: ProblemType.CODING,
          href: 'problem-href',
          link: 'problem-link',
        },
        create: {
          title: 'Problem Title',
          href: 'problem-href',
          link: 'problem-link',
          lessonId: 'lesson-id',
          difficulty: ProblemDifficulty.MEDIUM,
          question: 'Problem Question',
          answer: 'Problem Answer',
          type: ProblemType.CODING,
          slug: 'problem-title',
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
          title: true,
          difficulty: true,
          href: true,
          link: true,
          question: true,
          serializedAnswer: true,
          type: true,
          slug: true,
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
