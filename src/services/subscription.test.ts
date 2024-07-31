import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { stripe } from '@/lib/stripe'
import {
  createLifetimeAccess,
  handleFailedOneTimePayment,
  handleFailedRecurringSubscription,
  updateSubscriptionDetails,
} from '@/services/subscription'
import {
  formatDate,
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  isProduction,
} from '@/utils/helpers'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/lib/resend')
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
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
        metadata: {},
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
        ended_at: null,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )
      vi.mocked(isProduction).mockReturnValue(false)

      await updateSubscriptionDetails({
        stripeCustomer: 'cus_123',
        subscriptionId: 'sub_123',
        updateAction: false,
      })

      expect(prisma.subscription.upsert).toHaveBeenCalled()
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('should throw an error when user already has an active subscription', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockExistingSubscription = {
        id: 'sub_existing',
        status: SubscriptionStatus.ACTIVE,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        mockExistingSubscription as any,
      )

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_new',
        }),
      ).rejects.toThrow('User already has an active subscription')
    })

    it('should send email in production environment', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
        metadata: {},
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
        ended_at: null,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )
      vi.mocked(isProduction).mockReturnValue(true)

      await updateSubscriptionDetails({
        stripeCustomer: 'cus_123',
        subscriptionId: 'sub_123',
      })

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@mail.com',
        type: 'subscription',
        name: 'Test',
      })
    })

    it('should update existing subscription when updateAction is true', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockStripeSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
        metadata: {},
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
        ended_at: null,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockStripeSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )

      await updateSubscriptionDetails({
        stripeCustomer: 'cus_123',
        subscriptionId: 'sub_123',
        updateAction: true,
      })

      expect(prisma.subscription.upsert).toHaveBeenCalled()
      expect(sendEmail).not.toHaveBeenCalled()
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
      ).rejects.toThrow('Failed to retrieve failed recurring subscription')
    })

    it('should throw an error when customer details are missing', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: null, name: null },
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_123',
        }),
      ).rejects.toThrow('Failed to retrieve customer details')
    })

    it('should handle non-string stripeCustomer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
        metadata: {},
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
        ended_at: null,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )

      await updateSubscriptionDetails({
        stripeCustomer: { id: 'cus_123' } as any,
        subscriptionId: 'sub_123',
      })

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { stripeCustomerId: 'cus_123' },
        select: { id: true, user: true },
      })
    })

    it('should handle failed recurring subscription', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'incomplete',
        metadata: {},
        cancel_at_period_end: false,
        cancel_at: null,
        canceled_at: null,
        current_period_start: 1625097600,
        current_period_end: 1627776000,
        created: 1625097600,
        ended_at: null,
        latest_invoice: 'inv_123',
      }
      const mockInvoice = { payment_intent: 'pi_123' }
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'upsert').mockRejectedValue(
        new Error('Upsert failed'),
      )
      vi.spyOn(stripe.subscriptions, 'cancel').mockResolvedValue({} as any)
      vi.spyOn(stripe.invoices, 'retrieve').mockResolvedValue(
        mockInvoice as any,
      )
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_123',
        }),
      ).rejects.toThrow('Failed to update subscription: Upsert failed')

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123')
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
      })
    })
  })

  describe('createLifetimeAccess', () => {
    it('should create lifetime access successfully', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
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

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )
      vi.mocked(isProduction).mockReturnValue(false)

      await createLifetimeAccess({
        sessionId: 'cs_123',
        stripeCustomer: 'cus_123',
      })

      expect(prisma.subscription.upsert).toHaveBeenCalled()
      expect(sendEmail).not.toHaveBeenCalled()
    })

    it('should throw an error when user already has an active subscription', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockExistingSubscription = {
        id: 'sub_existing',
        status: SubscriptionStatus.ACTIVE,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        mockExistingSubscription as any,
      )

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow('User already has an active subscription')
    })

    it('should send email in production environment', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
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

      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )
      vi.mocked(isProduction).mockReturnValue(true)

      await createLifetimeAccess({
        sessionId: 'cs_123',
        stripeCustomer: 'cus_123',
      })

      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@mail.com',
        type: 'purchase',
        name: 'Test',
      })
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

    it('should handle case when payment intent is not found', async () => {
      const mockSession = {
        id: 'cs_123',
        payment_intent: null,
      }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Session does not have a payment intent',
      )
    })

    it('should handle case when payment intent status is not succeeded', async () => {
      const mockSession = {
        id: 'cs_123',
        payment_intent: 'pi_123',
      }
      const mockPaymentIntent = {
        id: 'pi_123',
        status: 'requires_payment_method',
      }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Payment intent status is not succeeded: requires_payment_method',
      )
    })

    it('should throw ServiceError when session is not found', async () => {
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        null as any,
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Failed to retrieve session',
      )
    })
  })
})
