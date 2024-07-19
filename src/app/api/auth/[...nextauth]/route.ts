import {
  createUserWithAccount,
  findAccount,
  findAccountWithUserByProviderAccountId,
} from '@/services/account'
import { AuthProvider } from '@/types'
import * as Sentry from '@sentry/nextjs'
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

      const existingAccount = await findAccount(provider, providerAccountId)

      if (existingAccount) {
        Sentry.setUser({ id: existingAccount.userId })
        return true
      }

      // Create new user and account with Stripe customer ID
      const newUser = await createUserWithAccount(
        email,
        user.name ?? null,
        user.image ?? null,
        provider,
        providerAccountId,
      )

      if (newUser) {
        Sentry.setUser({ id: newUser.id })
        return true
      }

      return false
    },
    async jwt({ user, token }) {
      if (user) {
        const account = await findAccountWithUserByProviderAccountId(user.id)

        if (account) {
          Sentry.setUser({ id: account.user.id })

          token.uid = account.id
          token.providerAccountId = account.providerAccountId
          token.stripeCustomerId = account.user.customer?.stripeCustomerId ?? ''
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
