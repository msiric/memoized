import prisma from '@/lib/prisma'
import { sendEmail } from '@/services/email'
import { stripe } from '@/lib/stripe'
import {
  restoreWonDisputeAccess,
  revokeRefundedLifetimeAccess,
  suspendDisputedAccess,
  createLifetimeAccess,
  handleFailedOneTimePayment,
  handleFailedRecurringSubscription,
  updateSubscriptionDetails,
} from '@/services/subscription'
import {
  formatDate,
  getStatusFromStripeStatus,
  isProduction,
} from '@/utils/helpers'
import { getPlanFromStripePlan } from '@/lib/stripe-plans'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}))

// Mock external dependencies
vi.mock('@/lib/prisma')
vi.mock('@/services/email')
vi.mock('@/lib/stripe')
vi.mock('@/utils/helpers')
vi.mock('@/lib/stripe-plans')

describe('Subscription services', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Mock $transaction to execute the callback with prisma as the transaction client
    vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
      return fn(prisma)
    })
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

      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null as any)
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
      const mockSubscription = {
        id: 'sub_new',
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
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
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
        idempotencyKey: 'subscription-welcome/sub_123',
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

    it('should throw an error when Stripe subscription retrieval fails', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(null as any)

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_123',
        }),
      ).rejects.toThrow('Failed to retrieve subscription details')
    })

    it('should throw an error when subscription plan cannot be determined', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSubscription = {
        id: 'sub_123',
        items: { data: [{ price: { id: 'unknown_price' } }] },
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
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(undefined)

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_123',
        }),
      ).rejects.toThrow('Failed to determine subscription plan')
    })

    it('should throw compound error when both update and refund fail', async () => {
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
        latest_invoice: 'inv_123',
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue(
        mockSubscription as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'sub_existing', stripeSubscriptionId: 'cs_lifetime_old', plan: SubscriptionPlan.LIFETIME } as any,
      )
      vi.spyOn(stripe.subscriptions, 'cancel').mockRejectedValue(
        new Error('Stripe cancel failed'),
      )
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.MONTHLY,
      )
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(
        SubscriptionStatus.ACTIVE,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )

      await expect(
        updateSubscriptionDetails({
          stripeCustomer: 'cus_123',
          subscriptionId: 'sub_123',
        }),
      ).rejects.toThrow(/Failed to update subscription and handle failure/)
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

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123', {
        idempotencyKey: 'cancel-subscription-sub_123',
      })
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        { payment_intent: 'pi_123' },
        { idempotencyKey: 'refund-pi_123' },
      )
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
      const mockCustomer = { id: 'cus_123', user: { email: null, name: null } }

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
        select: {
          id: true,
          user: { select: { id: true, name: true, email: true } },
        },
      })
    })

    it('cancels and refunds a genuine duplicate subscription', async () => {
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
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'sub_existing', stripeSubscriptionId: 'cs_lifetime_old', plan: SubscriptionPlan.LIFETIME } as any,
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
      ).rejects.toThrow('User already has an active subscription')

      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123', {
        idempotencyKey: 'cancel-subscription-sub_123',
      })
      expect(stripe.refunds.create).toHaveBeenCalledWith(
        { payment_intent: 'pi_123' },
        { idempotencyKey: 'refund-pi_123' },
      )
    })

    it.each([false, true])('never cancels or refunds on a database error (updateAction=%s)', async (updateAction) => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        { id: 'cus_123', user: { email: 'test@mail.com', name: 'Test' } } as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({
        id: 'sub_123', items: { data: [{ price: { id: 'price_123' } }] }, status: 'active', metadata: {},
        cancel_at_period_end: false, cancel_at: null, canceled_at: null, current_period_start: 1,
        current_period_end: 2, created: 1, ended_at: null, latest_invoice: 'inv_123',
      } as any)
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(SubscriptionPlan.MONTHLY)
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(SubscriptionStatus.ACTIVE)
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'upsert').mockRejectedValue(new Error('Database error'))
      vi.spyOn(stripe.subscriptions, 'cancel').mockResolvedValue({} as any)
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)
      await expect(
        updateSubscriptionDetails({ stripeCustomer: 'cus_123', subscriptionId: 'sub_123', updateAction }),
      ).rejects.toThrow('Failed to update subscription: Database error')
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('retries once when the created and updated webhooks race on the same subscription', async () => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        { id: 'cus_123', user: { email: 'test@mail.com', name: 'Test' } } as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({
        id: 'sub_123', items: { data: [{ price: { id: 'price_123' } }] }, status: 'active', metadata: {},
        cancel_at_period_end: false, cancel_at: null, canceled_at: null, current_period_start: 1,
        current_period_end: 2, created: 1, ended_at: null,
      } as any)
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(SubscriptionPlan.MONTHLY)
      vi.mocked(getStatusFromStripeStatus).mockReturnValue(SubscriptionStatus.ACTIVE)
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'upsert')
        .mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
        .mockResolvedValueOnce({ id: 'row' } as any)
      vi.spyOn(stripe.subscriptions, 'cancel').mockResolvedValue({} as any)
      await expect(
        updateSubscriptionDetails({ stripeCustomer: 'cus_123', subscriptionId: 'sub_123' }),
      ).resolves.toEqual({ id: 'row' })
      expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
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
        payment_status: 'paid',
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
      const mockSession = {
        id: 'cs_123',
        payment_status: 'paid',
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
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
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
        payment_status: 'paid',
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
        idempotencyKey: 'purchase-welcome/cs_123',
      })
    })

    it('should throw an error when customer details are missing', async () => {
      const mockCustomer = { id: 'cus_123', user: { email: null, name: null } }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow('Failed to retrieve customer details')
    })

    it('should throw an error when session line items are missing', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSession = {
        id: 'cs_123',
        payment_status: 'paid',
        created: 1625097600,
        metadata: {},
        line_items: null,
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow('Failed to retrieve subscription details')
    })

    it('should throw an error when subscription plan cannot be determined', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSession = {
        id: 'cs_123',
        payment_status: 'paid',
        created: 1625097600,
        metadata: {},
        line_items: { data: [{ price: { id: 'unknown_price' } }] },
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(undefined)

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow('Failed to determine subscription plan')
    })

    it('refunds a genuine duplicate lifetime purchase', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSession = {
        id: 'cs_123',
        payment_status: 'paid',
        created: 1625097600,
        metadata: {},
        line_items: { data: [{ price: { id: 'price_123' } }] },
        payment_intent: 'pi_123',
      }
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'sub_existing', stripeSubscriptionId: 'cs_lifetime_old', plan: SubscriptionPlan.LIFETIME } as any,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow('User already has an active subscription')

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        { payment_intent: 'pi_123' },
        { idempotencyKey: 'refund-pi_123' },
      )
    })

    it('should throw compound error when both create and refund fail', async () => {
      const mockCustomer = {
        id: 'cus_123',
        user: { email: 'test@mail.com', name: 'Test' },
      }
      const mockSession = {
        id: 'cs_123',
        payment_status: 'paid',
        created: 1625097600,
        metadata: {},
        line_items: { data: [{ price: { id: 'price_123' } }] },
        payment_intent: null, // No payment intent means refund will fail
      }

      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        mockCustomer as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'sub_existing', stripeSubscriptionId: 'cs_lifetime_old', plan: SubscriptionPlan.LIFETIME } as any,
      )
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(
        SubscriptionPlan.LIFETIME,
      )
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )

      await expect(
        createLifetimeAccess({
          sessionId: 'cs_123',
          stripeCustomer: 'cus_123',
        }),
      ).rejects.toThrow(/Failed to create lifetime access and handle failure/)
    })

    const lifetimeSetup = (session: Record<string, unknown> = {}) => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(
        { id: 'cus_123', user: { email: 'test@mail.com', name: 'Test' } } as any,
      )
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue({
        id: 'cs_123', payment_status: 'paid', created: 1625097600, metadata: {},
        line_items: { data: [{ price: { id: 'price_123' } }] }, payment_intent: 'pi_123',
        ...session,
      } as any)
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(SubscriptionPlan.LIFETIME)
      vi.mocked(formatDate).mockImplementation((timestamp) =>
        timestamp ? new Date(timestamp * 1000).toISOString() : null,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue({ id: 'pi_123', status: 'succeeded' } as any)
    }

    it('never refunds a paying customer because of a database or API error', async () => {
      lifetimeSetup()
      vi.spyOn(prisma.subscription, 'upsert').mockRejectedValue(new Error('Database error'))
      await expect(
        createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' }),
      ).rejects.toThrow('Failed to create lifetime access: Database error')
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('does not grant access before a delayed payment has succeeded', async () => {
      lifetimeSetup({ payment_status: 'unpaid' })
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({} as any)
      await expect(
        createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' }),
      ).resolves.toBeNull()
      expect(prisma.subscription.upsert).not.toHaveBeenCalled()
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('treats the same purchase recorded twice as idempotent, not a duplicate', async () => {
      lifetimeSetup()
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({ id: 'row' } as any)
      await createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' })
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ NOT: { stripeSubscriptionId: 'cs_123' } }),
      }))
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('retries once when a concurrent writer inserted the same purchase first', async () => {
      lifetimeSetup()
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'upsert')
        .mockRejectedValueOnce(Object.assign(new Error('Unique constraint'), { code: 'P2002' }))
        .mockResolvedValueOnce({ id: 'row' } as any)
      await expect(
        createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' }),
      ).resolves.toEqual({ id: 'row' })
      expect(prisma.subscription.upsert).toHaveBeenCalledTimes(2)
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('leaves duplicate refunds to the webhook when called from the checkout return', async () => {
      lifetimeSetup()
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue({ id: 'sub_existing', stripeSubscriptionId: 'cs_lifetime_old', plan: SubscriptionPlan.LIFETIME } as any)
      await expect(
        createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123', refundDuplicates: false }),
      ).rejects.toThrow('User already has an active subscription')
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })
  })

  describe('handleFailedOneTimePayment', () => {
    it('should refund payment if successful', async () => {
      const mockSession = { id: 'cs_123', payment_intent: 'pi_123' }
      const mockPaymentIntent = { id: 'pi_123', status: 'succeeded' }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue(
        mockPaymentIntent as any,
      )
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)

      await handleFailedOneTimePayment('cs_123')

      expect(stripe.refunds.create).toHaveBeenCalledWith(
        { payment_intent: 'pi_123' },
        { idempotencyKey: 'refund-pi_123' },
      )
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
      const mockSession = { id: 'cs_123', payment_intent: null }

      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(
        mockSession as any,
      )

      await expect(handleFailedOneTimePayment('cs_123')).rejects.toThrow(
        'Session does not have a payment intent',
      )
    })

    it('should handle case when payment intent status is not succeeded', async () => {
      const mockSession = { id: 'cs_123', payment_intent: 'pi_123' }
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

  describe('refund and duplicate safety', () => {
    const customer = { id: 'cus_row', user: { email: 'test@mail.com', name: 'Test' } }
    const lifetimeSession = (overrides: Record<string, unknown> = {}) => ({
      id: 'cs_123', payment_status: 'paid', created: 1625097600, metadata: {}, payment_intent: null,
      line_items: { data: [{ price: { id: 'price_123' } }] }, ...overrides,
    })
    const setup = (session: Record<string, unknown>) => {
      vi.spyOn(prisma.customer, 'findUnique').mockResolvedValue(customer as any)
      vi.spyOn(stripe.checkout.sessions, 'retrieve').mockResolvedValue(session as any)
      vi.mocked(getPlanFromStripePlan).mockResolvedValue(SubscriptionPlan.LIFETIME)
      vi.mocked(formatDate).mockImplementation((t) => (t ? new Date(t * 1000).toISOString() : null))
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(null)
      vi.spyOn(prisma.subscription, 'upsert').mockResolvedValue({ status: SubscriptionStatus.ACTIVE } as any)
      vi.spyOn(stripe.refunds, 'create').mockResolvedValue({} as any)
    }

    it('never grants a refunded purchase, however often the event or link is replayed', async () => {
      setup(lifetimeSession({ payment_intent: { latest_charge: { refunded: true, amount_refunded: 9900 } } }))
      await expect(createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' })).resolves.toBeNull()
      expect(prisma.subscription.upsert).not.toHaveBeenCalled()
    })

    it('never grants a partially refunded purchase', async () => {
      setup(lifetimeSession({ payment_intent: { latest_charge: { refunded: false, amount_refunded: 100 } } }))
      await expect(createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' })).resolves.toBeNull()
    })

    it('grants a 100%-off purchase that needed no payment', async () => {
      setup(lifetimeSession({ payment_status: 'no_payment_required' }))
      await createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' })
      expect(prisma.subscription.upsert).toHaveBeenCalled()
    })

    it('does not refund when the "existing" plan is a stale row already cancelled in Stripe', async () => {
      setup(lifetimeSession({ payment_intent: 'pi_123' }))
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'row', stripeSubscriptionId: 'sub_old_monthly', plan: SubscriptionPlan.MONTHLY } as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({ id: 'sub_old_monthly', status: 'canceled' } as any)
      await expect(createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' }))
        .rejects.toThrow('User already has an active subscription')
      expect(stripe.refunds.create).not.toHaveBeenCalled()
    })

    it('refunds when the existing monthly plan is really still active in Stripe', async () => {
      setup(lifetimeSession({ payment_intent: 'pi_123' }))
      vi.spyOn(prisma.subscription, 'findFirst').mockResolvedValue(
        { id: 'row', stripeSubscriptionId: 'sub_live', plan: SubscriptionPlan.MONTHLY } as any,
      )
      vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({ id: 'sub_live', status: 'active' } as any)
      vi.spyOn(stripe.paymentIntents, 'retrieve').mockResolvedValue({ id: 'pi_123', status: 'succeeded' } as any)
      await expect(createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' }))
        .rejects.toThrow('User already has an active subscription')
      expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_123' }, { idempotencyKey: 'refund-pi_123' })
    })

    it('revokes lifetime access when its charge is fully refunded', async () => {
      vi.spyOn(stripe.checkout.sessions, 'list').mockResolvedValue({ data: [{ id: 'cs_123', mode: 'payment' }] } as any)
      vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 } as any)
      await expect(revokeRefundedLifetimeAccess({ refunded: true, payment_intent: 'pi_123' } as any)).resolves.toBe(1)
      expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { stripeSubscriptionId: 'cs_123', plan: SubscriptionPlan.LIFETIME },
        data: expect.objectContaining({ status: SubscriptionStatus.CANCELED }),
      }))
    })

    describe('chargebacks', () => {
      const lifetimeCharge = (extra = {}) =>
        ({ id: 'ch_1', payment_intent: 'pi_1', invoice: null, refunded: false, amount_refunded: 0, ...extra }) as any
      const lifetimeSessionFor = () =>
        vi.spyOn(stripe.checkout.sessions, 'list').mockResolvedValue({ data: [{ id: 'cs_1', mode: 'payment' }] } as any)

      it('suspends lifetime access as soon as a dispute opens', async () => {
        vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue(lifetimeCharge())
        lifetimeSessionFor()
        vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 } as any)
        await expect(suspendDisputedAccess({ charge: 'ch_1', status: 'needs_response' } as any)).resolves.toBe(1)
        expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: { stripeSubscriptionId: 'cs_1', plan: SubscriptionPlan.LIFETIME, status: SubscriptionStatus.ACTIVE },
          data: expect.objectContaining({ status: SubscriptionStatus.CANCELED }),
        }))
      })

      it('cancels a disputed subscription in Stripe so it cannot renew, and ends access', async () => {
        vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue(lifetimeCharge({ invoice: 'in_1' }))
        vi.spyOn(stripe.invoices, 'retrieve').mockResolvedValue({ id: 'in_1', subscription: 'sub_1' } as any)
        vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({ id: 'sub_1', status: 'active' } as any)
        const cancel = vi.spyOn(stripe.subscriptions, 'cancel').mockResolvedValue({ id: 'sub_1' } as any)
        vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 } as any)
        await expect(suspendDisputedAccess({ charge: 'ch_1' } as any)).resolves.toBe(1)
        expect(cancel).toHaveBeenCalledWith('sub_1', undefined, { idempotencyKey: 'cancel-disputed-sub_1' })
        expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_1', status: SubscriptionStatus.ACTIVE },
          data: expect.objectContaining({ status: SubscriptionStatus.CANCELED }),
        }))
      })

      it('does not cancel a subscription twice', async () => {
        vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue(lifetimeCharge({ invoice: 'in_1' }))
        vi.spyOn(stripe.invoices, 'retrieve').mockResolvedValue({ id: 'in_1', subscription: 'sub_1' } as any)
        vi.spyOn(stripe.subscriptions, 'retrieve').mockResolvedValue({ id: 'sub_1', status: 'canceled' } as any)
        const cancel = vi.spyOn(stripe.subscriptions, 'cancel')
        vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 0 } as any)
        await suspendDisputedAccess({ charge: 'ch_1' } as any)
        expect(cancel).not.toHaveBeenCalled()
      })

      it('restores suspended lifetime access when the dispute is won', async () => {
        vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue(lifetimeCharge())
        lifetimeSessionFor()
        vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 1 } as any)
        await expect(restoreWonDisputeAccess({ charge: 'ch_1', status: 'won' } as any)).resolves.toBe(1)
        expect(prisma.subscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: { stripeSubscriptionId: 'cs_1', plan: SubscriptionPlan.LIFETIME, status: SubscriptionStatus.CANCELED },
          data: expect.objectContaining({ status: SubscriptionStatus.ACTIVE, canceledAt: null }),
        }))
      })

      it.each(['lost', 'needs_response', 'under_review'])('keeps access suspended when the dispute closes as %s', async (status) => {
        const retrieve = vi.spyOn(stripe.charges, 'retrieve')
        vi.spyOn(prisma.subscription, 'updateMany')
        await expect(restoreWonDisputeAccess({ charge: 'ch_1', status } as any)).resolves.toBeNull()
        expect(retrieve).not.toHaveBeenCalled()
        expect(prisma.subscription.updateMany).not.toHaveBeenCalled()
      })

      it('does not restore a won dispute whose purchase was refunded', async () => {
        vi.spyOn(stripe.charges, 'retrieve').mockResolvedValue(lifetimeCharge({ refunded: true, amount_refunded: 1000 }))
        vi.spyOn(prisma.subscription, 'updateMany')
        await expect(restoreWonDisputeAccess({ charge: 'ch_1', status: 'won' } as any)).resolves.toBeNull()
        expect(prisma.subscription.updateMany).not.toHaveBeenCalled()
      })

      it('never re-grants a charged-back purchase from its checkout session', async () => {
        setup(lifetimeSession({ payment_intent: { id: 'pi_1', latest_charge: { refunded: false, amount_refunded: 0, disputed: true } } }))
        await expect(createLifetimeAccess({ sessionId: 'cs_123', stripeCustomer: 'cus_123' })).resolves.toBeNull()
        expect(prisma.subscription.upsert).not.toHaveBeenCalled()
      })
    })

    it('keeps access on a partial refund', async () => {
      vi.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 0 } as any)
      await expect(revokeRefundedLifetimeAccess({ refunded: false, payment_intent: 'pi_123' } as any)).resolves.toBeNull()
      expect(prisma.subscription.updateMany).not.toHaveBeenCalled()
    })
  })
})
