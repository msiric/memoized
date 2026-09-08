import { stripe } from '@/lib/stripe'
import { SubscriptionPlan } from '@prisma/client'
import type Stripe from 'stripe'

// Server consumers import this module directly, never through client utilities.
export const fetchPricesFromStripe = async () => {
  const prices = await stripe.prices.list({ limit: 100 })
  return prices.data.reduce(
    (acc, price) => {
      acc[price.id] = price
      return acc
    },
    {} as Record<string, Stripe.Price>,
  )
}

export const getPlanFromStripePlan = async (
  priceId: string,
): Promise<SubscriptionPlan | void> => {
  const price = (await fetchPricesFromStripe())[priceId]
  if (!price) return
  switch (price.nickname) {
    case 'Monthly':
      return SubscriptionPlan.MONTHLY
    case 'Yearly':
      return SubscriptionPlan.YEARLY
    case 'Lifetime':
      return SubscriptionPlan.LIFETIME
    default:
      return
  }
}
