import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { stripe } from '@/lib/stripe'
import { ServiceError, getErrorMessage } from '@/lib/error-tracking'
import {
  formatDate,
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  isProduction,
} from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import { format } from 'date-fns'
import { revalidateTag } from 'next/cache'
import Stripe from 'stripe'

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

    await stripe.subscriptions.cancel(subscription.id)
    console.log(`Successfully canceled Stripe subscription: ${subscription.id}`)

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

    await stripe.refunds.create({ payment_intent: paymentIntent.id })
    console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
    return
  } catch (err) {
    if (err instanceof ServiceError) {
      throw err
    }
    console.error(err)
    throw new ServiceError(`Failed to handle failed recurring subscription`)
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

    await stripe.refunds.create({ payment_intent: paymentIntent.id })
    console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
    return
  } catch (err) {
    console.error('Error caught in handleFailedOneTimePayment:', err)
    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(`Failed to handle failed one-time payment`)
  }
}

type SubscriptionManagerArgs = {
  stripeCustomer?: string | Stripe.Customer | Stripe.DeletedCustomer | null
  subscriptionId?: string | Stripe.Subscription | null
  updateAction?: boolean
}

export const updateSubscriptionDetails = async ({
  stripeCustomer,
  subscriptionId,
  updateAction = false,
}: SubscriptionManagerArgs) => {
  try {
    const customerId =
      typeof stripeCustomer === 'string'
        ? stripeCustomer
        : (stripeCustomer?.id ?? '')

    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: customerId ?? '' },
      select: { id: true, user: true },
    })

    if (!customer?.user?.name || !customer?.user?.email)
      throw new ServiceError(`Failed to retrieve customer details`)

    const existingActiveSubscription = await prisma.subscription.findFirst({
      where: {
        customerId: customer.id,
        status: SubscriptionStatus.ACTIVE,
        NOT: {
          stripeSubscriptionId: subscriptionId?.toString() ?? '',
        },
      },
      select: { id: true },
    })

    if (existingActiveSubscription?.id && !updateAction) {
      throw new ServiceError(`User already has an active subscription`)
    }

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

    const result = await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })

    revalidateTag('subscription')
    revalidateTag(`subscription-${subscription.id}`)
    revalidateTag(`customer-${customer.id}`)
    revalidateTag(`user-${customer.user.id}`)
    revalidateTag('user-subscription')
    revalidateTag('user')
    revalidateTag('account')

    if (isProduction() && !updateAction) {
      await sendEmail({
        to: customer.user.email,
        type: 'subscription',
        name: customer.user.name,
      })
    }

    return result
  } catch (err: unknown) {
    console.error('Error in updateSubscriptionDetails:', err)

    try {
      await handleFailedRecurringSubscription(subscriptionId)
    } catch (refundErr: unknown) {
      console.error('Error while handling failed subscription:', refundErr)

      throw new ServiceError(
        `Failed to update subscription and handle failure: ${getErrorMessage(err)}. ` +
          `Refund error: ${getErrorMessage(refundErr)}`,
      )
    }

    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to update subscription: ${getErrorMessage(err)}`,
    )
  }
}

type OneTimePurchaseManagerArgs = {
  stripeCustomer?: string | null
  sessionId?: string | null
}

export const createLifetimeAccess = async ({
  stripeCustomer,
  sessionId,
}: OneTimePurchaseManagerArgs) => {
  try {
    const customerId = stripeCustomer ?? ''

    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: customerId },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
      },
    })

    if (!customer?.user?.name || !customer?.user?.email)
      throw new ServiceError(`Failed to retrieve customer details`)

    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        customerId: customer.id,
        status: SubscriptionStatus.ACTIVE,
      },
      select: { id: true },
    })

    if (existingSubscription?.id) {
      throw new ServiceError(`User already has an active subscription`)
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items'],
    })
    const lineItems = session?.line_items

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

    const result = await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })

    revalidateTag('subscription')
    revalidateTag(`subscription-${session.id}`)
    revalidateTag(`customer-${customer.id}`)
    revalidateTag(`user-${customer.user.id}`)
    revalidateTag('user-subscription')
    revalidateTag('user')
    revalidateTag('account')

    if (isProduction()) {
      await sendEmail({
        to: customer.user.email,
        type: 'purchase',
        name: customer.user.name,
      })
    }

    return result
  } catch (err: unknown) {
    console.error('Error in createLifetimeAccess:', err)

    try {
      await handleFailedOneTimePayment(sessionId)
    } catch (refundErr: unknown) {
      console.error('Error while handling failed payment:', refundErr)

      throw new ServiceError(
        `Failed to create lifetime access and handle failure: ${getErrorMessage(err)}. ` +
          `Refund error: ${getErrorMessage(refundErr)}`,
      )
    }

    if (err instanceof ServiceError) {
      throw err
    }
    throw new ServiceError(
      `Failed to create lifetime access: ${getErrorMessage(err)}`,
    )
  }
}
