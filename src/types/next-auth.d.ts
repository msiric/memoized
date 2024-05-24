import NextAuth from 'next-auth'
import { AuthProvider } from '.'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    id: string
    userId: string
    provider: AuthProvider
  }
  interface Account {
    provider: AuthProvider
    providerAccountId: string
  }
  interface User extends NextAuthUser {
    userId: string
    provider: string
  }
}
