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

    let customer: string
    try {
      customer = await createOrRetrieveCustomer({
        userId: user.id,
        userEmail: user.email,
      })
    } catch (err) {
      return createCustomError({
        message: 'Failed to retrieve customer details',
        showSnackbar: true,
      })
    }

    if (!customer) {
      return createCustomError({
        message: 'Failed to retrieve customer details',
        showSnackbar: true,
      })
    }

    try {
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
    } catch (err) {
      return createCustomError({
        message: 'Failed to create billing portal',
        showSnackbar: true,
      })
    }
  } catch (error) {
    return createCustomError({
      message: 'Failed to create billing portal',
      showSnackbar: true,
    })
  }
}
