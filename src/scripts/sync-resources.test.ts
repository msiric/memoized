import { describe, it, expect, vi, beforeEach } from 'vitest'
import { persistResources, syncResources } from './sync-resources'

// Resources persist via the contentId-first upsert helper, which calls
// prisma.resource.findUnique/create/update directly (no global transaction).
// A lesson-associated resource resolves its lesson by [sectionSlug, slug].
vi.mock('@/lib/prisma', () => ({
  default: {
    $disconnect: vi.fn(),
    lesson: { findFirst: vi.fn() },
    resource: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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
  beforeEach(async () => {
    vi.clearAllMocks()

    // Arm the prisma model mocks so the upsert helper takes the create path
    // and disconnect resolves.
    const prisma = (await import('@/lib/prisma')).default
    vi.mocked(prisma.lesson.findFirst).mockResolvedValue(null as any)
    vi.mocked(prisma.resource.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.resource.create).mockResolvedValue({
      id: 'resource-id',
    } as any)
    vi.mocked(prisma.resource.update).mockResolvedValue({
      id: 'resource-id',
    } as any)
    vi.mocked(prisma.$disconnect).mockResolvedValue(undefined as any)
  })

  describe('syncResources', () => {
    it('should export syncResources function', () => {
      expect(typeof syncResources).toBe('function')
    })

    it('should sync intro resource via a contentId-first upsert', async () => {
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

      await syncResources()

      // The intro resource is created with its stable contentId ('intro').
      expect(prisma.resource.create).toHaveBeenCalledWith({
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
        .mockReturnValueOnce(true) // samples exist
        .mockReturnValueOnce(false) // intro doesn't exist

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

      await expect(syncResources()).rejects.toThrow()

      // Persistence should NOT have run since Phase 1 failed
      expect(prisma.resource.create).not.toHaveBeenCalled()
    })
  })

  describe('persistResources', () => {
    it('resolves a lesson-associated resource by [sectionSlug, slug]', async () => {
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.lesson.findFirst).mockResolvedValue({
        id: 'lesson-1',
      } as any)

      await persistResources([
        {
          contentId: 'resource-content-id',
          slug: 'cheatsheet',
          title: 'Cheatsheet',
          description: 'A handy cheatsheet',
          body: '# Cheatsheet',
          order: 1,
          href: '/resources/cheatsheet',
          access: 'FREE',
          lessonSlug: 'closures',
          sectionSlug: 'core-fundamentals',
          serializedBody: null as any,
        },
      ])

      // The lesson foreign key is resolved within its section, not by a global
      // slug — two lessons could share the slug across sections.
      expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
        where: { slug: 'closures', section: { slug: 'core-fundamentals' } },
        select: { id: true },
      })
      // The resource is created against the resolved lesson.
      expect(prisma.resource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contentId: 'resource-content-id',
          slug: 'cheatsheet',
          lessonId: 'lesson-1',
        }),
      })
    })

    it('skips lesson resolution for a resource with no lesson', async () => {
      const prisma = (await import('@/lib/prisma')).default

      await persistResources([
        {
          contentId: 'intro',
          slug: 'intro',
          title: 'Resources',
          description: 'Intro',
          body: '# Intro',
          order: 0,
          href: '/resources',
          access: 'FREE',
          lessonSlug: null,
          sectionSlug: null,
          serializedBody: null as any,
        },
      ])

      expect(prisma.lesson.findFirst).not.toHaveBeenCalled()
      expect(prisma.resource.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ contentId: 'intro', lessonId: null }),
      })
    })
  })
})
