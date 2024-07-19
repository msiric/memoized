import prisma from '@/lib/prisma'
import {
  createUserWithAccount,
  findAccount,
  findAccountWithUserByProviderAccountId,
} from '@/services/account'
import { Mock, afterEach, describe, expect, it, vi } from 'vitest'

// Mocking the Prisma client
vi.mock('@/lib/prisma', () => {
  const actualPrisma = vi.importActual('@/lib/prisma')
  return {
    ...actualPrisma,
    default: {
      account: {
        findUnique: vi.fn(),
      },
      user: {
        create: vi.fn(),
      },
    },
  }
})

describe('Prisma Services', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('findAccount', () => {
    it('should find an account by provider and providerAccountId', async () => {
      const mockAccount = {
        id: '1',
        provider: 'github',
        providerAccountId: '123',
        user: { id: '1', email: 'test@example.com' },
      }
      ;(prisma.account.findUnique as Mock).mockResolvedValue(mockAccount)

      const account = await findAccount('github', '123')
      expect(account).toEqual(mockAccount)
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: 'github',
            providerAccountId: '123',
          },
        },
        include: {
          user: true,
        },
      })
    })

    it('should return null if account is not found', async () => {
      ;(prisma.account.findUnique as Mock).mockResolvedValue(null)

      const account = await findAccount('github', '123')
      expect(account).toBeNull()
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: {
          provider_providerAccountId: {
            provider: 'github',
            providerAccountId: '123',
          },
        },
        include: {
          user: true,
        },
      })
    })
  })

  describe('createUserWithAccount', () => {
    it('should create a user with account', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        image: null,
        accounts: [{ provider: 'github', providerAccountId: '123' }],
      }
      ;(prisma.user.create as Mock).mockResolvedValue(mockUser)

      const user = await createUserWithAccount(
        'test@example.com',
        'Test User',
        null,
        'github',
        '123',
      )
      expect(user).toEqual(mockUser)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          image: null,
          accounts: {
            create: {
              provider: 'github',
              providerAccountId: '123',
            },
          },
        },
      })
    })
  })

  describe('findAccountWithUserByProviderAccountId', () => {
    it('should find an account with user by providerAccountId', async () => {
      const mockAccount = {
        id: '1',
        providerAccountId: '123',
        user: {
          id: '1',
          email: 'test@example.com',
          customer: {},
        },
      }
      ;(prisma.account.findUnique as Mock).mockResolvedValue(mockAccount)

      const account = await findAccountWithUserByProviderAccountId('123')
      expect(account).toEqual(mockAccount)
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { providerAccountId: '123' },
        include: { user: { include: { customer: true } } },
      })
    })

    it('should return null if account is not found', async () => {
      ;(prisma.account.findUnique as Mock).mockResolvedValue(null)

      const account = await findAccountWithUserByProviderAccountId('123')
      expect(account).toBeNull()
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { providerAccountId: '123' },
        include: { user: { include: { customer: true } } },
      })
    })
  })
})
