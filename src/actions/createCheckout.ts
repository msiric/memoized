'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  COURSES_PREFIX,
  PREMIUM_QUERY_PARAM,
  SESSION_QUERY_PARAM,
} from '@/constants'
import {
  createOrRetrieveCustomer,
  createStripeSession,
} from '@/services/stripe'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { ProductWithCoupon } from '@/types'
import { ServiceError, createCustomError } from '@/lib/error-tracking'
import { createCustomResponse } from '@/utils/response'
import { SubscriptionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'

export async function createCheckout(
  product: ProductWithCoupon,
  redirectPath: string = `${COURSES_PREFIX}?${PREMIUM_QUERY_PARAM}=true&${SESSION_QUERY_PARAM}={CHECKOUT_SESSION_ID}`,
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return createCustomError({
        message: 'Failed to retrieve user session',
        showSnackbar: true,
      })
    }

    const user = await getUserWithSubscriptionDetails(session.userId ?? '')

    if (!user || !user.id || !user.email) {
      return createCustomError({
        message: 'Failed to retrieve user details',
        showSnackbar: true,
      })
    }

    if (user.customer?.subscriptions[0]?.status === SubscriptionStatus.ACTIVE) {
      return createCustomError({
        message: 'Subscription already active',
        showSnackbar: true,
      })
    }

    const customer = await createOrRetrieveCustomer({
      userId: user.id,
      userEmail: user.email,
    })

    const stripeSession = await createStripeSession(
      product,
      customer,
      redirectPath,
    )

    if (!stripeSession) {
      return createCustomError({
        message: 'Failed to create checkout session',
        showSnackbar: true,
      })
    }

    return createCustomResponse({
      sessionId: stripeSession.id,
      sessionUrl: stripeSession.url,
    })
  } catch (error) {
    if (error instanceof ServiceError) {
      return createCustomError({
        message: error.message,
        showSnackbar: error.showSnackbar,
        error,
      })
    } else {
      return createCustomError({
        message: 'Failed to create checkout session',
        showSnackbar: true,
        error,
      })
    }
  }
}
