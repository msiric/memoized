import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCheckout } from './createCheckout'
import { getServerSession } from 'next-auth'
import { getUserWithSubscriptionDetails } from '@/services/user'
import {
  createOrRetrieveCustomer,
  createStripeSession,
} from '@/services/stripe'
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { ServiceError } from '@/lib/error-tracking'
import Stripe from 'stripe'
import { ProductWithCoupon } from '@/types'
import { CustomResponse } from '@/utils/response'

vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/stripe')

describe('createCheckout', () => {
  const mockProduct = {
    default_price: {
      id: 'price_123',
    },
  }
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    customer: {
      subscriptions: [],
    },
    currentSubscriptionPlan: SubscriptionPlan.LIFETIME,
    currentSubscriptionStatus: SubscriptionStatus.ACTIVE,
    name: 'User',
    image: null,
    lessonProgress: [],
    problemProgress: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a checkout session successfully', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue(mockUser)
    vi.mocked(createOrRetrieveCustomer).mockResolvedValue('cus_123')
    vi.mocked(createStripeSession).mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com',
    } as Stripe.Response<Stripe.Checkout.Session>)

    const result = (await createCheckout(
      mockProduct as ProductWithCoupon,
    )) as CustomResponse & { sessionId: string; sessionUrl: string }

    expect(result.success).toBe(true)
    expect(result.sessionId).toBe('cs_123')
    expect(result.sessionUrl).toBe('https://checkout.stripe.com')
  })

  it('should return error if user session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await createCheckout(mockProduct as ProductWithCoupon)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user session')
  })

  it('should return error if user has active subscription', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      ...mockUser,
      customer: {
        subscriptions: [{ status: SubscriptionStatus.ACTIVE } as Subscription],
      },
    })

    const result = await createCheckout(mockProduct as ProductWithCoupon)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Subscription already active')
  })

  it('should handle ServiceError', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserWithSubscriptionDetails).mockRejectedValue(
      new ServiceError('Service error', true),
    )

    const result = await createCheckout(mockProduct as ProductWithCoupon)

    expect(result.success).toBe(false)
    expect(result.message).toBe('Service error')
  })
})
