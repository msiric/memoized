import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/lib/prisma'
import { ServiceError } from '@/utils/error'
import {
  checkSubscriptionStatus,
  buildCurriculum,
  calculateProgress,
  sortCurriculum,
} from '@/utils/helpers'
import {
  getUserWithSubscriptions,
  getUserProgressWithLessons,
  getUserById,
  getUserWithSubscriptionDetails,
  getLessonsAndProblems,
} from '@/services/user'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

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

      await expect(getUserById('nonexistent')).rejects.toThrow(ServiceError)
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
      const mockProblems = [{ id: 'problem1' }]

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

  describe('getUserProgressWithLessons', () => {
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

      const result = await getUserProgressWithLessons('user1')

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

      const result = await getUserProgressWithLessons()

      expect(result.user).toBeNull()
      expect(result).toHaveProperty('curriculum')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
    })
  })
})
