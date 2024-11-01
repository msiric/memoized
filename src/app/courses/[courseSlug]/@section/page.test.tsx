import { PREMIUM_QUERY_PARAM, SESSION_QUERY_PARAM } from '@/constants'
import { stripe } from '@/lib/stripe'
import { getUserWithSubscriptions } from '@/services/user'
import { SubscriptionStatus } from '@prisma/client'
import { cleanup, render, within } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Course from './page'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/lib/stripe')
vi.mock('@/components/PremiumModal', () => ({
  PremiumModal: ({
    upgradedSuccessfully,
  }: {
    upgradedSuccessfully: boolean
  }) => (
    <div data-testid="premium-modal">
      {upgradedSuccessfully ? 'Upgrade Successful' : 'Upgrade Failed'}
    </div>
  ),
}))
vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicComponent = ({
      userId,
      lessonId,
      problems,
    }: {
      userId?: string
      lessonId: string
      problems: any[]
    }) => (
      <div>
        Mocked Dynamic Component (User ID: {userId}, Lesson ID: {lessonId},
        Problems: {problems.length})
      </div>
    )
    DynamicComponent.displayName = 'DynamicComponent'
    return DynamicComponent
  },
}))

describe('Course component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders dynamic Page component', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { findByText } = render(
      await Course({ searchParams: {}, params: { courseSlug: '' } }),
    )

    const element = await findByText(/Mocked Dynamic Component/)
    expect(element).toBeDefined()
  })

  it('renders PremiumModal when upgraded to premium successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
      currentSubscriptionStatus: SubscriptionStatus.ACTIVE,
    } as any)
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
      status: 'complete',
    } as any)

    const { findByTestId } = render(
      await Course({
        searchParams: {
          [PREMIUM_QUERY_PARAM]: 'true',
          [SESSION_QUERY_PARAM]: 'sess_123',
        },
        params: {
          courseSlug: '',
        },
      }),
    )

    const modalElement = await findByTestId('premium-modal')
    expect(modalElement).toBeDefined()
    expect(within(modalElement).getByText('Upgrade Successful')).toBeDefined()
  })

  it('renders PremiumModal when upgrade to premium failed', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
      currentSubscriptionStatus: null,
    } as any)
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
      status: 'open',
    } as any)

    const { findByTestId } = render(
      await Course({
        searchParams: {
          [PREMIUM_QUERY_PARAM]: 'true',
          [SESSION_QUERY_PARAM]: 'sess_123',
        },
        params: {
          courseSlug: '',
        },
      }),
    )

    const modalElement = await findByTestId('premium-modal')
    expect(modalElement).toBeDefined()
    expect(within(modalElement).getByText('Upgrade Failed')).toBeDefined()
  })

  it('does not render PremiumModal when not upgraded', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { queryByTestId } = render(
      await Course({ searchParams: {}, params: { courseSlug: '' } }),
    )

    const modalElement = queryByTestId('premium-modal')
    expect(modalElement).toBeNull()
  })

  it('handles Stripe session retrieval failure gracefully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
      currentSubscriptionStatus: null,
    } as any)
    vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
      new Error('Stripe error'),
    )

    const { findByTestId } = render(
      await Course({
        searchParams: {
          [PREMIUM_QUERY_PARAM]: 'true',
          [SESSION_QUERY_PARAM]: 'sess_123',
        },
        params: {
          courseSlug: '',
        },
      }),
    )

    const modalElement = await findByTestId('premium-modal')
    expect(modalElement).toBeDefined()
    expect(within(modalElement).getByText('Upgrade Failed')).toBeDefined()
  })
})
