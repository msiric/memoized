'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PREMIUM_QUERY_PARAM } from '@/constants'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createOrRetrieveCustomer } from '@/services/stripe'
import { getURL } from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'

type CheckoutResponse = {
  errorRedirect?: string
  sessionId?: string
  sessionUrl?: string | null
}

export async function createCheckout(
  price: Stripe.Price,
  redirectPath: string = `/course?${PREMIUM_QUERY_PARAM}=true`,
): Promise<CheckoutResponse> {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      console.error('Could not get user session.')
      throw new Error('Could not get user session.')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId ?? '' },
      include: {
        customer: {
          include: {
            subscriptions: {
              orderBy: { startDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    if (!user) {
      console.error('Could not fetch user details.')
      throw new Error('Could not fetch user details.')
    }

    if (user.customer?.subscriptions[0].status === SubscriptionStatus.ACTIVE) {
      console.error('User already has an active subscription')
      throw new Error('User already has an active subscription')
    }

    let customer: string
    try {
      customer = await createOrRetrieveCustomer({
        userId: user.id,
        userEmail: user.email,
      })
    } catch (err) {
      console.error(err)
      throw new Error('Unable to access customer record.')
    }

    let params: Stripe.Checkout.SessionCreateParams = {
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer,
      client_reference_id: customer,
      customer_update: {
        address: 'auto',
      },
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      cancel_url: getURL(),
      success_url: getURL(redirectPath),
    }

    if (price.type === 'recurring') {
      params = {
        ...params,
        mode: 'subscription',
      }
    } else if (price.type === 'one_time') {
      params = {
        ...params,
        mode: 'payment',
      }
    }

    let stripeSession
    try {
      stripeSession = await stripe.checkout.sessions.create(params)
    } catch (err) {
      console.error(err)
      throw new Error('Unable to create checkout session.')
    }

    if (stripeSession) {
      return { sessionId: stripeSession.id, sessionUrl: stripeSession.url }
    } else {
      throw new Error('Unable to create checkout session.')
    }
  } catch (error) {
    const errorDetails =
      'Please try again later or contact a system administrator.'
    if (error instanceof Error) {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          error.message,
          errorDetails,
        ),
      }
    } else {
      return {
        errorRedirect: getErrorRedirect(
          redirectPath,
          'An unknown error occurred.',
          errorDetails,
        ),
      }
    }
  }
}

function getErrorRedirect(
  redirectPath: string,
  errorMessage: string,
  errorDetails: string,
): string {
  return `${redirectPath}?error=${encodeURIComponent(
    errorMessage,
  )}&details=${encodeURIComponent(errorDetails)}`
}
