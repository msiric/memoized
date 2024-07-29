import prisma from '@/lib/prisma'
import {
  getLessonBySlug,
  getSectionBySlug,
  markLessonProgress,
  upsertCourse,
  upsertLesson,
  upsertProblem,
  upsertSection,
} from '@/services/lesson'
import { AccessOptions, ProblemDifficulty } from '@prisma/client'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

// Mocking the Prisma client
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      userLessonProgress: {
        upsert: vi.fn(),
      },
      section: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      lesson: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      course: {
        upsert: vi.fn(),
      },
      problem: {
        upsert: vi.fn(),
      },
    },
  }
})

describe('Prisma Services', () => {
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
        where: {
          userId_lessonId: {
            userId: '1',
            lessonId: '1',
          },
        },
        update: {
          completed: true,
          completedAt: expect.any(Date),
        },
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
      const mockSection = { id: '1' }
      ;(prisma.section.findUnique as Mock).mockResolvedValue(mockSection)

      const section = await getSectionBySlug('section-slug')
      expect(section).toEqual(mockSection)
      expect(prisma.section.findUnique).toHaveBeenCalledWith({
        where: { slug: 'section-slug' },
        select: { id: true },
      })
    })

    it('should return null if section is not found', async () => {
      ;(prisma.section.findUnique as Mock).mockResolvedValue(null)

      const section = await getSectionBySlug('invalid-slug')
      expect(section).toBeNull()

      expect(prisma.section.findUnique).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug' },
        select: { id: true },
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
        access: AccessOptions.FREE,
      }
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(mockLesson)

      const lesson = await getLessonBySlug('lesson-slug')
      expect(lesson).toEqual(mockLesson)
      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { slug: 'lesson-slug' },
        select: { id: true, problems: true, title: true, access: true },
      })
    })

    it('should return null if lesson is not found', async () => {
      ;(prisma.lesson.findUnique as Mock).mockResolvedValue(null)

      const lesson = await getLessonBySlug('invalid-slug')
      expect(lesson).toBeNull()

      expect(prisma.lesson.findUnique).toHaveBeenCalledWith({
        where: { slug: 'invalid-slug' },
        select: { id: true, problems: true, title: true, access: true },
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
        1,
      )
      expect(course).toEqual(mockCourse)
      expect(prisma.course.upsert).toHaveBeenCalledWith({
        where: { slug: 'course-slug' },
        update: {
          title: 'Course Title',
          description: 'Course Description',
          order: 1,
          href: '',
        },
        create: {
          title: 'Course Title',
          description: 'Course Description',
          order: 1,
          slug: 'course-slug',
          href: '',
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
        },
        create: {
          title: 'Section Title',
          description: 'Section Description',
          body: 'Section Content',
          slug: 'section-slug',
          order: 1,
          href: 'section-href',
          courseId: 'course-id',
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
        title: 'Problem Title',
      }
      ;(prisma.problem.upsert as Mock).mockResolvedValue(mockProblem)

      const problem = await upsertProblem(
        'problem-href',
        'Problem Title',
        'lesson-id',
        ProblemDifficulty.MEDIUM,
      )
      expect(problem).toEqual(mockProblem)
      expect(prisma.problem.upsert).toHaveBeenCalledWith({
        where: { href: 'problem-href' },
        update: {
          title: 'Problem Title',
          lessonId: 'lesson-id',
          difficulty: ProblemDifficulty.MEDIUM,
        },
        create: {
          title: 'Problem Title',
          href: 'problem-href',
          lessonId: 'lesson-id',
          difficulty: ProblemDifficulty.MEDIUM,
        },
      })
    })
  })
})
