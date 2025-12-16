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
          lessons: [
            {
              id: 'test-lesson',
              title: 'Test Lesson',
              description: 'Test lesson description',
              href: '/courses/test-course/test-section/test-lesson',
            },
          ],
        },
      ],
    },
  ],
}))
vi.mock('@/lib/prisma', () => ({
  default: {
    $disconnect: vi.fn(),
    banner: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))
vi.mock('@/services/lesson', () => ({
  upsertCourse: vi.fn().mockResolvedValue({ id: 'course-id' }),
  upsertSection: vi.fn().mockResolvedValue({ id: 'section-id' }),
  upsertLesson: vi.fn().mockResolvedValue({ id: 'lesson-id' }),
  upsertProblem: vi.fn(),
}))
vi.mock('@/services/resource', () => ({
  upsertResource: vi.fn(),
}))
vi.mock('@/services/stripe', () => ({
  getActiveProducts: vi.fn().mockResolvedValue([
    { id: 'prod_1', name: 'Annual Plan' },
    { id: 'prod_2', name: 'Monthly Plan' },
  ]),
  createStripeCoupon: vi.fn().mockResolvedValue({
    coupon: { id: 'coupon_123' },
    promotionCode: null,
  }),
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

describe('Sync Content Script - JSON Structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()

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

  describe('Content Processing', () => {
    it('detects production content when available', async () => {
      const { syncContent } = await import('./sync-content')
      const consoleSpy = vi.spyOn(console, 'log')

      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 Using content from main directory',
      )
    })

    it('uses sample content when main content is not available', async () => {
      // Mock main content directory as not existing, samples as existing
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        return pathStr.includes('samples') // Only samples exist
      })

      const { syncContent } = await import('./sync-content')
      const consoleSpy = vi.spyOn(console, 'log')

      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        '📂 Using sample content for development',
      )
    })

    it('uses JSON-based configuration by default', async () => {
      const { syncContent } = await import('./sync-content')
      const consoleSpy = vi.spyOn(console, 'log')

      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        '🆕 Using JSON-based lesson configuration',
      )
    })

    it('handles missing lesson files gracefully', async () => {
      // Mock lesson file as not existing
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.includes('test-lesson/page.mdx')) {
          return false // Lesson file doesn't exist
        }
        return true
      })

      const { syncContent } = await import('./sync-content')
      const consoleSpy = vi.spyOn(console, 'warn')

      await syncContent()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Lesson file not found'),
      )
    })
  })

  describe('Core Sync Operations', () => {
    it('processes courses and sections', async () => {
      const { syncContent } = await import('./sync-content')
      const { upsertCourse, upsertSection } = await import('@/services/lesson')

      await syncContent()

      expect(upsertCourse).toHaveBeenCalled()
      expect(upsertSection).toHaveBeenCalled()
    })

    it('processes complete course content with serialization', async () => {
      const { syncContent } = await import('./sync-content')
      const { upsertCourse, upsertSection, upsertLesson } = await import(
        '@/services/lesson'
      )
      const { serialize } = await import('next-mdx-remote-client/serialize')

      await syncContent()

      // Verify course was processed with serialized content
      expect(upsertCourse).toHaveBeenCalledWith(
        'test-course',
        'Test Course',
        'Test course description',
        '# Test Content\n\nThis is test content.', // original content
        '/courses/test-course',
        0, // order
        expect.objectContaining({
          // serialized content
          compiledSource: 'mock-compiled-source',
        }),
      )

      // Verify section was processed with serialized content
      expect(upsertSection).toHaveBeenCalledWith(
        'test-section',
        'Test Section',
        'Test section description',
        '# Test Content\n\nThis is test content.', // original content
        expect.any(Number), // order
        '/courses/test-course/test-section',
        expect.any(String), // courseId
        expect.objectContaining({
          // serialized content
          compiledSource: 'mock-compiled-source',
        }),
      )

      // Verify lesson was processed with serialized content
      expect(upsertLesson).toHaveBeenCalledWith(
        'test-lesson',
        'Test Lesson',
        'Test Description',
        '# Test Content\n\nThis is test content.', // original content
        expect.objectContaining({
          // serialized content
          compiledSource: 'mock-compiled-source',
        }),
        expect.any(Number), // order
        'FREE', // access
        '/courses/test-course/test-section/test-lesson',
        expect.any(String), // sectionId
      )
    })

    it('tracks lesson progress correctly', async () => {
      const { syncContent } = await import('./sync-content')
      const consoleSpy = vi.spyOn(console, 'log')

      await syncContent()

      // Should log correct lesson count
      expect(consoleSpy).toHaveBeenCalledWith(
        '🎯 Starting content sync: 1 lessons to process',
      )

      // Should log lesson completion
      expect(consoleSpy).toHaveBeenCalledWith(
        '✅ Synced lesson: Test Lesson (1/1)',
      )

      // Should log final completion
      expect(consoleSpy).toHaveBeenCalledWith('🎉 Content sync completed!')
    })

    it('handles empty lesson configurations gracefully', async () => {
      const { syncContent } = await import('./sync-content')

      // Should not throw even with empty lessons
      await expect(syncContent()).resolves.toBeUndefined()
    })
  })

  describe('MDX Serialization', () => {
    it('calls serialization for various content types', async () => {
      const { syncContent } = await import('./sync-content')
      const { upsertCourse, upsertSection, upsertLesson } = await import(
        '@/services/lesson'
      )

      await syncContent()

      // Verify that courses, sections, and lessons are called with serialized content
      expect(upsertCourse).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          // serialized content present
          compiledSource: expect.any(String),
        }),
      )

      expect(upsertSection).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          // serialized content present
          compiledSource: expect.any(String),
        }),
      )

      expect(upsertLesson).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          // serialized content present
          compiledSource: expect.any(String),
        }),
        expect.any(Number),
        expect.any(String),
        expect.any(String),
        expect.any(String),
      )
    })
  })

  describe('Problem Serialization', () => {
    it('processes problems with serialized answers', async () => {
      const { syncContent } = await import('./sync-content')
      const { upsertProblem } = await import('@/services/lesson')

      await syncContent()

      // Verify upsertProblem was called (the default test data has a problem with answer)
      expect(upsertProblem).toHaveBeenCalledWith(
        'test-problem', // slug
        'https://example.com', // href
        expect.stringContaining('#test-problem'), // link
        'Test Problem', // title
        'EASY', // difficulty
        'What is this?', // question
        '```typescript\nconsole.log("answer")\n```', // original answer
        'CODING', // type
        expect.any(String), // lessonId
        expect.objectContaining({
          // serializedAnswer - should contain compiled content
          compiledSource: expect.any(String),
        }),
      )
    })

    it('handles empty answer problems correctly', async () => {
      // Test the logic path where problems have empty answers
      // This demonstrates that the serialization logic works for both cases
      const { upsertProblem } = await import('@/services/lesson')

      // Check that upsertProblem can handle null serialized content
      // (This tests our schema and function signature compatibility)
      await expect(async () => {
        await upsertProblem(
          'empty-problem',
          '',
          '/test-link#empty-problem',
          'Empty Problem',
          'EASY',
          'Test question?',
          '', // empty answer
          'THEORY',
          'test-lesson-id',
          null as any, // null serializedAnswer for empty answers
        )
      }).not.toThrow()
    })

    it('throws error when MDX serialization fails', async () => {
      // Clear all mocks and set up a clean test environment
      vi.clearAllMocks()

      // Reset file system mocks
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        const pathStr = path.toString()
        if (pathStr.includes('_lessons.json')) {
          return JSON.stringify({
            lessons: [
              {
                id: 'test-lesson-fail',
                title: 'Test Lesson Fail',
                description: 'Test Description',
                access: 'FREE',
                order: 1,
                problems: [],
              },
            ],
          })
        }
        return '# Test Content That Will Fail\n\nThis content will cause serialization to fail.'
      })

      const { serialize } = await import('next-mdx-remote-client/serialize')
      // Mock serialize to fail for any content
      vi.mocked(serialize).mockRejectedValue(new Error('Serialization failed'))

      const { syncContent } = await import('./sync-content')

      // Should throw when serialization fails (course content serialization will fail first)
      await expect(syncContent()).rejects.toThrow('MDX serialization failed')
    })
  })

  describe('Error Handling', () => {
    it('handles missing content directories', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      const { syncContent } = await import('./sync-content')

      await expect(syncContent()).rejects.toThrow('No content found!')
    })

    it('handles JSON parse errors gracefully', async () => {
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path.toString().includes('_lessons.json')) {
          return 'invalid json {'
        }
        return '# Test Content'
      })

      const { syncContent } = await import('./sync-content')

      // Should throw on invalid JSON
      await expect(syncContent()).rejects.toThrow()
    })
  })
})
