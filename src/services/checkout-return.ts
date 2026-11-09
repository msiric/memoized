import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { reportErrorSafely } from '@/lib/sentry'
import {
  DuplicateActiveSubscriptionError,
  createLifetimeAccess,
  updateSubscriptionDetails,
} from '@/services/subscription'
import { SubscriptionStatus } from '@prisma/client'
import type Stripe from 'stripe'

// What the buyer sees when they land back from Stripe Checkout.
export type CheckoutReturnState =
  | 'upgraded' // recorded and active
  | 'processing' // paid, being recorded (webhook in flight); page re-checks
  | 'pending_payment' // delayed payment method, money not cleared yet
  | 'unconfirmed' // cannot be confirmed from this request; no claim either way
  | 'failed' // checkout was not completed; nothing was charged

export type CheckoutReturn = { state: CheckoutReturnState; sessionId?: string }

const SESSION_ID = /^cs_(?:test_|live_)?[A-Za-z0-9]{1,200}$/
// The redirect happens seconds after payment. Older sessions are only reported
// from the database, never written from a URL, so a bookmarked or replayed
// success link cannot grant or restore anything.
const SETTLE_WINDOW_SECONDS = 60 * 60

const recordKey = (session: Stripe.Checkout.Session) =>
  session.mode === 'subscription'
    ? typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    : session.id

const fromRow = (status: SubscriptionStatus | undefined, sessionId: string): CheckoutReturn =>
  status === SubscriptionStatus.ACTIVE ? { state: 'upgraded', sessionId } : { state: 'unconfirmed', sessionId }

// When the buyer returns, record their own fresh purchase now instead of waiting
// for the webhook, so the page already shows Premium. The webhook stays
// authoritative; both write the same row idempotently. This path never cancels
// or refunds anything.
export async function settleCheckoutReturn(
  sessionId: string | undefined,
  userId: string | undefined,
): Promise<CheckoutReturn> {
  if (!sessionId || !SESSION_ID.test(sessionId) || !userId) return { state: 'unconfirmed' }

  let session: Stripe.Checkout.Session
  let stripeCustomerId: string | undefined
  try {
    const [retrieved, customer] = await Promise.all([
      stripe.checkout.sessions.retrieve(sessionId),
      prisma.customer.findUnique({ where: { userId }, select: { id: true, stripeCustomerId: true } }),
    ])
    session = retrieved
    stripeCustomerId = customer?.stripeCustomerId
    const sessionCustomer = typeof session.customer === 'string' ? session.customer : session.customer?.id
    // Only the buyer's own checkout session is ever looked at further.
    if (!customer || !stripeCustomerId || sessionCustomer !== stripeCustomerId) return { state: 'unconfirmed' }
    if (session.status !== 'complete') return { state: 'failed', sessionId: session.id }

    const key = recordKey(session)
    if (key) {
      const existing = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: key },
        select: { status: true, customerId: true },
      })
      // Already recorded (by the webhook or an earlier visit): no Stripe writes.
      if (existing && existing.customerId === customer.id) return fromRow(existing.status, session.id)
    }
    if (Date.now() / 1000 - session.created > SETTLE_WINDOW_SECONDS) return { state: 'unconfirmed', sessionId: session.id }
  } catch (error) {
    reportErrorSafely(error, { feature: 'checkout', action: 'read-checkout-return' })
    return { state: 'unconfirmed' }
  }

  try {
    if (session.mode === 'subscription' && session.subscription) {
      const row = await updateSubscriptionDetails({
        stripeCustomer: stripeCustomerId,
        subscriptionId: session.subscription,
        refundDuplicates: false,
      })
      return fromRow(row?.status, session.id)
    }
    if (session.mode === 'payment') {
      if (session.payment_status === 'unpaid') return { state: 'pending_payment', sessionId: session.id }
      const row = await createLifetimeAccess({
        stripeCustomer: stripeCustomerId,
        sessionId: session.id,
        refundDuplicates: false,
      })
      return row ? fromRow(row.status, session.id) : { state: 'unconfirmed', sessionId: session.id }
    }
    return { state: 'unconfirmed', sessionId: session.id }
  } catch (error) {
    // A duplicate is resolved (and refunded) by the webhook alone.
    if (error instanceof DuplicateActiveSubscriptionError) return { state: 'unconfirmed', sessionId: session.id }
    reportErrorSafely(error, { feature: 'checkout', action: 'settle-checkout-return' })
    return { state: 'processing', sessionId: session.id }
  }
}
