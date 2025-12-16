import prisma from '@/lib/prisma'
import { AccessOptions, ProblemDifficulty } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveCoursesWithProgress, getCourseBySlug } from './course'
import { getUserWithSubscriptionDetails } from './user'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock next-auth
vi.mock('next-auth', () => {
  const getServerSession = vi.fn()
  return { getServerSession, default: () => vi.fn(), NextAuth: () => vi.fn() }
})

// Mock the auth options
vi.mock('../app/api/auth/[...nextauth]/route', () => ({
  authOptions: { session: { strategy: 'jwt' } },
}))

vi.mock('@/lib/prisma', () => ({
  default: { course: { findMany: vi.fn(), findUnique: vi.fn() } },
}))

vi.mock('./user', () => ({ getUserWithSubscriptionDetails: vi.fn() }))

describe('Course service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getActiveCoursesWithProgress', () => {
    it('returns empty array when no active courses found', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      ;(prisma.course.findMany as any).mockResolvedValue([])

      const result = await getActiveCoursesWithProgress()
      expect(result).toEqual([])
    })

    it('returns courses with metadata for non-authenticated users', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      ;(prisma.course.findMany as any).mockResolvedValue([
        {
          id: 'course1',
          title: 'Course 1',
          description: 'Description',
          href: '/course1',
          slug: 'course-1',
          order: 1,
          sections: [
            {
              id: 'section1',
              title: 'Section 1',
              description: 'Section Description',
              slug: 'section-1',
              order: 1,
              href: '/section1',
              lessons: [
                {
                  id: 'lesson1',
                  title: 'Lesson 1',
                  description: 'Lesson Description',
                  slug: 'lesson-1',
                  order: 1,
                  href: '/lesson1',
                  access: AccessOptions.FREE,
                  problems: [
                    {
                      id: 'problem1',
                      title: 'Problem 1',
                      difficulty: ProblemDifficulty.EASY,
                    },
                  ],
                },
                {
                  id: 'lesson2',
                  title: 'Lesson 2',
                  description: 'Lesson Description',
                  slug: 'lesson-2',
                  order: 2,
                  href: '/lesson2',
                  access: AccessOptions.PREMIUM,
                  problems: [],
                },
              ],
            },
          ],
        },
      ])

      const result = await getActiveCoursesWithProgress()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'course1',
        metadata: {
          lessons: { total: 2, free: 1, premium: 1 },
          problems: { total: 1, byDifficulty: { [ProblemDifficulty.EASY]: 1 } },
        },
        progress: null,
      })
    })

    it('returns courses with progress for authenticated users', async () => {
      const mockUserId = 'user1'
      ;(getServerSession as any).mockResolvedValue({ userId: mockUserId })
      ;(getUserWithSubscriptionDetails as any).mockResolvedValue({
        id: mockUserId,
      })
      ;(prisma.course.findMany as any).mockResolvedValue([
        {
          id: 'course1',
          title: 'Course 1',
          description: 'Description',
          href: '/course1',
          slug: 'course-1',
          order: 1,
          sections: [
            {
              id: 'section1',
              title: 'Section 1',
              description: 'Section Description',
              slug: 'section-1',
              order: 1,
              href: '/section1',
              lessons: [
                {
                  id: 'lesson1',
                  title: 'Lesson 1',
                  description: 'Lesson Description',
                  slug: 'lesson-1',
                  order: 1,
                  href: '/lesson1',
                  access: AccessOptions.FREE,
                  problems: [
                    {
                      id: 'problem1',
                      title: 'Problem 1',
                      difficulty: ProblemDifficulty.EASY,
                      problemProgress: [{ completed: true }],
                    },
                  ],
                  lessonProgress: [{ completed: true }],
                },
                {
                  id: 'lesson2',
                  title: 'Lesson 2',
                  description: 'Lesson Description',
                  slug: 'lesson-2',
                  order: 2,
                  href: '/lesson2',
                  access: AccessOptions.PREMIUM,
                  problems: [],
                  lessonProgress: [],
                },
              ],
            },
          ],
        },
      ])

      const result = await getActiveCoursesWithProgress()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'course1',
        metadata: {
          lessons: { total: 2, free: 1, premium: 1 },
          problems: { total: 1, byDifficulty: { [ProblemDifficulty.EASY]: 1 } },
        },
        progress: {
          lessonProgress: { completed: 1, total: 2, percentage: 50 },
          problemProgress: { completed: 1, total: 1, percentage: 100 },
        },
      })

      // Verify lessons have completion status
      const firstLesson = result[0].sections[0].lessons[0]
      expect(firstLesson.isCompleted).toBe(true)

      // Verify problems have completion status
      const firstProblem = firstLesson.problems[0]
      expect(firstProblem.isCompleted).toBe(true)
    })

    it('handles course ordering correctly', async () => {
      ;(getServerSession as any).mockResolvedValue(null)
      ;(prisma.course.findMany as any).mockResolvedValue([
        { id: 'course2', order: 2, sections: [] },
        { id: 'course1', order: 1, sections: [] },
      ])

      const result = await getActiveCoursesWithProgress()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('course1')
      expect(result[1].id).toBe('course2')
    })
  })

  describe('getCourseBySlug', () => {
    it('returns course when found', async () => {
      const mockCourse = { id: 'course1' }
      ;(prisma.course.findUnique as any).mockResolvedValue(mockCourse)

      const result = await getCourseBySlug('course-slug')

      expect(result).toEqual(mockCourse)
      expect(prisma.course.findUnique).toHaveBeenCalledWith({
        where: { slug: 'course-slug', isActive: true },
        select: { id: true, serializedBody: true },
      })
    })

    it('returns null when course not found', async () => {
      ;(prisma.course.findUnique as any).mockResolvedValue(null)

      const result = await getCourseBySlug('non-existent-course')

      expect(result).toBeNull()
    })
  })
})
