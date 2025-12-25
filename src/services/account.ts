import prisma from '@/lib/prisma'
import { revalidateTag } from 'next/cache'
import { createOrRetrieveCustomer } from '@/services/stripe'

export const findAccount = async (
  provider: string,
  providerAccountId: string,
) => {
  return prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
        },
      },
    },
  })
}

export const createUserWithAccount = async (
  email: string,
  name: string | null,
  image: string | null,
  provider: string,
  providerAccountId: string,
) => {
  const result = await prisma.user.create({
    data: {
      email,
      name,
      image,
      accounts: {
        create: {
          provider,
          providerAccountId,
        },
      },
    },
  })

  try {
    await createOrRetrieveCustomer({
      userId: result.id,
      userEmail: result.email,
    })
  } catch (_error) {
    // Don't fail user creation if Stripe customer creation fails
    // The customer will be created later when they attempt a purchase
  }

  revalidateTag('account')
  revalidateTag(`account-${providerAccountId}`)
  revalidateTag('user')
  revalidateTag(`user-${result.id}`)

  return result
}

export const findAccountWithUserByProviderAccountId = async (
  providerAccountId: string,
) => {
  return prisma.account.findUnique({
    where: { providerAccountId },
    select: {
      id: true,
      providerAccountId: true,
      provider: true,
      user: {
        select: {
          id: true,
          customer: {
            select: {
              stripeCustomerId: true,
            },
          },
        },
      },
    },
  })
}
