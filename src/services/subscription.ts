import prisma from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { stripe } from '@/lib/stripe'
import { ServiceError } from '@/utils/error'
import {
  formatDate,
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  isProduction,
} from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import { format } from 'date-fns'
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

    if (subscription?.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(
        subscription.latest_invoice as string,
      )
      if (invoice?.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          invoice.payment_intent as string,
        )
        if (paymentIntent?.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: paymentIntent.id })
          console.log(
            `Successfully refunded payment intent: ${paymentIntent.id}`,
          )
          return
        }
      }
    }
    console.log(
      `Failed to refund payment intent with subscription id: ${subscriptionId}`,
    )
  } catch (err) {
    throw new ServiceError(`Failed to handle failed recurring subscription`)
  }
}

export const handleFailedOneTimePayment = async (sessionId?: string | null) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items'],
    })
    if (session?.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string,
      )
      if (paymentIntent?.status === 'succeeded') {
        await stripe.refunds.create({ payment_intent: paymentIntent.id })
        console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
        return
      }
    }
    console.log(`Failed to refund payment intent with session id: ${sessionId}`)
  } catch (err) {
    console.log('Error caught in handleFailedOneTimePayment:', err)
    throw new ServiceError(`Failed to handle failed one-time payment`)
  }
}

type SubscriptionManagerArgs = {
  subscriptionId?: string | Stripe.Subscription | null
  customerId?: string | null
  updateAction?: boolean
}

export const updateSubscriptionDetails = async ({
  subscriptionId,
  customerId,
  updateAction = false,
}: SubscriptionManagerArgs) => {
  try {
    const recurringSubscription = updateAction
      ? await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId?.toString() ?? '' },
          include: { customer: { include: { user: true } } },
        })
      : null

    const customer = updateAction
      ? recurringSubscription?.customer
      : await prisma.customer.findUnique({
          where: { stripeCustomerId: customerId ?? '' },
          include: { user: true },
        })

    if (!customer?.user?.name || !customer?.user?.email)
      return console.log(`Customer lookup failed: No customer found`)

    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId?.toString() ?? '',
      {
        expand: ['default_payment_method'],
      },
    )

    if (!subscription)
      return console.log(`Subscription lookup failed: No subscription found`)

    const subscriptionPlan = await getPlanFromStripePlan(
      subscription.items.data[0].price.id,
    )

    if (!subscriptionPlan)
      return console.log(`Subscription plan unknown: No plan found`)

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

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })

    if (isProduction() && !updateAction) {
      await sendEmail({
        to: customer.user.email,
        type: 'subscription',
        user: customer.user,
      })
    }
  } catch (err) {
    console.log(err)
    await handleFailedRecurringSubscription(subscriptionId)
    throw new ServiceError(`Failed to upsert subscription`)
  }
}

type OneTimePurchaseManagerArgs = {
  sessionId?: string | null
  customerId?: string | null
}

export const createLifetimeAccess = async ({
  sessionId,
  customerId,
}: OneTimePurchaseManagerArgs) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { stripeCustomerId: customerId ?? '' },
      include: { user: true },
    })

    if (!customer?.user?.name || !customer?.user?.email)
      return console.log(`Customer lookup failed: No customer found`)

    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items'],
    })
    const lineItems = session?.line_items

    if (!lineItems)
      return console.log(`Subscription lookup failed: No subscription found`)

    const subscriptionPlan = await getPlanFromStripePlan(
      lineItems.data[0].price?.id ?? '',
    )

    if (!subscriptionPlan)
      return console.log(`Subscription plan unknown: No plan found`)

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

    await prisma.subscription.upsert({
      where: { id: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })

    if (isProduction()) {
      await sendEmail({
        to: customer.user.email,
        type: 'purchase',
        user: customer.user,
      })
    }
  } catch (err) {
    console.log('Error caught in createLifetimeAccess:', err)
    await handleFailedOneTimePayment(sessionId)
    throw new ServiceError(`Failed to create lifetime access`)
  }
}
