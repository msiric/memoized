import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getSectionsByCoursePath,
  extractSectionsFromCompiledSource,
} from './section'
import prisma from '@/lib/prisma'

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn) => fn),
}))

vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: {
      findMany: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as any

describe('Section Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractSectionsFromCompiledSource', () => {
    it('should extract sections from valid compiled source', () => {
      const compiledSource = `
        const sections = [{"title":"Introduction","id":"introduction"},{"title":"Getting Started","id":"getting-started"}];
      `

      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([
        { title: 'Introduction', id: 'introduction' },
        { title: 'Getting Started', id: 'getting-started' },
      ])
    })

    it('should return empty array when no sections pattern found', () => {
      const compiledSource = `
        const otherStuff = "some code";
        function someFunction() {
          return "no sections here";
        }
      `

      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([])
    })

    it('should handle malformed sections gracefully', () => {
      const compiledSource = `
        const sections = [{
          title: "Introduction",
          "id": "introduction"
        }, {
          title: "Getting Started",
          // missing closing quote
          id: "getting-started
        }];
      `

      // Should return empty array on JSON parse error
      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([])
    })

    it('should handle empty sections array', () => {
      expect(extractSectionsFromCompiledSource(`const sections = [];`)).toEqual(
        [],
      )
    })

    it('should handle sections with special characters in titles', () => {
      const compiledSource = `
        const sections = [{"title":"What's New in ES6?","id":"whats-new-in-es6"},{"title":"Arrays & Objects: The Basics","id":"arrays-objects-basics"},{"title":"Functions (Advanced)","id":"functions-advanced"}];
      `

      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([
        { title: "What's New in ES6?", id: 'whats-new-in-es6' },
        { title: 'Arrays & Objects: The Basics', id: 'arrays-objects-basics' },
        { title: 'Functions (Advanced)', id: 'functions-advanced' },
      ])
    })
  })

  describe('getSectionsByCoursePath', () => {
    it('should return sections mapping for all lessons in a course', async () => {
      const mockLessons = [
        {
          id: '1',
          slug: 'lesson-1',
          section: { slug: 'section-1' },
          serializedBody: {
            compiledSource: `const sections = [{"title":"Intro","id":"intro"}];`,
          },
        },
        {
          id: '2',
          slug: 'lesson-2',
          section: { slug: 'section-1' },
          serializedBody: {
            compiledSource: `const sections = [{"title":"Advanced","id":"advanced"}];`,
          },
        },
        {
          id: '3',
          slug: 'lesson-3',
          section: { slug: 'section-2' },
          serializedBody: {
            compiledSource: `const sections = [];`,
          },
        },
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': [{ title: 'Intro', id: 'intro' }],
        '/section-1/lesson-2': [{ title: 'Advanced', id: 'advanced' }],
        '/section-2/lesson-3': [],
      })
    })

    it('should handle lessons without serializedBody', async () => {
      const mockLessons = [
        {
          id: '1',
          slug: 'lesson-1',
          section: { slug: 'section-1' },
          serializedBody: null,
        },
        {
          id: '2',
          slug: 'lesson-2',
          section: { slug: 'section-1' },
          serializedBody: {
            compiledSource: `const sections = [{"title":"Valid","id":"valid"}];`,
          },
        },
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': [],
        '/section-1/lesson-2': [{ title: 'Valid', id: 'valid' }],
      })
    })

    it('should handle lessons without compiledSource', async () => {
      const mockLessons = [
        {
          id: '1',
          slug: 'lesson-1',
          section: { slug: 'section-1' },
          serializedBody: {
            otherField: 'some data',
          },
        },
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': [],
      })
    })

    it('should handle empty course', async () => {
      mockPrisma.lesson.findMany.mockResolvedValueOnce([])

      const result = await getSectionsByCoursePath('empty-course')

      expect(result).toEqual({})
    })
  })

  describe('extractSectionsFromCompiledSource - edge cases and security', () => {
    it('should handle very large sections arrays', () => {
      const largeSections = Array.from(
        { length: 100 },
        (_, i) => `{"title":"Section ${i}","id":"section-${i}"}`,
      ).join(',')

      const result = extractSectionsFromCompiledSource(
        `const sections = [${largeSections}];`,
      )

      expect(result).toHaveLength(100)
      expect(result[0]).toEqual({ title: 'Section 0', id: 'section-0' })
      expect(result[99]).toEqual({ title: 'Section 99', id: 'section-99' })
    })

    it('should not execute arbitrary code (security test)', () => {
      const compiledSource = `
        const sections = [];
        console.log("This should not execute");
        process.exit(1);
      `

      // The sections array is parsed as JSON, never executed — no side effects.
      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([])
    })

    it('should handle nested objects and arrays in sections', () => {
      const compiledSource = `
        const sections = [{"title":"Complex Section","id":"complex-section","metadata":{"difficulty":"advanced","tags":["react","hooks"]}}];
      `

      expect(extractSectionsFromCompiledSource(compiledSource)).toEqual([
        {
          title: 'Complex Section',
          id: 'complex-section',
          metadata: {
            difficulty: 'advanced',
            tags: ['react', 'hooks'],
          },
        },
      ])
    })
  })
})
