import { STRIPE_WEBHOOK, stripe } from '@/lib/stripe'
import {
  createLifetimeAccess,
  updateSubscriptionDetails,
} from '@/services/subscription'
import Stripe from 'stripe'
import * as Sentry from '@sentry/nextjs'

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string
  let event: Stripe.Event

  try {
    if (process.env.NODE_ENV !== 'test') {
      if (!sig || !STRIPE_WEBHOOK)
        return new Response('Webhook secret not found.', { status: 400 })
      event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK)
    } else {
      // Mock event for testing
      event = JSON.parse(body)
    }
    console.log(`🔔  Webhook received: ${event.type}`)
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log('event type', event.type)

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
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
      Sentry.captureException(error)
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
