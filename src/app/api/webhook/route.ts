import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  PrismaClient,
  SubscriptionStatus,
  SubscriptionPlan,
} from '@prisma/client'

const STRIPE_SECRET = process.env.STRIPE_SECRET ?? ''
const webhookSecret = process.env.STRIPE_WEBHOOK ?? ''

const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: '2024-04-10',
})

const prisma = new PrismaClient()

export const config = {
  api: {
    bodyParser: false,
  },
}

const TEST_SUBSCRIPTION = {
  id: 'sub_1PK2fPBOG7dj7GmqpuWZLVra',
  object: 'subscription',
  application: null,
  application_fee_percent: null,
  automatic_tax: {
    enabled: false,
    liability: null,
  },
  billing_cycle_anchor: 1716574595,
  billing_cycle_anchor_config: null,
  billing_thresholds: null,
  cancel_at: null,
  cancel_at_period_end: false,
  canceled_at: null,
  cancellation_details: {
    comment: null,
    feedback: null,
    reason: null,
  },
  collection_method: 'charge_automatically',
  created: 1716574595,
  currency: 'eur',
  current_period_end: 1748110595,
  current_period_start: 1716574595,
  customer: 'cus_QANOsQfl9dOafX',
  days_until_due: null,
  default_payment_method: null,
  default_source: 'card_1PK2fJBOG7dj7Gmq03O06ZRw',
  default_tax_rates: [],
  description: null,
  discount: null,
  discounts: [],
  ended_at: null,
  invoice_settings: {
    account_tax_ids: null,
    issuer: {
      type: 'self',
    },
  },
  items: {
    object: 'list',
    data: [
      {
        id: 'si_QANQEbEGjDRg7u',
        object: 'subscription_item',
        billing_thresholds: null,
        created: 1716574596,
        discounts: [],
        metadata: {},
        plan: {
          id: 'price_1PK2QYBOG7dj7GmqlD1ua98X',
          object: 'plan',
          active: true,
          aggregate_usage: null,
          amount: 10000,
          amount_decimal: '10000',
          billing_scheme: 'per_unit',
          created: 1716573674,
          currency: 'eur',
          interval: 'year',
          interval_count: 1,
          livemode: false,
          metadata: {},
          meter: null,
          nickname: null,
          product: 'prod_QANAHyMPuyOUgT',
          tiers_mode: null,
          transform_usage: null,
          trial_period_days: null,
          usage_type: 'licensed',
        },
        price: {
          id: 'price_1PK2QYBOG7dj7GmqlD1ua98X',
          object: 'price',
          active: true,
          billing_scheme: 'per_unit',
          created: 1716573674,
          currency: 'eur',
          custom_unit_amount: null,
          livemode: false,
          lookup_key: null,
          metadata: {},
          nickname: 'Yearly',
          product: 'prod_QANAHyMPuyOUgT',
          recurring: {
            aggregate_usage: null,
            interval: 'year',
            interval_count: 1,
            meter: null,
            trial_period_days: null,
            usage_type: 'licensed',
          },
          tax_behavior: 'unspecified',
          tiers_mode: null,
          transform_quantity: null,
          type: 'recurring',
          unit_amount: 10000,
          unit_amount_decimal: '10000',
        },
        quantity: 1,
        subscription: 'sub_1PK2fPBOG7dj7GmqpuWZLVry',
        tax_rates: [],
      },
    ],
    has_more: false,
    total_count: 1,
    url: '/v1/subscription_items?subscription=sub_1PK2fPBOG7dj7GmqpuWZLVry',
  },
  latest_invoice: 'in_1PK2fPBOG7dj7Gmq5D7LFd4D',
  livemode: false,
  metadata: {
    userId: 1,
  },
  next_pending_invoice_item_invoice: null,
  on_behalf_of: null,
  pause_collection: null,
  payment_settings: {
    payment_method_options: null,
    payment_method_types: null,
    save_default_payment_method: 'off',
  },
  pending_invoice_item_interval: null,
  pending_setup_intent: null,
  pending_update: null,
  plan: {
    id: 'price_1PK2QYBOG7dj7GmqlD1ua98X',
    object: 'plan',
    active: true,
    aggregate_usage: null,
    amount: 10000,
    amount_decimal: '10000',
    billing_scheme: 'per_unit',
    created: 1716573674,
    currency: 'eur',
    interval: 'year',
    interval_count: 1,
    livemode: false,
    metadata: {},
    meter: null,
    nickname: 'Yearly',
    product: 'prod_QANAHyMPuyOUgT',
    tiers_mode: null,
    transform_usage: null,
    trial_period_days: null,
    usage_type: 'licensed',
  },
  quantity: 1,
  schedule: null,
  start_date: 1716574595,
  status: 'active',
  test_clock: null,
  transfer_data: null,
  trial_end: null,
  trial_settings: {
    end_behavior: {
      missing_payment_method: 'create_invoice',
    },
  },
  trial_start: null,
}

async function fetchPricesFromStripe() {
  const prices = await stripe.prices.list({ limit: 100 })
  return prices.data.reduce(
    (acc, price) => {
      acc[price.id] = price
      return acc
    },
    {} as Record<string, Stripe.Price>,
  )
}

let cachedPrices: Record<string, Stripe.Price> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

async function getCachedPrices() {
  const now = Date.now()
  if (!cachedPrices || now - lastFetchTime > CACHE_DURATION) {
    cachedPrices = await fetchPricesFromStripe()
    lastFetchTime = now
  }
  return cachedPrices
}

async function getPlanFromStripePlan(
  priceId: string,
): Promise<SubscriptionPlan> {
  const prices = await getCachedPrices()
  const price = prices[priceId]

  if (!price) {
    throw new Error('Unknown price ID')
  }

  switch (price.nickname) {
    case 'Monthly':
      return SubscriptionPlan.MONTHLY
    case 'Yearly':
      return SubscriptionPlan.YEARLY
    case 'Lifetime':
      return SubscriptionPlan.LIFETIME
    default:
      throw new Error('Unknown price nickname')
  }
}

export async function POST(req: NextRequest) {
  const buf = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    })
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = TEST_SUBSCRIPTION as any
      //   const subscription = event.data.object as Stripe.Subscription
      console.log('SUBSCRIPTION', subscription)
      await handleSubscriptionEvent(subscription)
      break
    default:
      console.log(`Unhandled event type ${event.type}`)
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 })
}

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const userId = parseInt(subscription.metadata.userId)

  const plan = await getPlanFromStripePlan(subscription.items.data[0].price.id)
  const status = getStatusFromStripeStatus(subscription.status)
  const startDate = new Date(subscription.start_date * 1000)
  const endDate = subscription.ended_at
    ? new Date(subscription.ended_at * 1000)
    : null

  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await prisma.subscription.updateMany({
      where: { userId, stripeId: subscription.id },
      data: { status, endDate },
    })
  } else {
    await prisma.subscription.upsert({
      where: { stripeId: subscription.id },
      update: { plan, status, startDate, endDate },
      create: {
        userId,
        stripeId: subscription.id,
        plan,
        status,
        startDate,
        endDate,
      },
    })
  }
}

function getStatusFromStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      return SubscriptionStatus.EXPIRED
    default:
      return SubscriptionStatus.EXPIRED
  }
}
