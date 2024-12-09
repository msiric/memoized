import prisma from '@/lib/prisma'
import {
  getUserById,
  getUserProgressWithCurriculum,
  getUserProgressWithProblems,
  getUserProgressWithResources,
  getUserWithSubscriptionDetails,
  getUserWithSubscriptions,
} from '@/services/user'
import {
  EnrichedLesson,
  EnrichedProblem,
  LessonWithProblems,
  LessonWithResourcesAndProblems,
} from '@/types'
import { ServiceError } from '@/utils/error'
import {
  buildCurriculum,
  calculateProgress,
  checkSubscriptionStatus,
  sortCurriculum,
  sortProblemList,
  sortResources,
} from '@/utils/helpers'
import {
  ProblemDifficulty,
  ProblemType,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getLessonsAndProblems,
  getLessonsWithProblems,
  getLessonsWithResourcesAndProblems,
} from './lesson'

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/utils/helpers')

vi.mock('@/services/lesson', () => ({
  getLessonsAndProblems: vi.fn(),
  getLessonsWithProblems: vi.fn(),
  getLessonsWithResourcesAndProblems: vi.fn(),
}))

describe('User services', () => {
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

    it('should throw ServiceError when user is not found', async () => {
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

  describe('getUserProgressWithCurriculum', () => {
    it('should return user progress with curriculum when userId is provided', async () => {
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
              href: '/course-1',
              order: 1,
              description: 'Course Description',
            },
          },
        },
      ]

      const mockProblems = [
        { id: '1', title: 'problem1', difficulty: 'EASY', href: '' },
      ]

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.mocked(getLessonsAndProblems).mockResolvedValue({
        allLessons: mockLessons as EnrichedLesson[],
        allProblems: mockProblems as EnrichedProblem[],
      })
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

    it('should return null user and curriculum data when userId is not provided', async () => {
      const mockLessons = [
        {
          id: 'lesson1',
          slug: 'lesson-1',
          title: 'Lesson 1',
          order: 1,
          description: 'Description',
          access: 'free',
          href: '/lesson-1',
        },
      ]

      const mockProblems = [{ id: 'problem1' }]

      vi.mocked(getLessonsAndProblems).mockResolvedValue({
        allLessons: mockLessons as EnrichedLesson[],
        allProblems: mockProblems as EnrichedProblem[],
      })
      vi.mocked(buildCurriculum).mockReturnValue([])
      vi.mocked(sortCurriculum).mockReturnValue([])

      const result = await getUserProgressWithCurriculum()

      expect(result.user).toBeNull()
      expect(result).toHaveProperty('curriculum')
      expect(result).toHaveProperty('lessons')
      expect(result).toHaveProperty('problems')
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
              question: 'Problem 1',
              answer: 'Answer 1',
              type: ProblemType.THEORY,
              difficulty: ProblemDifficulty.EASY,
            },
            {
              id: 'problem2',
              title: 'Problem 2',
              href: '/problem-2',
              question: 'Problem 2',
              answer: 'Answer 2',
              type: ProblemType.THEORY,
              difficulty: ProblemDifficulty.MEDIUM,
            },
          ],
        },
      ]

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.mocked(getLessonsWithProblems).mockResolvedValue({
        allLessons: mockLessons as LessonWithProblems[],
      })
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

      vi.mocked(getLessonsWithProblems).mockResolvedValue({
        allLessons: mockLessons as LessonWithProblems[],
      })
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

  describe('getUserProgressWithResources', () => {
    it('should return user progress with resource list when userId is provided', async () => {
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
          title: 'Lesson 1',
          href: '/lesson-1',
          description: 'Lesson 1 description',
          access: 'FREE',
          resources: [
            {
              id: 'resource1',
              title: 'Resource 1',
              href: '/resource-1',
              order: 1,
            },
            {
              id: 'resource2',
              title: 'Resource 2',
              href: '/resource-2',
              order: 2,
            },
          ],
          problems: [
            {
              id: 'problem1',
              title: 'Problem 1',
              href: '/problem-1',
              question: 'Problem 1',
              answer: 'Answer 1',
              type: ProblemType.THEORY,
              difficulty: ProblemDifficulty.EASY,
            },
          ],
        },
      ]

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser as any)
      vi.mocked(getLessonsWithResourcesAndProblems).mockResolvedValue({
        allLessons: mockLessons as LessonWithResourcesAndProblems[],
      })
      vi.mocked(checkSubscriptionStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(sortResources).mockReturnValue(
        mockLessons as LessonWithResourcesAndProblems[],
      )
      vi.mocked(calculateProgress).mockReturnValue({
        currentLessonProgress: 100,
        currentProblemProgress: 100,
      })

      const result = await getUserProgressWithResources('user1')

      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('lessons')
      expect(result.user?.currentLessonProgress).toBe(100)
      expect(result.user?.currentProblemProgress).toBe(100)
      expect(result.lessons).toHaveLength(1)
      expect(result.lessons?.[0].resources).toHaveLength(2)
    })

    it('should return null user and resource list when userId is not provided', async () => {
      const mockResources = [
        {
          id: 'resource1',
          title: 'Resource 1',
          href: '/resource-1',
          resources: [{}],
        },
      ]

      vi.mocked(getLessonsWithResourcesAndProblems).mockResolvedValue({
        allLessons: mockResources as LessonWithResourcesAndProblems[],
      })
      vi.mocked(sortResources).mockReturnValue(
        mockResources as LessonWithResourcesAndProblems[],
      )

      const result = await getUserProgressWithResources()

      expect(result.user).toBeNull()
      expect(result).toHaveProperty('lessons')
      expect(result.lessons).toHaveLength(1)
    })
  })
})
