import prisma from '@/lib/prisma'
import { sendEmail } from '@/services/email'
import { stripe } from '@/lib/stripe'
import { ServiceError, getErrorMessage } from '@/lib/sentry'
import { revalidateSubscription } from '@/lib/cache'
import {
  formatDate,
  getStatusFromStripeStatus,
  isProduction,
} from '@/utils/helpers'
import { getPlanFromStripePlan } from '@/lib/stripe-plans'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import { format } from 'date-fns'
import Stripe from 'stripe'
import { CustomerWithUser } from '../types'

// The only failure that justifies cancelling and refunding: the customer already
// had a different active plan, so this purchase is a genuine duplicate. Every
// other failure (database, Stripe API, races) is retried by Stripe and must
// never refund a paying customer.
export class DuplicateActiveSubscriptionError extends ServiceError {
  constructor(
    message: string,
    public conflicting: { stripeSubscriptionId: string; plan: SubscriptionPlan },
  ) {
    super(message, true, { feature: 'subscription', action: 'duplicate-active-subscription' })
    this.name = 'DuplicateActiveSubscriptionError'
  }
}

// Refund only when the plan that makes this purchase a duplicate is really still
// active in Stripe. A stale ACTIVE row (its cancellation webhook not processed
// yet) must not cost a customer their new purchase; the event is retried instead.
const isGenuineDuplicate = async (error: DuplicateActiveSubscriptionError) => {
  const { stripeSubscriptionId, plan } = error.conflicting
  if (plan === SubscriptionPlan.LIFETIME) return true
  try {
    const existing = await stripe.subscriptions.retrieve(stripeSubscriptionId)
    return ['active', 'trialing', 'past_due'].includes(existing.status)
  } catch {
    return false
  }
}

const shouldRefundDuplicate = async (error: unknown, refundDuplicates: boolean) =>
  refundDuplicates &&
  error instanceof DuplicateActiveSubscriptionError &&
  (await isGenuineDuplicate(error))

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'

// The webhook and the checkout return can record the same purchase at the same
// moment; the loser of the insert race retries and becomes an update.
const withUniqueRetry = async <T>(write: () => Promise<T>): Promise<T> => {
  try {
    return await write()
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    return write()
  }
}

export const getCustomerWithUserOrThrow = async (
  stripeCustomerId: string,
): Promise<CustomerWithUser> => {
  const customer = await prisma.customer.findUnique({
    where: { stripeCustomerId },
    select: {
      id: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  if (!customer?.user?.name || !customer?.user?.email) {
    throw new ServiceError('Failed to retrieve customer details')
  }

  return customer as CustomerWithUser
}

export const handleFailedRecurringSubscription = async (
  subscriptionId?: string | Stripe.Subscription | null,
) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId?.toString() ?? '',
      {
        expand: ['default_payment_method'],
      },
    )

    if (!subscription) {
      throw new ServiceError(`Failed to retrieve failed recurring subscription`)
    }

    await stripe.subscriptions.cancel(subscription.id, {
      idempotencyKey: `cancel-subscription-${subscription.id}`,
    })

    if (!subscription?.latest_invoice)
      throw new ServiceError(
        `No latest invoice found for subscription id: ${subscriptionId}`,
      )

    const invoice = await stripe.invoices.retrieve(
      subscription.latest_invoice as string,
    )

    if (!invoice?.payment_intent)
      throw new ServiceError(
        `Failed to retrieve payment intent for invoice: ${subscription.latest_invoice}`,
      )

    const paymentIntent = await stripe.paymentIntents.retrieve(
      invoice.payment_intent as string,
    )

    if (paymentIntent?.status !== 'succeeded')
      throw new ServiceError(
        `Failed to refund payment intent with subscription id: ${subscriptionId}`,
      )

    await stripe.refunds.create(
      { payment_intent: paymentIntent.id },
      { idempotencyKey: `refund-${paymentIntent.id}` },
    )
    return
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to handle failed recurring subscription`,
      true,
      { feature: 'subscription', action: 'handle-failed-subscription' },
      err,
    )
  }
}

export const handleFailedOneTimePayment = async (sessionId?: string | null) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items'],
    })

    if (!session) {
      throw new ServiceError(`Failed to retrieve session`)
    }

    if (!session?.payment_intent)
      throw new ServiceError(`Session does not have a payment intent`)

    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string,
    )

    if (!paymentIntent) {
      throw new ServiceError(`Failed to retrieve payment intent`)
    }

    if (paymentIntent.status !== 'succeeded')
      throw new ServiceError(
        `Payment intent status is not succeeded: ${paymentIntent.status}`,
      )

    await stripe.refunds.create(
      { payment_intent: paymentIntent.id },
      { idempotencyKey: `refund-${paymentIntent.id}` },
    )
    return
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to handle failed one-time payment`,
      true,
      { feature: 'subscription', action: 'handle-failed-payment' },
      err,
    )
  }
}

type SubscriptionManagerArgs = {
  stripeCustomer?: string | Stripe.Customer | Stripe.DeletedCustomer | null
  subscriptionId?: string | Stripe.Subscription | null
  updateAction?: boolean
  refundDuplicates?: boolean
}

export const updateSubscriptionDetails = async ({
  stripeCustomer,
  subscriptionId,
  updateAction = false,
  refundDuplicates = true,
}: SubscriptionManagerArgs) => {
  try {
    const stripeCustomerId =
      typeof stripeCustomer === 'string'
        ? stripeCustomer
        : (stripeCustomer?.id ?? '')

    const customer = await getCustomerWithUserOrThrow(stripeCustomerId)

    // Retrieve Stripe subscription (external call, outside transaction)
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId?.toString() ?? '',
      {
        expand: ['default_payment_method'],
      },
    )

    if (!subscription)
      throw new ServiceError(`Failed to retrieve subscription details`)

    const subscriptionPlan = await getPlanFromStripePlan(
      subscription.items.data[0].price.id,
    )

    if (!subscriptionPlan)
      throw new ServiceError(`Failed to determine subscription plan`)

    const subscriptionStatus = getStatusFromStripeStatus(subscription.status)

    const subscriptionData = {
      stripeSubscriptionId: subscription.id,
      customerId: customer.id,
      metadata: subscription.metadata,
      status: subscriptionStatus,
      plan: subscriptionPlan,
      priceId: subscription.items.data[0].price.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: formatDate(subscription.cancel_at),
      canceledAt: formatDate(subscription.canceled_at),
      currentPeriodStart: formatDate(
        subscription.current_period_start,
      ) as string,
      currentPeriodEnd: formatDate(subscription.current_period_end),
      startDate: formatDate(subscription.created) as string,
      endDate: formatDate(subscription.ended_at),
      createdAt: formatDate(subscription.created) as string,
      updatedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    }

    // Use transaction for atomic check + upsert
    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const existingActiveSubscription = await tx.subscription.findFirst({
        where: {
          customerId: customer.id,
          status: SubscriptionStatus.ACTIVE,
          NOT: {
            stripeSubscriptionId: subscription.id,
          },
        },
        select: { id: true, stripeSubscriptionId: true, plan: true },
      })

      if (existingActiveSubscription?.id && !updateAction) {
        throw new DuplicateActiveSubscriptionError(
          `User already has an active subscription`,
          existingActiveSubscription,
        )
      }

      return tx.subscription.upsert({
        where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
        update: subscriptionData,
        create: subscriptionData,
      })
    }))

    // Revalidation and email AFTER transaction commits
    revalidateSubscription({
      customerId: customer.id,
      userId: customer.user.id,
      subscriptionId: subscription.id,
    })

    if (isProduction() && !updateAction) {
      await sendEmail({
        to: customer.user.email,
        type: 'subscription',
        name: customer.user.name,
        idempotencyKey: `subscription-welcome/${subscription.id}`,
      })
    }

    return result
  } catch (err: unknown) {
    if (await shouldRefundDuplicate(err, refundDuplicates)) try {
      await handleFailedRecurringSubscription(subscriptionId)
    } catch (refundErr: unknown) {
      throw new ServiceError(
        `Failed to update subscription and handle failure: ${getErrorMessage(err)}. ` +
          `Refund error: ${getErrorMessage(refundErr)}`,
        true,
        { feature: 'subscription', action: 'update-subscription' },
        err,
      )
    }

    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to update subscription: ${getErrorMessage(err)}`,
      true,
      { feature: 'subscription', action: 'update-subscription' },
      err,
    )
  }
}

const isRefunded = (session: Stripe.Checkout.Session) => {
  const intent = session.payment_intent
  const charge =
    intent && typeof intent === 'object' && intent.latest_charge && typeof intent.latest_charge === 'object'
      ? intent.latest_charge
      : null
  return !!charge && (charge.refunded || charge.amount_refunded > 0)
}

// A fully refunded one-time purchase loses the lifetime access it granted.
// (Recurring plans end through Stripe's own subscription events.)
export const revokeRefundedLifetimeAccess = async (charge: Stripe.Charge) => {
  if (!charge.refunded || !charge.payment_intent) return null
  const paymentIntent =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent.id
  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 })
  const session = sessions.data[0]
  if (!session || session.mode !== 'payment') return null
  const result = await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: session.id, plan: SubscriptionPlan.LIFETIME },
    data: {
      status: SubscriptionStatus.CANCELED,
      canceledAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
      updatedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    },
  })
  return result.count
}

type OneTimePurchaseManagerArgs = {
  stripeCustomer?: string | null
  sessionId?: string | null
  refundDuplicates?: boolean
}

export const createLifetimeAccess = async ({
  stripeCustomer,
  sessionId,
  refundDuplicates = true,
}: OneTimePurchaseManagerArgs) => {
  try {
    const stripeCustomerId = stripeCustomer ?? ''

    const customer = await getCustomerWithUserOrThrow(stripeCustomerId)

    // Retrieve Stripe session (external call, outside transaction)
    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items', 'payment_intent.latest_charge'],
    })
    const lineItems = session?.line_items

    // Delayed payment methods complete checkout before the money arrives; access
    // is granted by checkout.session.async_payment_succeeded instead.
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required')
      return null
    // A refunded purchase (e.g. refunded as a duplicate) is never granted, however
    // often the event is retried or the success URL is revisited.
    if (isRefunded(session)) return null

    if (!lineItems)
      throw new ServiceError(`Failed to retrieve subscription details`)

    const subscriptionPlan = await getPlanFromStripePlan(
      lineItems.data[0].price?.id ?? '',
    )

    if (!subscriptionPlan)
      throw new ServiceError(`Failed to determine subscription plan`)

    const subscriptionStatus = SubscriptionStatus.ACTIVE

    const subscriptionData = {
      stripeSubscriptionId: session.id,
      customerId: customer.id,
      metadata: session.metadata ?? {},
      status: subscriptionStatus,
      plan: subscriptionPlan,
      priceId: lineItems.data[0].price?.id ?? null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      canceledAt: null,
      currentPeriodStart: formatDate(session.created) as string,
      currentPeriodEnd: null,
      startDate: formatDate(session.created) as string,
      endDate: null,
      createdAt: formatDate(session.created) as string,
      updatedAt: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"),
    }

    // Use transaction for atomic check + upsert
    const result = await withUniqueRetry(() => prisma.$transaction(async (tx) => {
      const existingSubscription = await tx.subscription.findFirst({
        where: {
          customerId: customer.id,
          status: SubscriptionStatus.ACTIVE,
          NOT: { stripeSubscriptionId: session.id },
        },
        select: { id: true, stripeSubscriptionId: true, plan: true },
      })

      if (existingSubscription?.id) {
        throw new DuplicateActiveSubscriptionError(
          `User already has an active subscription`,
          existingSubscription,
        )
      }

      return tx.subscription.upsert({
        where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
        update: subscriptionData,
        create: subscriptionData,
      })
    }))

    // Revalidation and email AFTER transaction commits
    revalidateSubscription({
      customerId: customer.id,
      userId: customer.user.id,
      subscriptionId: session.id,
    })

    if (isProduction()) {
      await sendEmail({
        to: customer.user.email,
        type: 'purchase',
        name: customer.user.name,
        idempotencyKey: `purchase-welcome/${session.id}`,
      })
    }

    return result
  } catch (err: unknown) {
    if (await shouldRefundDuplicate(err, refundDuplicates)) try {
      await handleFailedOneTimePayment(sessionId)
    } catch (refundErr: unknown) {
      throw new ServiceError(
        `Failed to create lifetime access and handle failure: ${getErrorMessage(err)}. ` +
          `Refund error: ${getErrorMessage(refundErr)}`,
        true,
        { feature: 'subscription', action: 'create-lifetime-access' },
        err,
      )
    }

    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to create lifetime access: ${getErrorMessage(err)}`,
      true,
      { feature: 'subscription', action: 'create-lifetime-access' },
      err,
    )
  }
}
