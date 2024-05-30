import 'next-auth'
import { AuthProvider } from '.'

declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    id: string
    userId: string
    provider: AuthProvider
    providerAccountId: string
    stripeCustomerId: string
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
