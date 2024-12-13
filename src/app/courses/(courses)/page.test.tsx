import { render, screen, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Courses from './page'
import { getActiveCoursesWithProgress } from '../../../services/course'
import { retrieveStripeSession } from '../../../services/stripe'
import Stripe from 'stripe'

// Mock the imported modules
vi.mock('../../../services/course')
vi.mock('../../../services/stripe')
vi.mock('../../../components/CourseCard', () => ({
  CourseCard: ({ title }: { title: string }) => (
    <div data-testid="course-card">{title}</div>
  ),
}))
vi.mock('../../../components/PremiumModal', () => ({
  PremiumModal: ({
    upgradedSuccessfully,
  }: {
    upgradedSuccessfully: boolean
  }) => (
    <div data-testid="premium-modal">
      {upgradedSuccessfully ? 'Upgrade Success' : 'Upgrade Modal'}
    </div>
  ),
}))

describe('Courses page', () => {
  const mockCourses = [
    {
      id: '1',
      slug: 'course-1',
      href: '/courses/course-1',
      title: 'Course 1',
      description: 'Description 1',
      order: 1,
      metadata: {
        lessons: {
          total: 10,
          free: 5,
          premium: 5,
        },
        problems: {
          total: 5,
          byDifficulty: {
            EASY: 2,
            MEDIUM: 2,
            HARD: 1,
          },
        },
      },
      progress: {
        lessonProgress: {
          completed: 0,
          total: 10,
          percentage: 0,
        },
        problemProgress: {
          completed: 0,
          total: 5,
          percentage: 0,
        },
      },
      sections: [
        {
          id: 'section1',
          title: 'Section 1',
          description: 'Section Description',
          slug: 'section-1',
          order: 1,
          href: '/courses/course-1/section-1',
          lessons: [
            {
              id: 'lesson1',
              title: 'Lesson 1',
              description: 'Lesson Description',
              slug: 'lesson-1',
              order: 1,
              href: '/courses/course-1/section-1/lesson-1',
              access: 'FREE',
              isCompleted: false,
              problems: [
                {
                  id: 'problem1',
                  title: 'Problem 1',
                  difficulty: 'EASY',
                  isCompleted: false,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: '2',
      slug: 'course-2',
      href: '/courses/course-2',
      title: 'Course 2',
      description: 'Description 2',
      order: 2,
      metadata: {
        lessons: {
          total: 8,
          free: 4,
          premium: 4,
        },
        problems: {
          total: 4,
          byDifficulty: {
            EASY: 1,
            MEDIUM: 2,
            HARD: 1,
          },
        },
      },
      progress: {
        lessonProgress: {
          completed: 4,
          total: 8,
          percentage: 50,
        },
        problemProgress: {
          completed: 2,
          total: 4,
          percentage: 50,
        },
      },
      sections: [
        {
          id: 'section2',
          title: 'Section 2',
          description: 'Section Description',
          slug: 'section-2',
          order: 1,
          href: '/courses/course-2/section-2',
          lessons: [
            {
              id: 'lesson2',
              title: 'Lesson 2',
              description: 'Lesson Description',
              slug: 'lesson-2',
              order: 1,
              href: '/courses/course-2/section-2/lesson-2',
              access: 'FREE',
              isCompleted: true,
              problems: [
                {
                  id: 'problem2',
                  title: 'Problem 2',
                  difficulty: 'MEDIUM',
                  isCompleted: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders courses when data is successfully fetched', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockResolvedValue(
      mockCourses as any,
    )
    vi.mocked(retrieveStripeSession).mockResolvedValue(
      {} as Stripe.Response<Stripe.Checkout.Session>,
    )

    render(await Courses({ searchParams: {} }))

    expect(
      screen.getByText('Level Up Your Software Engineering Skills'),
    ).toBeDefined()
    expect(screen.getAllByTestId('course-card')).toHaveLength(2)
    expect(screen.getByText('Course 1')).toBeDefined()
    expect(screen.getByText('Course 2')).toBeDefined()
  })

  it('handles failed course fetch gracefully', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockRejectedValue(
      new Error('Failed to fetch'),
    )
    vi.mocked(retrieveStripeSession).mockResolvedValue(
      {} as Stripe.Response<Stripe.Checkout.Session>,
    )

    render(await Courses({ searchParams: {} }))

    expect(screen.queryAllByTestId('course-card')).toHaveLength(0)
    expect(
      screen.getByText('Level Up Your Software Engineering Skills'),
    ).toBeDefined()
  })

  it('renders PremiumModal when premium query param is present', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockResolvedValue(
      mockCourses as any,
    )
    vi.mocked(retrieveStripeSession).mockResolvedValue({
      id: 'session_123',
      status: 'complete',
    } as Stripe.Response<Stripe.Checkout.Session>)

    render(
      await Courses({
        searchParams: {
          upgradedToPremium: 'true',
          sessionId: 'session_123',
        },
      }),
    )

    const premiumModals = screen.getAllByTestId('premium-modal')
    expect(premiumModals).toHaveLength(1)
    expect(premiumModals[0].textContent).toBe('Upgrade Success')
  })

  it('handles failed Stripe session fetch gracefully', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockResolvedValue(
      mockCourses as any,
    )
    vi.mocked(retrieveStripeSession).mockRejectedValue(
      new Error('Failed to fetch'),
    )

    render(
      await Courses({
        searchParams: {
          upgradedToPremium: 'true',
          sessionId: 'invalid_session',
        },
      }),
    )

    const premiumModals = screen.getAllByTestId('premium-modal')
    expect(premiumModals).toHaveLength(1)
    expect(premiumModals[0].textContent).toBe('Upgrade Modal')
  })

  it('does not render PremiumModal when premium query param is absent', async () => {
    vi.mocked(getActiveCoursesWithProgress).mockResolvedValue(
      mockCourses as any,
    )
    vi.mocked(retrieveStripeSession).mockResolvedValue(
      {} as Stripe.Response<Stripe.Checkout.Session>,
    )

    render(await Courses({ searchParams: {} }))

    expect(screen.queryByTestId('premium-modal')).toBeNull()
  })
})
