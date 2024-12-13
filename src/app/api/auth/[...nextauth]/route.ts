
import { sendEmail } from '@/lib/resend'
import {
  createUserWithAccount,
  findAccount,
  findAccountWithUserByProviderAccountId,
} from '@/services/account'
import { AuthProvider } from '@/types'
import { isProduction } from '@/utils/helpers'
import * as Sentry from '@sentry/nextjs'
import NextAuth, { AuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'

const GITHUB_ID = process.env.AUTH_GITHUB_ID ?? ''
const GITHUB_SECRET = process.env.AUTH_GITHUB_SECRET ?? ''

const GOOGLE_ID = process.env.AUTH_GOOGLE_ID ?? ''
const GOOGLE_SECRET = process.env.AUTH_GOOGLE_SECRET ?? ''

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: GITHUB_ID,
      clientSecret: GITHUB_SECRET,
    }),
    GoogleProvider({
      clientId: GOOGLE_ID,
      clientSecret: GOOGLE_SECRET,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET ?? '',
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
        if (isProduction()) {
          Sentry.setUser({ id: existingAccount.userId })
        }
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
        if (isProduction()) {
          Sentry.setUser({ id: newUser.id })
          await sendEmail({
            name: newUser.name ?? '',
            to: newUser.email,
            type: 'welcome',
          })
        }
        return true
      }

      return false
    },
    async jwt({ user, token }) {
      if (user) {
        const account = await findAccountWithUserByProviderAccountId(user.id)

        if (account) {
          if (isProduction()) {
            Sentry.setUser({ id: account.user.id })
          }

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
