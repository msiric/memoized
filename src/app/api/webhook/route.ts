import Stripe from 'stripe'
// import {
//   upsertProductRecord,
//   upsertPriceRecord,
//   updateSubscriptionDetails,
//   deleteProductRecord,
//   deletePriceRecord
// } from '@/utils/supabase/admin';
import prisma from '@/lib/prisma'
import { STRIPE_WEBHOOK, stripe } from '@/lib/stripe'
import {
  getPlanFromStripePlan,
  getStatusFromStripeStatus,
  toDateTime,
} from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'

const relevantEvents = new Set([
  //   'product.created',
  //   'product.updated',
  //   'product.deleted',
  //   'price.created',
  //   'price.updated',
  //   'price.deleted',
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

async function handleFailedRecurringSubscription(
  subscriptionId?: string | Stripe.Subscription | null,
) {
  try {
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId?.toString() ?? '',
      {
        expand: ['default_payment_method'],
      },
    )
    // Cancel the subscription
    await stripe.subscriptions.cancel(subscription.id)
    console.log(`Successfully canceled Stripe subscription: ${subscription.id}`)

    // Issue a refund if there was an initial payment
    if (subscription.latest_invoice) {
      const invoice = await stripe.invoices.retrieve(
        subscription.latest_invoice as string,
      )
      if (invoice.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          invoice.payment_intent as string,
        )
        if (paymentIntent.status === 'succeeded') {
          await stripe.refunds.create({
            payment_intent: paymentIntent.id,
          })
          console.log(
            `Successfully refunded payment intent: ${paymentIntent.id}`,
          )
        }
      }
    }
  } catch (error) {
    console.error(`Failed to handle failed subscription: ${error}`)
    // Additional error handling or alerts can be placed here
  }
}

async function handleFailedOneTimePayment(sessionId?: string | null) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId ?? '', {
      expand: ['line_items'],
    })
    // Issue a refund
    if (session.payment_intent) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string,
      )
      if (paymentIntent.status === 'succeeded') {
        await stripe.refunds.create({
          payment_intent: paymentIntent.id,
        })
        console.log(`Successfully refunded payment intent: ${paymentIntent.id}`)
      }
    }
  } catch (error) {
    console.error(`Failed to handle failed lifetime subscription: ${error}`)
  }
}

type SubscriptionManagerArgs = {
  subscriptionId?: string | Stripe.Subscription | null
  customerId?: string | null
  updateAction?: boolean
}

const updateSubscriptionDetails = async ({
  subscriptionId,
  customerId,
  updateAction = false,
}: SubscriptionManagerArgs) => {
  try {
    const recurringSubscription = updateAction
      ? await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId?.toString() ?? '' },
          include: {
            customer: true,
          },
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
    throw new Error(`Subscription insert/update failed`)
  }
}

type OneTimePurchaseManagerArgs = {
  sessionId?: string | null
  customerId?: string | null
}

const createLifetimeAccess = async ({
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
    throw new Error(`Subscription insert failed`)
  }
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string
  let event: Stripe.Event

  try {
    if (!sig || !STRIPE_WEBHOOK)
      return new Response('Webhook secret not found.', { status: 400 })
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK)
    console.log(`🔔  Webhook received: ${event.type}`)
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log('event type', event.type)

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        // case 'product.created':
        // case 'product.updated':
        //   await upsertProductRecord(event.data.object as Stripe.Product);
        //   break;
        // case 'price.created':
        // case 'price.updated':
        //   await upsertPriceRecord(event.data.object as Stripe.Price);
        //   break;
        // case 'price.deleted':
        //   await deletePriceRecord(event.data.object as Stripe.Price);
        //   break;
        // case 'product.deleted':
        //   await deleteProductRecord(event.data.object as Stripe.Product);
        //   break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const updateAction = event.type !== 'customer.subscription.created'
          const { id: subscriptionId } = subscription
          await updateSubscriptionDetails({ subscriptionId, updateAction })
          break
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session
          const {
            subscription: subscriptionId,
            id: sessionId,
            client_reference_id: customerId,
          } = checkoutSession
          if (checkoutSession.mode === 'subscription') {
            await updateSubscriptionDetails({ subscriptionId, customerId })
          } else if (checkoutSession.mode === 'payment') {
            await createLifetimeAccess({ sessionId, customerId })
          }
          break
        }
        default:
          return console.log('Unhandled relevant event')
      }
    } catch (error) {
      console.log(error)
      return new Response(
        'Webhook handler failed. View your Next.js function logs.',
        {
          status: 400,
        },
      )
    }
  } else {
    return new Response(`Unsupported event type: ${event.type}`, {
      status: 400,
    })
  }
  return new Response(JSON.stringify({ received: true }))
}
