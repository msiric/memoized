import { STRIPE_WEBHOOK, stripe } from '@/lib/stripe'
import {
  createLifetimeAccess,
  updateSubscriptionDetails,
} from '@/services/subscription'
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from '@/services/webhook'
import { reportError } from '@/lib/error-tracking'
import Stripe from 'stripe'

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
  } catch (err: unknown) {
    return new Response(`Webhook Error: ${(err as Error)?.message}`, { status: 400 })
  }

  // Idempotency check - skip if already processed
  if (await isWebhookEventProcessed(event.id)) {
    return new Response(JSON.stringify({ received: true, skipped: true }))
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const updateAction = event.type !== 'customer.subscription.created'
          const { id: subscriptionId, customer: stripeCustomer } = subscription
          await updateSubscriptionDetails({
            stripeCustomer,
            subscriptionId,
            updateAction,
          })
          break
        }
        case 'checkout.session.completed': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session

          const { id: sessionId, client_reference_id: stripeCustomer } =
            checkoutSession
          if (checkoutSession.mode === 'payment') {
            await createLifetimeAccess({ sessionId, stripeCustomer })
          }
          break
        }
        default:
          // Unhandled relevant event - should not reach here
          break
      }
      
      // Mark event as processed after successful handling
      await markWebhookEventProcessed(event.id, event.type)
    } catch (error) {
      reportError(error, {
        feature: 'webhook',
        action: 'stripe-webhook',
        metadata: {
          eventType: event.type,
        }
      })
      
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
