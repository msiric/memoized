import { stripe } from '@/lib/stripe'
import * as subscriptionService from '@/services/subscription'
import Stripe from 'stripe'
import type { MockedFunction } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mockFn = <T extends (...args: any[]) => any>(fn: T) =>
  fn as unknown as MockedFunction<T>

vi.mock('@/services/subscription', () => ({
  updateSubscriptionDetails: vi.fn(),
  createLifetimeAccess: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn() as MockedFunction<
        typeof stripe.webhooks.constructEvent
      >,
    },
  },
  STRIPE_WEBHOOK: 'mocked_webhook_secret',
}))
describe('Stripe Webhook Handler', () => {
  let mockRequest: Request

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const createMockRequest = (
    eventType: string,
    eventData: any,
    signature = 'mock-signature',
  ) => {
    return new Request('http://localhost/api/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: JSON.stringify({
        type: eventType,
        data: {
          object: eventData,
        },
      }),
    })
  }

  it('should handle customer.subscription.created event', async () => {
    const mockSubscription = { id: 'sub_123' }
    mockRequest = createMockRequest(
      'customer.subscription.created',
      mockSubscription,
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(200)
    expect(subscriptionService.updateSubscriptionDetails).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      updateAction: false,
    })
  })

  it('should handle customer.subscription.updated event', async () => {
    const mockSubscription = { id: 'sub_123' }
    mockRequest = createMockRequest(
      'customer.subscription.updated',
      mockSubscription,
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(200)
    expect(subscriptionService.updateSubscriptionDetails).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      updateAction: true,
    })
  })

  it('should handle customer.subscription.deleted event', async () => {
    const mockSubscription = { id: 'sub_123' }
    mockRequest = createMockRequest(
      'customer.subscription.deleted',
      mockSubscription,
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(200)
    expect(subscriptionService.updateSubscriptionDetails).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      updateAction: true,
    })
  })

  it('should handle checkout.session.completed event for one-time payment', async () => {
    const mockCheckoutSession = {
      id: 'cs_123',
      mode: 'payment',
      client_reference_id: 'cus_123',
    }
    mockRequest = createMockRequest(
      'checkout.session.completed',
      mockCheckoutSession,
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(200)
    expect(subscriptionService.createLifetimeAccess).toHaveBeenCalledWith({
      sessionId: 'cs_123',
      stripeCustomer: 'cus_123',
    })
  })

  it('should handle missing stripe-signature header in non-test environment', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    mockRequest = new Request('http://localhost/api/webhook', {
      method: 'POST',
      body: JSON.stringify({
        type: 'customer.subscription.created',
        data: { object: {} },
      }),
    })

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
    expect(await response?.text()).toBe('Webhook secret not found.')
  })

  it('should use stripe.webhooks.constructEvent in non-test environment', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_WEBHOOK', 'whsec_test')

    const mockEvent = {
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_123' } },
    }
    mockFn(stripe.webhooks.constructEvent).mockReturnValue(
      mockEvent as Stripe.Event,
    )

    mockRequest = createMockRequest('customer.subscription.created', {
      id: 'sub_123',
    })

    await POST(mockRequest)

    expect(stripe.webhooks.constructEvent).toHaveBeenCalled()
  })

  it('should handle stripe.webhooks.constructEvent throwing an error', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('STRIPE_WEBHOOK', 'whsec_test')

    mockFn(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    mockRequest = createMockRequest('customer.subscription.created', {
      id: 'sub_123',
    })

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
    expect(await response?.text()).toBe('Webhook Error: Invalid signature')
  })

  it('should handle updateSubscriptionDetails throwing an error', async () => {
    const mockSubscription = { id: 'sub_123' }
    mockRequest = createMockRequest(
      'customer.subscription.created',
      mockSubscription,
    )

    mockFn(subscriptionService.updateSubscriptionDetails).mockRejectedValueOnce(
      new Error('Database error'),
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
    expect(await response?.text()).toBe(
      'Webhook handler failed. View your Next.js function logs.',
    )
  })
  it('should handle createLifetimeAccess throwing an error', async () => {
    const mockCheckoutSession = {
      id: 'cs_123',
      mode: 'payment',
      client_reference_id: 'cus_123',
    }
    mockRequest = createMockRequest(
      'checkout.session.completed',
      mockCheckoutSession,
    )

    mockFn(subscriptionService.createLifetimeAccess).mockRejectedValueOnce(
      new Error('Database error'),
    )

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
    expect(await response?.text()).toBe(
      'Webhook handler failed. View your Next.js function logs.',
    )
  })

  it('should log unhandled relevant events', async () => {
    const consoleSpy = vi.spyOn(console, 'log')
    mockRequest = createMockRequest('customer.subscription.trial_will_end', {})

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      '🔔  Webhook received: customer.subscription.trial_will_end',
    )
    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      'event type',
      'customer.subscription.trial_will_end',
    )
  })

  it('should handle requests with empty body', async () => {
    mockRequest = new Request('http://localhost/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'mock-signature' },
    })

    const response = await POST(mockRequest)

    expect(response?.status).toBe(400)
  })
})
