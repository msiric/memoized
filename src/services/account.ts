import prisma from '@/lib/prisma'

export const findAccount = (provider: string, providerAccountId: string) => {
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

export const createUserWithAccount = (
  email: string,
  name: string | null,
  image: string | null,
  provider: string,
  providerAccountId: string,
) => {
  return prisma.user.create({
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
}

export const findAccountWithUserByProviderAccountId = (
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
