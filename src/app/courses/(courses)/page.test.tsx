import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getCoursesSnapshot } from '@/lib/catalog-request'
import { settleCheckoutReturn } from '@/services/checkout-return'
import { getServerSession } from 'next-auth'
import Courses from './page'
import { COURSES_PREFIX } from '../../../constants'

// Mock the imported modules
vi.mock('@/lib/catalog-request', () => ({ getCoursesSnapshot: vi.fn() }))
vi.mock('@/services/checkout-return', () => ({ settleCheckoutReturn: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('../../../components/CourseCard', () => ({
  CourseCard: ({ title }: { title: string }) => (
    <div data-testid="course-card">{title}</div>
  ),
}))
vi.mock('../../../components/PremiumModal', () => ({
  PremiumModal: ({ checkoutState }: { checkoutState: string }) => (
    <div data-testid="premium-modal">{checkoutState}</div>
  ),
}))

describe('Courses page', () => {
  const mockCourses = [
    {
      id: '1',
      slug: 'course-1',
      href: `${COURSES_PREFIX}/course-1`,
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
          href: `${COURSES_PREFIX}/course-1/section-1`,
          lessons: [
            {
              id: 'lesson1',
              title: 'Lesson 1',
              description: 'Lesson Description',
              slug: 'lesson-1',
              order: 1,
              href: `${COURSES_PREFIX}}/course-1/section-1/lesson-1`,
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
      href: `${COURSES_PREFIX}/course-2`,
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
          href: `${COURSES_PREFIX}/course-2/section-2`,
          lessons: [
            {
              id: 'lesson2',
              title: 'Lesson 2',
              description: 'Lesson Description',
              slug: 'lesson-2',
              order: 1,
              href: `${COURSES_PREFIX}}/course-2/section-2/lesson-2`,
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
    vi.mocked(getCoursesSnapshot).mockResolvedValue({
      status: 'available',
      courses: mockCourses as any,
      stats: { courses: 2, lessons: 18, problems: 9 },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders courses when data is successfully fetched', async () => {

    render(await Courses({ searchParams: {} }))

    expect(
      screen.getByText('Master JavaScript Interviews'),
    ).toBeDefined()
    const foundCourses = await screen.findAllByTestId('course-card');
    expect(foundCourses).toHaveLength(2)
    expect(screen.getByText('Course 1')).toBeDefined()
    expect(screen.getByText('Course 2')).toBeDefined()
  })

  it('handles failed course fetch gracefully', async () => {
    vi.mocked(getCoursesSnapshot).mockResolvedValue({ status: 'unavailable' })

    render(await Courses({ searchParams: {} }))

    expect(screen.queryAllByTestId('course-card')).toHaveLength(0)
    expect(
      screen.getByText('Master JavaScript Interviews'),
    ).toBeDefined()
  })

  it('renders PremiumModal when premium query param is present', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user_1' } as never)
    vi.mocked(settleCheckoutReturn).mockResolvedValue({ state: 'upgraded', sessionId: 'session_123' })

    render(
      await Courses({
        searchParams: {
          upgradedToPremium: 'true',
          sessionId: 'session_123',
        },
      }),
    )

    const premiumModals = await screen.findAllByTestId('premium-modal')
    expect(premiumModals).toHaveLength(1)
    expect(premiumModals[0].textContent).toBe('upgraded')
  })

  it('handles failed Stripe session fetch gracefully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user_1' } as never)
    vi.mocked(settleCheckoutReturn).mockRejectedValue(new Error('Failed to fetch'))

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
    expect(premiumModals[0].textContent).toBe('unconfirmed')
  })

  it('does not render PremiumModal when premium query param is absent', async () => {

    render(await Courses({ searchParams: {} }))

    expect(screen.queryByTestId('premium-modal')).toBeNull()
  })

  it('settles the buyer\'s own session and shows processing while Stripe confirms', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user_1' } as never)
    vi.mocked(settleCheckoutReturn).mockResolvedValue({ state: 'processing', sessionId: 'cs_1' })
    render(await Courses({ searchParams: { upgradedToPremium: 'true', sessionId: 'cs_1' } }))
    expect(settleCheckoutReturn).toHaveBeenCalledWith('cs_1', 'user_1')
    expect(screen.getByTestId('premium-modal').textContent).toBe('processing')
  })
})
