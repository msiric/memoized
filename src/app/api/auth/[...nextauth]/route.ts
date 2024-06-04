import prisma from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { AuthProvider } from '@/types'
import NextAuth, { AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

const GITHUB_ID = process.env.GITHUB_ID
const GITHUB_SECRET = process.env.GITHUB_SECRET

const GOOGLE_ID = process.env.GOOGLE_ID
const GOOGLE_SECRET = process.env.GOOGLE_SECRET

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: GITHUB_ID ?? 'Ov23liRdhFixfTbBNcdB',
      clientSecret: GITHUB_SECRET ?? 'aae4076d67dd68ecf7af29f8e4098a5678b0889a',
    }),
    GoogleProvider({
      clientId:
        GOOGLE_ID ??
        '458470353587-avnf4vl5q33i0fgoo5hvs1epe7d0feoq.apps.googleusercontent.com',
      clientSecret: GOOGLE_SECRET ?? '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',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET as string,
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.id = token.uid as string
        session.userId = token.userId as string
        session.providerAccountId = token.providerAccountId as string
        session.stripeCustomerId = token.stripeCustomerId as string
        session.provider = token.provider as AuthProvider
      }
      return session
    },
    async signIn({ user, account }) {
      const email = user.email
      const providerAccountId = account?.providerAccountId
      const provider = account?.provider

      if (!email || !providerAccountId || !provider) return false

      const existingAccount = await prisma.account.findUnique({
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

      if (existingAccount) {
        return true
      }

      const stripeCustomer = await stripe.customers.create({
        email,
        name: user.name || undefined,
      })

      // Create new user and account with Stripe customer ID
      const newUser = await prisma.user.create({
        data: {
          email,
          name: user.name,
          image: user.image,
          stripeCustomerId: stripeCustomer.id,
          accounts: {
            create: {
              provider,
              providerAccountId,
            },
          },
        },
      })

      return newUser ? true : false
    },
    async jwt({ user, token }) {
      if (user) {
        const account = await prisma.account.findUnique({
          where: { providerAccountId: user.id },
          include: { user: true },
        })

        if (account) {
          token.uid = account.id
          token.providerAccountId = account.providerAccountId
          token.stripeCustomerId = account.user.stripeCustomerId
          token.userId = account.user.id
          token.provider = account.provider
        }
      }
      return token
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
