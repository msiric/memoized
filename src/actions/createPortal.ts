'use server'

import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createOrRetrieveCustomer } from '@/services/stripe'
import { getURL } from '@/utils/helpers'
import { getServerSession } from 'next-auth'

export async function createPortal(currentPath: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      console.error('Could not get user session.')
      throw new Error('Could not get user session.')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId ?? '' },
    })

    if (!user) {
      console.error('Could not fetch user details.')
      throw new Error('Could not fetch user details.')
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

    if (!customer) {
      throw new Error('Could not get customer.')
    }

    try {
      const { url } = await stripe.billingPortal.sessions.create({
        customer,
        return_url: getURL('/course'),
      })
      if (!url) {
        throw new Error('Could not create billing portal')
      }
      return url
    } catch (err) {
      console.error(err)
      throw new Error('Could not create billing portal')
    }
  } catch (error) {
    const errorDetails =
      'Please try again later or contact a system administrator.'
    if (error instanceof Error) {
      console.error(error)
      return getErrorRedirect(currentPath, error.message, errorDetails)
    } else {
      return getErrorRedirect(
        currentPath,
        'An unknown error occurred.',
        errorDetails,
      )
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
