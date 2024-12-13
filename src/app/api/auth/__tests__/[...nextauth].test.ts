import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authOptions } from '../[...nextauth]/route'
import { sendEmail } from '@/lib/resend'
import {
  createUserWithAccount,
  findAccount,
  findAccountWithUserByProviderAccountId,
} from '@/services/account'
import * as Sentry from '@sentry/nextjs'
import { AuthProvider } from '@/types'

vi.mock('@/lib/resend')
vi.mock('@/services/account')
vi.mock('@sentry/nextjs')
vi.mock('@/utils/helpers', () => ({
  isProduction: () => true,
}))

describe('NextAuth Configuration', () => {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
  }

  const mockAccount = {
    id: 'account_123',
    provider: 'github' as AuthProvider,
    providerAccountId: 'github_123',
    userId: 'user_123',
    user: {
      id: 'user_123',
      customer: {
        stripeCustomerId: 'cus_123',
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('session callback', () => {
    it('should enhance session with additional user data', async () => {
      const session = {
        user: { email: 'test@example.com' },
      }
      const token = {
        uid: 'account_123',
        userId: 'user_123',
        providerAccountId: 'github_123',
        stripeCustomerId: 'cus_123',
        provider: 'github',
      }

      const result = await authOptions.callbacks.session({
        session,
        token,
        user: mockUser,
      })

      expect(result).toEqual({
        user: { email: 'test@example.com' },
        id: 'account_123',
        userId: 'user_123',
        providerAccountId: 'github_123',
        stripeCustomerId: 'cus_123',
        provider: 'github',
      })
    })
  })

  describe('signIn callback', () => {
    it('should return false if required data is missing', async () => {
      const result = await authOptions.callbacks.signIn({
        user: { email: null },
        account: { providerAccountId: null, provider: null },
      } as any)

      expect(result).toBe(false)
    })

    it('should return true for existing accounts', async () => {
      vi.mocked(findAccount).mockResolvedValue(mockAccount)

      const result = await authOptions.callbacks.signIn({
        user: mockUser,
        account: {
          providerAccountId: 'github_123',
          provider: 'github',
        },
      } as any)

      expect(result).toBe(true)
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: mockAccount.userId })
    })

    it('should create new user and account if none exists', async () => {
      vi.mocked(findAccount).mockResolvedValue(null)
      vi.mocked(createUserWithAccount).mockResolvedValue({
        id: 'new_user_123',
        email: mockUser.email,
        name: mockUser.name,
        image: mockUser.image,
      })

      const result = await authOptions.callbacks.signIn({
        user: mockUser,
        account: {
          providerAccountId: 'github_123',
          provider: 'github',
        },
      } as any)

      expect(result).toBe(true)
      expect(createUserWithAccount).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        mockUser.image,
        'github',
        'github_123'
      )
      expect(sendEmail).toHaveBeenCalledWith({
        name: mockUser.name ?? '',
        to: mockUser.email,
        type: 'welcome',
      })
    })
  })

  describe('jwt callback', () => {
    it('should enhance token with user data', async () => {
      vi.mocked(findAccountWithUserByProviderAccountId).mockResolvedValue(mockAccount)

      const token = {}
      const result = await authOptions.callbacks.jwt({
        token,
        user: mockUser,
      } as any)

      expect(result).toEqual({
        uid: mockAccount.id,
        providerAccountId: mockAccount.providerAccountId,
        stripeCustomerId: mockAccount.user.customer.stripeCustomerId,
        userId: mockAccount.user.id,
        provider: mockAccount.provider,
      })
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: mockAccount.user.id })
    })

    it('should return unchanged token if no user provided', async () => {
      const token = { someKey: 'someValue' }
      const result = await authOptions.callbacks.jwt({
        token,
      } as any)

      expect(result).toEqual(token)
    })
  })
})
