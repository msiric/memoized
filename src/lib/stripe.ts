import Stripe from 'stripe'

export const STRIPE_SECRET = process.env.STRIPE_SECRET ?? ''
export const STRIPE_WEBHOOK = process.env.STRIPE_WEBHOOK ?? ''

export const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: '2024-04-10',
})
