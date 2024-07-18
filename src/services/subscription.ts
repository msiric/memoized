import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { ServiceError } from '@/utils/error'
import {
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  toDateTime,
} from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'

export const handleFailedRecurringSubscription = async (
  subscriptionId?: string | Stripe.Subscription | null,
) => {
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId?.toString() ?? '',
    {
      expand: ['default_payment_method'],
    },
  )
  await stripe.subscriptions.cancel(subscription.id)
  console.log(`Successfully canceled Stripe subscription: ${subscription.id}`)

  if (subscription.latest_invoice) {
    const invoice = await stripe.invoices.retrieve(
      subscription.latest_invoice as string,
    )
    if (invoice.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        invoice.payment_intent as string,
      )
      if (paymentIntent.status === 'succeeded') {
        await stripe.refunds.create({ payment_intent: paymentIntent.id })
        console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
      }
    }
  }
}

export const handleFailedOneTimePayment = async (sessionId?: string | null) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
    expand: ['line_items'],
  })
  if (session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string,
    )
    if (paymentIntent.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: paymentIntent.id })
      console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
    }
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
          include: { customer: true },
        })
      : null

    const customer = updateAction
      ? recurringSubscription?.customer
      : await prisma.customer.findUnique({
          where: { stripeCustomerId: customerId ?? '' },
        })

    if (!customer)
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
      cancelAt: subscription.cancel_at
        ? toDateTime(subscription.cancel_at).toISOString()
        : null,
      canceledAt: subscription.canceled_at
        ? toDateTime(subscription.canceled_at).toISOString()
        : null,
      currentPeriodStart: toDateTime(
        subscription.current_period_start,
      ).toISOString(),
      currentPeriodEnd: toDateTime(
        subscription.current_period_end,
      ).toISOString(),
      startDate: toDateTime(subscription.created).toISOString(),
      endDate: subscription.ended_at
        ? toDateTime(subscription.ended_at).toISOString()
        : null,
      createdAt: toDateTime(subscription.created).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })
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
    })

    if (!customer)
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
      currentPeriodStart: toDateTime(session.created).toISOString(),
      currentPeriodEnd: null,
      startDate: toDateTime(session.created).toISOString(),
      endDate: null,
      createdAt: toDateTime(session.created).toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await prisma.subscription.upsert({
      where: { id: subscriptionData.stripeSubscriptionId },
      update: subscriptionData,
      create: subscriptionData,
    })
  } catch (err) {
    console.log(err)
    await handleFailedOneTimePayment(sessionId)
    throw new ServiceError(`Failed to create subscription`)
  }
}
