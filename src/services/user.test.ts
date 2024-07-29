import prisma from '@/lib/prisma'
import {
  getLessonsAndProblems,
  getLessonsWithProblems,
  getUserById,
  getUserProgressWithCurriculum,
  getUserProgressWithProblems,
  getUserWithSubscriptionDetails,
  getUserWithSubscriptions,
} from '@/services/user'
import { LessonWithProblems } from '@/types'
import { ServiceError } from '@/utils/error'
import {
  buildCurriculum,
  calculateProgress,
  checkSubscriptionStatus,
  sortCurriculum,
  sortProblemList,
} from '@/utils/helpers'
import {
  ProblemDifficulty,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/utils/helpers')

describe('User Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getUserById', () => {
    it('should return user details', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      const result = await getUserById('user1')

      expect(result).toEqual(mockUser)
    })

    it('should return null if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const result = await getUserWithSubscriptionDetails('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getUserWithSubscriptions', () => {
    it('should return user with subscription details', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        customer: {
          subscriptions: [
            {
              id: 'sub1',
              plan: SubscriptionPlan.LIFETIME,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
        },
      }

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.mocked(checkSubscriptionStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )

      const result = await getUserWithSubscriptions('user1')

      expect(result).toEqual({
        ...mockUser,
        currentSubscriptionPlan: SubscriptionPlan.LIFETIME,
        currentSubscriptionStatus: SubscriptionStatus.ACTIVE,
      })
    })

    it('should throw ServiceError if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const result = await getUserWithSubscriptions('nonexistent')

      expect(result).toEqual(null)
    })
  })

  describe('getUserWithSubscriptionDetails', () => {
    it('should return user with subscription and progress details', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        customer: {
          subscriptions: [
            {
              id: 'sub1',
              plan: SubscriptionPlan.LIFETIME,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        lessonProgress: [{ lessonId: 'lesson1', completed: true }],
        problemProgress: [{ problemId: 'problem1', completed: true }],
      }

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.mocked(checkSubscriptionStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )

      const result = await getUserWithSubscriptionDetails('user1')

      expect(result).toEqual({
        ...mockUser,
        currentSubscriptionPlan: SubscriptionPlan.LIFETIME,
        currentSubscriptionStatus: SubscriptionStatus.ACTIVE,
      })
    })

    it('should throw ServiceError if user is not found', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const result = await getUserWithSubscriptionDetails('nonexistent')

      expect(result).toEqual(null)
    })
  })

  describe('getLessonsAndProblems', () => {
    it('should return all lessons and problems', async () => {
      const mockLessons = [{ id: 'lesson1', title: 'Lesson 1' }]
      const mockProblems = [
        {
          id: 'problem1',
          title: 'Problem 1',
          difficulty: 'EASY',
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
    })
  })

  describe('getUserProgressWithCurriculum', () => {
    it('should return user progress with curriculum', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        customer: {
          subscriptions: [
            {
              id: 'sub1',
              plan: SubscriptionPlan.LIFETIME,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        lessonProgress: [{ lessonId: 'lesson1', completed: true }],
        problemProgress: [{ problemId: 'problem1', completed: true }],
      }

      const mockLessons = [
        {
          id: 'lesson1',
          slug: 'lesson-1',
          title: 'Lesson 1',
          order: 1,
          description: 'Description',
          access: 'free',
          href: '/lesson-1',
          section: {
            id: 'section1',
            slug: 'section-1',
            title: 'Section 1',
            order: 1,
            description: 'Section Description',
            href: '/section-1',
            course: {
              id: 'course1',
              slug: 'course-1',
              title: 'Course 1',
              order: 1,
              description: 'Course Description',
            },
          },
        },
      ]

      const mockProblems = [{ id: 'problem1' }]

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)
      vi.spyOn(prisma.problem, 'findMany').mockResolvedValue(
        mockProblems as any,
      )
      vi.mocked(checkSubscriptionStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(buildCurriculum).mockReturnValue([])
      vi.mocked(sortCurriculum).mockReturnValue([])
      vi.mocked(calculateProgress).mockReturnValue({
        currentLessonProgress: 100,
        currentProblemProgress: 100,
      })

      const result = await getUserProgressWithCurriculum('user1')

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('curriculum')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
      expect(result.user?.currentLessonProgress).toBe(100)
      expect(result.user?.currentProblemProgress).toBe(100)
    })

    it('should return null user if userId is not provided', async () => {
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.problem, 'findMany').mockResolvedValue([])
      vi.mocked(buildCurriculum).mockReturnValue([])
      vi.mocked(sortCurriculum).mockReturnValue([])

      const result = await getUserProgressWithCurriculum()

      expect(result.user).toBeNull()
      expect(result).toHaveProperty('curriculum')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
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
          access: 'FREE',
          slug: 'lesson-1',
          order: 1,
          section: { order: 1 },
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem1',
              difficulty: 'EASY',
            },
          ],
        },
      ]

      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)

      const result = await getLessonsWithProblems()

      expect(result).toEqual({ allLessons: mockLessons })
    })
  })

  describe('getUserProgressWithProblems', () => {
    it('should return user progress with problems when userId is provided', async () => {
      const mockUser = {
        id: 'user1',
        name: 'Test User',
        customer: {
          subscriptions: [
            {
              id: 'sub1',
              plan: SubscriptionPlan.LIFETIME,
              startDate: new Date(),
              endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          ],
        },
        lessonProgress: [{ lessonId: 'lesson1', completed: true }],
        problemProgress: [{ problemId: 'problem1', completed: true }],
      }

      const mockLessons = [
        {
          id: 'lesson1',
          href: '/lesson-1',
          title: 'Lesson 1',
          description: 'Lesson 1 description',
          access: 'FREE',
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem-1',
              difficulty: ProblemDifficulty.EASY,
            },
            {
              id: 'problem2',
              title: 'Problem 2',
              href: '/problem-2',
              difficulty: ProblemDifficulty.MEDIUM,
            },
          ],
        },
      ]

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)
      vi.mocked(checkSubscriptionStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(sortProblemList).mockReturnValue(
        mockLessons as LessonWithProblems[],
      )
      vi.mocked(calculateProgress).mockReturnValue({
        currentLessonProgress: 100,
        currentProblemProgress: 50,
      })

      const result = await getUserProgressWithProblems('user1')

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('problemList')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
      expect(result.user?.currentLessonProgress).toBe(100)
      expect(result.user?.currentProblemProgress).toBe(50)
      expect(result.problemList).toHaveLength(1)
      expect(result.lessons).toHaveLength(1)
      expect(result.problems).toHaveLength(2)
    })

    it('should return null user and problem data when userId is not provided', async () => {
      const mockLessons = [
        {
          id: 'lesson1',
          href: '/lesson-1',
          title: 'Lesson 1',
          description: 'Lesson 1 description',
          access: 'FREE',
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem-1',
              difficulty: ProblemDifficulty.EASY,
            },
          ],
        },
      ]

      vi.spyOn(prisma.lesson, 'findMany').mockResolvedValue(mockLessons as any)
      vi.mocked(sortProblemList).mockReturnValue(
        mockLessons as LessonWithProblems[],
      )

      const result = await getUserProgressWithProblems()

      expect(result.user).toBeNull()
      expect(result).toHaveProperty('problemList')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
      expect(result.problemList).toHaveLength(1)
      expect(result.lessons).toHaveLength(1)
      expect(result.problems).toHaveLength(1)
    })
  })
})
