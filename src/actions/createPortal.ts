'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  createBillingPortalSession,
  createOrRetrieveCustomer,
} from '@/services/stripe'
import { getUserById } from '@/services/user'
import { createCustomError } from '@/utils/error'
import { createCustomResponse } from '@/utils/response'
import { getServerSession } from 'next-auth'

// Create tests for this method using Vitest. AI!
export async function createPortal() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return createCustomError({
        message: 'Failed to retrieve user session',
        showSnackbar: true,
      })
    }

    const user = await getUserById(session.userId ?? '')

    if (!user) {
      return createCustomError({
        message: 'Failed to retrieve user details',
        showSnackbar: true,
      })
    }

    const customer = await createOrRetrieveCustomer({
      userId: user.id,
      userEmail: user.email,
    })

    if (!customer) {
      return createCustomError({
        message: 'Failed to retrieve customer details',
        showSnackbar: true,
      })
    }

    const { url } = await createBillingPortalSession(customer)

    if (!url) {
      return createCustomError({
        message: 'Failed to create billing portal',
        showSnackbar: true,
      })
    }
    return createCustomResponse({
      url,
    })
  } catch (error) {
    return createCustomError({
      message: 'Failed to create billing portal',
      showSnackbar: true,
      error,
    })
  }
}
