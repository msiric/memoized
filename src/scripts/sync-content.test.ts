import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

vi.mock('fs')
vi.mock('path')
vi.mock('next-mdx-remote-client/serialize', () => ({
  serialize: vi.fn().mockResolvedValue({
    compiledSource: 'mock-compiled-source',
    scope: {},
    frontmatter: {},
  }),
}))
vi.mock('@/mdx/index.mjs', () => ({
  mdxOptions: { remarkPlugins: [], rehypePlugins: [] },
}))
vi.mock('@/constants', () => ({
  APP_NAME: 'Memoized',
  CONTENT_FOLDER: 'content',
  SAMPLES_FOLDER: 'samples',
  COURSES_PREFIX: '/courses',
  PREMIUM_PREFIX: '/premium',
  RESOURCES_FOLDER: 'resources',
  SLUGIFY_OPTIONS: { lower: true, strict: true },
}))
vi.mock('@/constants/curriculum', () => ({
  completeCurriculum: [
    {
      id: 'test-course',
      title: 'Test Course',
      description: 'Test course description',
      href: '/courses/test-course',
      sections: [
        {
          id: 'test-section',
          title: 'Test Section',
          description: 'Test section description',
          href: '/courses/test-course/test-section',
          lessons: [],
        },
      ],
    },
  ],
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  },
}))
vi.mock('slugify', () => {
  const slugifyFn = vi.fn((text: string) => {
    if (!text) return 'unknown'
    return text.toLowerCase().replace(/\s+/g, '-')
  })
  Object.assign(slugifyFn, { extend: vi.fn() })
  return {
    default: slugifyFn,
  }
})
vi.mock('date-fns', () => ({
  isPast: vi.fn().mockReturnValue(false),
}))
vi.mock('../utils/helpers', () => ({
  isProduction: vi.fn().mockReturnValue(false),
}))

describe('Sync Content Script - Two-Phase Architecture', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset serialize to default success mock (clearAllMocks clears call history but not implementations)
    const { serialize } = await import('next-mdx-remote-client/serialize')
    vi.mocked(serialize).mockResolvedValue({
      compiledSource: 'mock-compiled-source',
      scope: {},
      frontmatter: {},
    } as any)

    // Setup basic file system mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      const pathStr = path.toString()
      if (pathStr.includes('_lessons.json')) {
        return JSON.stringify({
          lessons: [
            {
              id: 'test-lesson',
              title: 'Test Lesson',
              description: 'Test Description',
              access: 'FREE',
              order: 1,
              problems: [
                {
                  title: 'Test Problem',
                  difficulty: 'EASY',
                  question: 'What is this?',
                  answer: '```typescript\nconsole.log("answer")\n```',
                  type: 'CODING',
                  href: 'https://example.com',
                },
              ],
            },
          ],
        })
      }
      return '# Test Content\n\nThis is test content.'
    })

    // Suppress console output in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('Content Detection', () => {
    it('detects main content when available', async () => {
      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      // Mock transaction to execute the callback
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      const consoleSpy = vi.spyOn(console, 'log')
      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 Using content from main directory',
      )
    })

    it('uses sample content when main content is not available', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        return pathStr.includes('samples')
      })

      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      const consoleSpy = vi.spyOn(console, 'log')
      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 Using sample content for development',
      )
    })

    it('handles missing content directories', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const { syncContent } = await import('./sync-content')

      await expect(syncContent()).rejects.toThrow('No content found!')
    })
  })

  describe('Phase 1: Content Preparation', () => {
    it('serializes courses, sections, lessons and problems', async () => {
      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      let transactionCallback: any = null
      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        transactionCallback = fn
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      await syncContent()

      // Transaction should have been called (Phase 2 ran)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('handles missing lesson files gracefully', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.includes('test-lesson/page.mdx')) {
          return false
        }
        return true
      })

      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      const consoleSpy = vi.spyOn(console, 'warn')
      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Lesson file not found'),
      )
    })

    it('throws error when MDX serialization fails', async () => {
      vi.clearAllMocks()
      vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('# Failing Content')
      vi.spyOn(console, 'log').mockImplementation(() => {})
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const { serialize } = await import('next-mdx-remote-client/serialize')
      vi.mocked(serialize).mockRejectedValue(new Error('Serialization failed'))

      const { syncContent } = await import('./sync-content')

      // Phase 1 fails → no transaction is called → error propagates
      await expect(syncContent()).rejects.toThrow('MDX serialization failed')
    })
  })

  describe('Phase 2: Transactional Persistence', () => {
    it('persists all content within a single transaction', async () => {
      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      const courseUpsert = vi.fn().mockResolvedValue({ id: 'course-id' })
      const sectionUpsert = vi.fn().mockResolvedValue({ id: 'section-id' })
      const lessonUpsert = vi.fn().mockResolvedValue({ id: 'lesson-id' })
      const problemUpsert = vi.fn().mockResolvedValue({ id: 'problem-id' })

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: courseUpsert },
          section: { upsert: sectionUpsert },
          lesson: { upsert: lessonUpsert },
          problem: { upsert: problemUpsert },
        }
        return fn(tx)
      })

      await syncContent()

      // Verify transaction was called with timeout
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 30000 },
      )

      // Verify upserts were called within the transaction
      expect(courseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-course' },
        }),
      )
      expect(sectionUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-section' },
        }),
      )
      expect(lessonUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-lesson' },
        }),
      )
      expect(problemUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'test-problem' },
        }),
      )
    })

    it('does not persist any data if transaction fails', async () => {
      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.$transaction).mockRejectedValue(
        new Error('Transaction failed'),
      )

      await expect(syncContent()).rejects.toThrow('Transaction failed')
    })

    it('tracks progress during sync', async () => {
      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      const consoleSpy = vi.spyOn(console, 'log')
      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Preparing content: 1 lessons to serialize'),
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        '🎉 Content sync completed!',
      )
    })
  })

  describe('Error Handling', () => {
    it('handles JSON parse errors gracefully', async () => {
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('_lessons.json')) {
          return 'invalid json {'
        }
        return '# Test Content'
      })

      const { syncContent } = await import('./sync-content')
      const prisma = (await import('@/lib/prisma')).default

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => {
        const tx = {
          course: { upsert: vi.fn().mockResolvedValue({ id: 'course-id' }) },
          section: { upsert: vi.fn().mockResolvedValue({ id: 'section-id' }) },
          lesson: { upsert: vi.fn().mockResolvedValue({ id: 'lesson-id' }) },
          problem: { upsert: vi.fn().mockResolvedValue({ id: 'problem-id' }) },
        }
        return fn(tx)
      })

      // JSON parse errors are handled gracefully (returns empty lessons)
      await expect(syncContent()).resolves.toBeUndefined()
    })
  })
})
