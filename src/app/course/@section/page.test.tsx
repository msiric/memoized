import React from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { getUserWithSubscriptions } from '@/services/user'
import Course from './page'
import { SubscriptionStatus } from '@prisma/client'
import { PREMIUM_QUERY_PARAM } from '@/constants'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/user')
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

    const { findByText } = render(await Course({ searchParams: {} }))

    const element = await findByText(/Mocked Dynamic Component/)
    expect(element).toBeDefined()
  })

  it('renders PremiumModal when upgraded to premium successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
      currentSubscriptionStatus: SubscriptionStatus.ACTIVE,
    } as any)

    const { findByTestId } = render(
      await Course({ searchParams: { [PREMIUM_QUERY_PARAM]: 'true' } }),
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

    const { findByTestId } = render(
      await Course({ searchParams: { [PREMIUM_QUERY_PARAM]: 'true' } }),
    )

    const modalElement = await findByTestId('premium-modal')
    expect(modalElement).toBeDefined()
    expect(within(modalElement).getByText('Upgrade Failed')).toBeDefined()
  })

  it('does not render PremiumModal when not upgraded', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { queryByTestId } = render(await Course({ searchParams: {} }))

    const modalElement = queryByTestId('premium-modal')
    expect(modalElement).toBeNull()
  })
})
