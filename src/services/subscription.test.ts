import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import {
  handleFailedRecurringSubscription,
  handleFailedOneTimePayment,
  updateSubscriptionDetails,
  createLifetimeAccess,
} from '@/services/subscription'
import {
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  toDateTime,
} from '@/utils/helpers'
import { SubscriptionPlan } from '@prisma/client'

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/lib/stripe')
vi.mock('@/utils/helpers')

describe('Subscription Service', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('updateSubscriptionDetails', () => {
    it('should update subscription details successfully', async () => {
      const mockCustomer = { id: 'cus_123' }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
        metadata: {},
        cancel_at_period_end: false,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      // Mock the helper functions
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue('ACTIVE')
      vi.mocked(toDateTime).mockImplementation(
        (timestamp) => new Date(timestamp * 1000),
      )

      await updateSubscriptionDetails({
        customerId: 'cus_123',
        subscriptionId: 'sub_123',
      })

      expect(prisma.subscription.upsert).toHaveBeenCalled()
    })
  })

  describe('handleFailedRecurringSubscription', () => {
    it('should cancel subscription and refund payment if successful', async () => {
      const mockSubscription = {
        id: 'sub_123',
        latest_invoice: 'inv_123',
        status: 'active',
      }
      const mockInvoice = { payment_intent: 'pi_123' }
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' }

      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(stripe.subscriptions, 'cancel').mockResolvedValue({} as any)
      vi.spyOn(stripe.invoices, 'retrieve').mockResolvedValue(
        mockInvoice as any,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)

      await handleFailedRecurringSubscription('sub_123')

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123')
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
      })
    })

    it('should throw ServiceError if cancellation fails', async () => {
      vi.spyOn(stripe.subscriptions, 'retrieve').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(
        handleFailedRecurringSubscription('sub_123'),
      ).rejects.toThrow('Failed to handle failed recurring subscription')
    })

    it('should handle case when subscription is not found', async () => {
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(null as any)

      await expect(
        handleFailedRecurringSubscription('sub_123'),
      ).rejects.toThrow('Failed to handle failed recurring subscription')
    })
  })

  describe('createLifetimeAccess', () => {
    it('should create lifetime access successfully', async () => {
      const mockCustomer = { id: 'cus_123' }
      const mockSession = {
        id: 'cs_123',
        created: 1625097600,
        metadata: {},
        line_items: { data: [{ price: { id: 'price_123' } }] },
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      // Mock the helper functions
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(toDateTime).mockImplementation(
        (timestamp) => new Date(timestamp * 1000),
      )

      await createLifetimeAccess({ sessionId: 'cs_123', customerId: 'cus_123' })

      expect(prisma.subscription.upsert).toHaveBeenCalled()
    })
  })

  describe('handleFailedOneTimePayment', () => {
    it('should refund payment if successful', async () => {
      const mockSession = {
        id: 'cs_123',
        payment_intent: 'pi_123',
      }
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)

      await handleFailedOneTimePayment('cs_123')

      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
      })
    })

    it('should throw ServiceError if refund fails', async () => {
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockRejectedValue(
        new Error('Stripe error'),
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Failed to handle failed one-time payment',
      )
    })

    it('should handle case when session is not found', async () => {
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        null as any,
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Failed to handle failed one-time payment',
      )
    })

    it('should handle case when payment intent is not found', async () => {
      const mockSession = {
        id: 'cs_123',
        payment_intent: null,
      }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )

      await handleFailedOneTimePayment('cs_123')

      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('should throw ServiceError if session ID is not provided', async () => {
      await expect(handleFailedOneTimePayment()).rejects.toThrow(
        'Failed to handle failed one-time payment',
      )
    })
  })
})
