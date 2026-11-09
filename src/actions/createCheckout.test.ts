import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCheckout } from './createCheckout'
import { getServerSession } from 'next-auth'
import { getUserWithSubscriptionDetails } from '@/services/user'
import {
  createOrRetrieveCustomer,
  createStripeSession,
} from '@/services/stripe'
import { resolveCheckoutProduct } from '@/services/pricing'
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import { ServiceError } from '@/lib/sentry'
import Stripe from 'stripe'
import { ProductWithCoupon } from '@/types'
import { CustomResponse } from '@/utils/response'

vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/stripe')
vi.mock('@/services/pricing')

describe('createCheckout', () => {
  const serverProduct = {
    id: 'prod_yearly',
    default_price: {
      id: 'price_123',
      appliedCoupon: { id: 'SERVER_COUPON', name: 'Sale', percentOff: 20, amountOff: null },
    },
  } as unknown as ProductWithCoupon
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
    isOwner: false,
    lessonProgress: [],
    problemProgress: [],
  }
  const signedIn = () => {
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveCheckoutProduct).mockReset()
  })

  it('creates a checkout session for the server-resolved product and coupon', async () => {
    signedIn()
    vi.mocked(resolveCheckoutProduct).mockResolvedValue(serverProduct)

    const result = (await createCheckout('price_123')) as CustomResponse & {
      sessionId: string
      sessionUrl: string
    }

    expect(result.success).toBe(true)
    expect(result.sessionId).toBe('cs_123')
    expect(result.sessionUrl).toBe('https://checkout.stripe.com')
    expect(resolveCheckoutProduct).toHaveBeenCalledWith('price_123')
    expect(createStripeSession).toHaveBeenCalledWith(
      serverProduct,
      'cus_123',
      '/courses?upgradedToPremium=true&sessionId={CHECKOUT_SESSION_ID}',
    )
  })

  it('ignores a client-supplied product, coupon or redirect entirely', async () => {
    signedIn()
    vi.mocked(resolveCheckoutProduct).mockResolvedValue(serverProduct)
    const tampered = {
      id: 'prod_yearly',
      default_price: { id: 'price_123', appliedCoupon: { id: 'FRIENDS100' } },
    }

    // A crafted request can send any arguments; the server resolves (or
    // rejects) them itself and never forwards client values to Stripe.
    await (createCheckout as (...args: unknown[]) => Promise<unknown>)(tampered, '//evil.example')

    expect(resolveCheckoutProduct).toHaveBeenCalledWith(tampered)
    const [product, , redirect] = vi.mocked(createStripeSession).mock.calls[0]
    expect(product.default_price.appliedCoupon?.id).toBe('SERVER_COUPON')
    expect(redirect).toBe('/courses?upgradedToPremium=true&sessionId={CHECKOUT_SESSION_ID}')
  })

  it('refuses unknown or inactive prices without creating a session', async () => {
    signedIn()
    vi.mocked(resolveCheckoutProduct).mockResolvedValue(null)

    const result = await createCheckout('price_unknown')

    expect(result.success).toBe(false)
    expect(result.message).toBe('This plan is no longer available. Refresh and try again.')
    expect(createStripeSession).not.toHaveBeenCalled()
  })

  it('should return error if user session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const result = await createCheckout('price_123')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Failed to retrieve user session')
    expect(resolveCheckoutProduct).not.toHaveBeenCalled()
  })

  it('should return error if user has active subscription', async () => {
    signedIn()
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      ...mockUser,
      customer: {
        subscriptions: [{ status: SubscriptionStatus.ACTIVE } as Subscription],
      },
    })

    const result = await createCheckout('price_123')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Subscription already active')
    expect(createStripeSession).not.toHaveBeenCalled()
  })

  it('should handle ServiceError', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: 'test@example.com' },
      userId: 'user_123',
    })
    vi.mocked(getUserWithSubscriptionDetails).mockRejectedValue(
      new ServiceError('Service error', true),
    )

    const result = await createCheckout('price_123')

    expect(result.success).toBe(false)
    expect(result.message).toBe('Service error')
  })
})
