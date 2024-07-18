import prisma from '@/lib/prisma'

export const findAccount = (provider: string, providerAccountId: string) => {
  return prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    include: {
      user: true,
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
    include: { user: { include: { customer: true } } },
  })
}
