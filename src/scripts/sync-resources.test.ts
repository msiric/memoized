import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncResources } from './sync-resources'

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
}))

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => {
      const joined = args.join('/')
      if (joined.includes('src/resources/intro/page.mdx')) {
        return '/mock/src/resources/intro/page.mdx'
      }
      if (joined.includes('.git')) {
        return '/mock/src/content/.git'
      }
      if (joined.includes('samples')) {
        return '/mock/src/samples'
      }
      if (joined.includes('content')) {
        return '/mock/src/content'
      }
      return joined
    }),
  },
}))

vi.mock('../utils/helpers', () => ({
  isProduction: vi.fn(),
}))

vi.mock('@/lib/sentry', () => ({
  reportMdxError: vi.fn(),
}))

vi.mock('next-mdx-remote-client/serialize', () => ({
  serialize: vi.fn(),
}))

vi.mock('@/mdx/index.mjs', () => ({
  mdxOptions: {},
}))

vi.mock('@/constants/curriculum', () => ({
  completeCurriculum: [],
}))

vi.mock('@/constants', () => ({
  CONTENT_FOLDER: 'content',
  RESOURCES_FOLDER: 'resources',
  SAMPLES_FOLDER: 'samples',
  SLUGIFY_OPTIONS: { lower: true, strict: true },
}))

vi.mock('process', () => ({
  cwd: vi.fn(() => '/mock'),
}))

describe('sync-resources.ts - Two-Phase Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncResources', () => {
    it('should export syncResources function', () => {
      expect(typeof syncResources).toBe('function')
    })

    it('should sync intro resource within a transaction', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false
        if (pathStr.includes('samples')) return true
        if (pathStr.includes('intro/page.mdx')) return true
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('# Resources\n\nIntro content')
      vi.mocked(serialize).mockResolvedValue({
        compiledSource: 'mock-compiled',
        scope: {},
        frontmatter: {},
      } as any)

      const tx = {
        lesson: { findUnique: vi.fn() },
        resource: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: 'resource-id' }),
          update: vi.fn(),
        },
      }
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx))
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await syncResources()

      // Verify transaction was used
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 30000 },
      )

      // The intro resource is created with its stable contentId ('intro').
      expect(tx.resource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentId: 'intro',
          slug: 'intro',
          title: 'Resources',
          access: 'FREE',
        }),
      })
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle missing intro file gracefully', async () => {
      const fs = (await import('fs')).default
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git
        .mockReturnValueOnce(true)  // samples exist
        .mockReturnValueOnce(false) // intro doesn't exist

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          lesson: { findUnique: vi.fn() },
          resource: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn(),
            update: vi.fn(),
          },
        }
        return fn(tx)
      })
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).resolves.not.toThrow()
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle MDX serialization errors in production', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const { isProduction } = await import('../utils/helpers')
      const { reportMdxError } = await import('@/lib/sentry')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(fs.existsSync).mockReset()
      vi.mocked(isProduction).mockReturnValue(true)

      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false
        if (pathStr.includes('samples')) return true
        if (pathStr.includes('intro/page.mdx')) return true
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('# Bad MDX\n\nInvalid content')

      const serializationError = new Error('MDX compilation failed')
      vi.mocked(serialize).mockRejectedValue(serializationError)
      vi.mocked(reportMdxError).mockResolvedValue()
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).rejects.toThrow('MDX serialization failed')

      expect(reportMdxError).toHaveBeenCalledWith(serializationError, {
        contentLength: expect.any(Number),
        filePath: '/mock/src/resources/intro/page.mdx',
        operation: 'compilation',
      })
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle content path errors', async () => {
      const fs = (await import('fs')).default
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git
        .mockReturnValueOnce(false) // no samples

      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).rejects.toThrow(
        'No content source available',
      )
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should not persist if serialization fails (Phase 1 gates Phase 2)', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false
        if (pathStr.includes('samples')) return true
        if (pathStr.includes('intro/page.mdx')) return true
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('# Content')
      vi.mocked(serialize).mockRejectedValue(new Error('Serialization failed'))
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).rejects.toThrow()

      // Transaction should NOT have been called since Phase 1 failed
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })
})
