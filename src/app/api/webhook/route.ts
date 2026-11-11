import { revalidatePath } from 'next/cache'
import { STRIPE_WEBHOOK, stripe } from '@/lib/stripe'
import {
  createLifetimeAccess,
  restoreWonDisputeAccess,
  revokeRefundedLifetimeAccess,
  suspendDisputedAccess,
  updateSubscriptionDetails,
} from '@/services/subscription'
import {
  isWebhookEventProcessed,
  markWebhookEventProcessed,
} from '@/services/webhook'
import { reportError } from '@/lib/sentry'
import Stripe from 'stripe'

const relevantEvents = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

// Coupons, prices and products feed the home page's cached sale banner.
// (/premium itself renders live.)
const pricingEvents = new Set([
  'coupon.created', 'coupon.updated', 'coupon.deleted',
  'price.created', 'price.updated', 'price.deleted',
  'product.created', 'product.updated', 'product.deleted',
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

  if (pricingEvents.has(event.type)) {
    // Idempotent and side-effect free apart from cache refresh; no event log needed.
    revalidatePath('/')
    return new Response(JSON.stringify({ received: true, revalidated: true }))
  }

  // Idempotency check - skip if already successfully processed
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
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded': {
          const checkoutSession = event.data.object as Stripe.Checkout.Session

          const { id: sessionId, client_reference_id: stripeCustomer } =
            checkoutSession
          if (checkoutSession.mode === 'payment') {
            await createLifetimeAccess({ sessionId, stripeCustomer })
          }
          break
        }
        case 'charge.refunded': {
          await revokeRefundedLifetimeAccess(event.data.object as Stripe.Charge)
          break
        }
        // Chargebacks: access ends when the dispute opens and lifetime access
        // returns if it is won (see suspendDisputedAccess).
        case 'charge.dispute.created': {
          await suspendDisputedAccess(event.data.object as Stripe.Dispute)
          break
        }
        case 'charge.dispute.closed': {
          await restoreWonDisputeAccess(event.data.object as Stripe.Dispute)
          break
        }
        default:
          // Unhandled relevant event - should not reach here
          break
      }

      // Mark as processed AFTER successful handling
      // Uses atomic insert - if another request already marked it, this is a no-op
      // (the work was already done successfully above, so duplicate marking is fine)
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
    // Return 200 for unsupported events to prevent Stripe retries
    return new Response(JSON.stringify({ received: true, ignored: true }))
  }

  return new Response(JSON.stringify({ received: true }))
}
