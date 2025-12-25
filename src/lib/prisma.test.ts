import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  })),
}))

describe('Prisma Singleton', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()

    delete (globalThis as any).prismaGlobal

    vi.resetModules()
  })

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv)

    delete (globalThis as any).prismaGlobal
  })

  describe('PrismaClient instantiation', () => {
    it('should create a PrismaClient instance', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma = await import('@/lib/prisma')

      expect(PrismaClient).toHaveBeenCalled()
      expect(prisma.default).toBeDefined()
      expect(typeof prisma.default).toBe('object')
    })

    it('should have expected Prisma methods', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma = await import('@/lib/prisma')

      expect(prisma.default.$connect).toBeDefined()
      expect(prisma.default.$disconnect).toBeDefined()
      expect(prisma.default.$transaction).toBeDefined()
      expect(prisma.default.user).toBeDefined()
      expect(prisma.default.account).toBeDefined()
    })
  })

  describe('Singleton behavior', () => {
    it('should return the same instance when imported multiple times in development', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma1 = await import('@/lib/prisma')
      const prisma2 = await import('@/lib/prisma')

      expect(prisma1.default).toBe(prisma2.default)
      expect(PrismaClient).toHaveBeenCalledTimes(1)
    })

    it('should use global instance if it exists', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const mockPrismaInstance = new PrismaClient()
      ;(globalThis as any).prismaGlobal = mockPrismaInstance

      const prisma = await import('@/lib/prisma')

      expect(prisma.default).toBe(mockPrismaInstance)
    })

    it('should create new instance if global does not exist', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      expect((globalThis as any).prismaGlobal).toBeUndefined()

      const prisma = await import('@/lib/prisma')

      expect(prisma.default).toBeDefined()
      expect(PrismaClient).toHaveBeenCalledTimes(1)
    })
  })

  describe('Global state management', () => {
    it('should set global instance in development environment', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma = await import('@/lib/prisma')

      expect((globalThis as any).prismaGlobal).toBeDefined()
      expect((globalThis as any).prismaGlobal).toBe(prisma.default)
    })

    it('should set global instance in test environment', async () => {
      vi.stubEnv('NODE_ENV', 'test')

      const prisma = await import('@/lib/prisma')

      expect((globalThis as any).prismaGlobal).toBeDefined()
      expect((globalThis as any).prismaGlobal).toBe(prisma.default)
    })

    it('should NOT set global instance in production environment', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const prisma = await import('@/lib/prisma')

      expect((globalThis as any).prismaGlobal).toBeUndefined()
      expect(prisma.default).toBeDefined()
    })
  })

  describe('Environment-specific behavior', () => {
    it('should create new instances in production (no singleton)', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      await import('@/lib/prisma')
      vi.resetModules()

      await import('@/lib/prisma')

      expect(PrismaClient).toHaveBeenCalledTimes(2)
      expect((globalThis as any).prismaGlobal).toBeUndefined()
    })

    it('should reuse instance in development via global', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const _prisma1 = await import('@/lib/prisma')
      const firstGlobal = (globalThis as any).prismaGlobal

      const prisma2 = await import('@/lib/prisma')

      expect(PrismaClient).toHaveBeenCalledTimes(1)
      expect((globalThis as any).prismaGlobal).toBe(firstGlobal)
      expect(prisma2.default).toBe(firstGlobal)
    })
  })

  describe('Type safety', () => {
    it('should have correct TypeScript types', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma = await import('@/lib/prisma')

      expect(typeof prisma.default.$connect).toBe('function')
      expect(typeof prisma.default.$disconnect).toBe('function')
      expect(typeof prisma.default.user.findMany).toBe('function')
      expect(typeof prisma.default.account.findUnique).toBe('function')
    })

    it('should properly extend global interface', () => {
      const mockPrisma = new PrismaClient()
      ;(globalThis as any).prismaGlobal = mockPrisma

      expect((globalThis as any).prismaGlobal).toBe(mockPrisma)

      delete (globalThis as any).prismaGlobal
    })
  })

  describe('Error handling', () => {
    it('should handle PrismaClient constructor errors gracefully', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const PrismaClientMock = vi.mocked(PrismaClient)
      PrismaClientMock.mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      await expect(async () => {
        await import('@/lib/prisma')
      }).rejects.toThrow('Database connection failed')
    })
  })

  describe('Module isolation', () => {
    it('should maintain singleton across multiple test runs', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const prisma1 = await import('@/lib/prisma')
      const instance1 = prisma1.default

      const prisma2 = await import('@/lib/prisma')
      const instance2 = prisma2.default

      expect(instance1).toBe(instance2)
      expect((globalThis as any).prismaGlobal).toBe(instance1)
    })

    it('should properly clean up between test environments', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      const _devPrisma = await import('@/lib/prisma')
      expect((globalThis as any).prismaGlobal).toBeDefined()

      delete (globalThis as any).prismaGlobal
      vi.resetModules()
      vi.stubEnv('NODE_ENV', 'production')

      const prodPrisma = await import('@/lib/prisma')
      expect((globalThis as any).prismaGlobal).toBeUndefined()
      expect(prodPrisma.default).toBeDefined()
    })
  })
})
