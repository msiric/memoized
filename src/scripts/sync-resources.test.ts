import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncResources } from './sync-resources'

vi.mock('@/services/resource', () => ({
  upsertResource: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: {
      findFirst: vi.fn(),
    },
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
      // Handle specific path constructions
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

vi.mock('@/lib/error-tracking', () => ({
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

describe('sync-resources.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('syncResources', () => {
    it('should export syncResources function', () => {
      expect(typeof syncResources).toBe('function')
    })

    it('should sync standalone resources intro page successfully', async () => {
      const { upsertResource } = await import('@/services/resource')
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const prisma = (await import('@/lib/prisma')).default

      // Mock file system calls - getContentPath + syncResources intro file check
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false // getContentPath - no real content
        if (pathStr.includes('samples')) return true // getContentPath - samples exist
        if (pathStr.includes('intro/page.mdx')) return true // syncResources - intro exists
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('# Resources\n\nIntro content')
      vi.mocked(serialize).mockResolvedValue({
        compiledSource: 'mock-compiled',
        scope: {},
        frontmatter: {},
      } as any)
      vi.mocked(upsertResource).mockResolvedValue({} as any)
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await syncResources()

      expect(upsertResource).toHaveBeenCalledWith(
        'intro',
        'Resources',
        'Enhance Your Learning Journey',
        '# Resources\n\nIntro content',
        0,
        '/resources',
        'FREE',
        null,
        expect.any(Object),
      )
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle missing intro file gracefully', async () => {
      const fs = (await import('fs')).default
      const prisma = (await import('@/lib/prisma')).default

      // Mock file system calls - path.join handles path construction
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git in content (getContentPath)
        .mockReturnValueOnce(true) // samples exist (getContentPath)
        .mockReturnValueOnce(false) // intro file doesn't exist (syncResources)

      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).resolves.not.toThrow()
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle MDX serialization errors in production', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const { isProduction } = await import('../utils/helpers')
      const { reportMdxError } = await import('@/lib/error-tracking')
      const prisma = (await import('@/lib/prisma')).default

      // Explicitly clear and reset fs.existsSync mock to ensure clean state
      vi.mocked(fs.existsSync).mockReset()

      vi.mocked(isProduction).mockReturnValue(true)

      // Set up fresh mock implementation for this test
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false // getContentPath - no real content
        if (pathStr.includes('samples')) return true // getContentPath - samples exist
        if (pathStr.includes('intro/page.mdx')) return true // syncResources - intro exists
        return false
      })

      const testContent = '# Bad MDX\n\nInvalid content'
      vi.mocked(fs.readFileSync).mockReturnValue(testContent)

      const serializationError = new Error('MDX compilation failed')
      vi.mocked(serialize).mockRejectedValue(serializationError)
      vi.mocked(reportMdxError).mockResolvedValue()
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).rejects.toThrow('MDX serialization failed')

      expect(reportMdxError).toHaveBeenCalledWith(serializationError, {
        contentLength: testContent.length,
        filePath: '/mock/src/resources/intro/page.mdx',
        operation: 'compilation',
      })
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const prisma = (await import('@/lib/prisma')).default

      // Mock content path resolution and intro file
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git in content
        .mockReturnValueOnce(true) // samples exist
        .mockReturnValueOnce(true) // intro file exists

      vi.mocked(fs.readFileSync).mockReturnValue('# Resources\n\nContent')
      vi.mocked(serialize).mockResolvedValue({
        compiledSource: 'mock-compiled',
        scope: {},
        frontmatter: {},
      } as any)

      const dbError = new Error('Database connection error')
      vi.mocked(prisma.$disconnect).mockRejectedValue(dbError)

      await expect(syncResources()).rejects.toThrow('Database connection error')
    })

    it('should handle empty curriculum gracefully', async () => {
      const fs = (await import('fs')).default
      const prisma = (await import('@/lib/prisma')).default

      // Mock content path resolution but no intro file
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git in content
        .mockReturnValueOnce(true) // samples exist
        .mockReturnValueOnce(false) // intro file doesn't exist

      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).resolves.not.toThrow()
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle content path errors', async () => {
      const fs = (await import('fs')).default
      const prisma = (await import('@/lib/prisma')).default

      // Mock no content available
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // no .git in content
        .mockReturnValueOnce(false) // no samples

      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await expect(syncResources()).rejects.toThrow(
        'No content source available',
      )
      expect(prisma.$disconnect).toHaveBeenCalled()
    })

    it('should handle empty content by skipping serialization', async () => {
      const fs = (await import('fs')).default
      const { serialize } = await import('next-mdx-remote-client/serialize')
      const { upsertResource } = await import('@/services/resource')
      const prisma = (await import('@/lib/prisma')).default

      // Mock file system calls using implementation
      vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
        const pathStr = String(filePath)
        if (pathStr.includes('.git')) return false // getContentPath - no real content
        if (pathStr.includes('samples')) return true // getContentPath - samples exist
        if (pathStr.includes('intro/page.mdx')) return true // syncResources - intro exists
        return false
      })

      vi.mocked(fs.readFileSync).mockReturnValue('   ') // whitespace only
      vi.mocked(upsertResource).mockResolvedValue({} as any)
      vi.mocked(prisma.$disconnect).mockResolvedValue()

      await syncResources()

      // Should not call serialize for empty content
      expect(serialize).not.toHaveBeenCalled()

      // Should still call upsertResource but with null serializedBody
      expect(upsertResource).toHaveBeenCalledWith(
        'intro',
        'Resources',
        'Enhance Your Learning Journey',
        '   ',
        0,
        '/resources',
        'FREE',
        null,
        null, // serializedBody should be null for empty content
      )
    })
  })
})
