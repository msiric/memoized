import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSectionsByCoursePath, getSectionsByLessonSlug } from './section'
import prisma from '@/lib/prisma'

vi.mock('@/lib/prisma', () => ({
  default: {
    lesson: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

const mockPrisma = prisma as any

describe('Section Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('extractSectionsFromCompiledSource', () => {
    it('should extract sections from valid compiled source', async () => {
      const mockCompiledSource = `
        const sections = [{"title":"Introduction","id":"introduction"},{"title":"Getting Started","id":"getting-started"}];
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([
        { title: 'Introduction', id: 'introduction' },
        { title: 'Getting Started', id: 'getting-started' }
      ])
    })

    it('should return empty array when no sections pattern found', async () => {
      const mockCompiledSource = `
        const otherStuff = "some code";
        function someFunction() {
          return "no sections here";
        }
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([])
    })

    it('should handle malformed sections gracefully', async () => {
      const mockCompiledSource = `
        const sections = [{
          title: "Introduction",
          "id": "introduction"
        }, {
          title: "Getting Started",
          // missing closing quote
          id: "getting-started
        }];
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      // Should return empty array on JSON parse error
      expect(result).toEqual([])
    })

    it('should handle empty sections array', async () => {
      const mockCompiledSource = `
        const sections = [];
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([])
    })

    it('should handle sections with special characters in titles', async () => {
      const mockCompiledSource = `
        const sections = [{"title":"What's New in ES6?","id":"whats-new-in-es6"},{"title":"Arrays & Objects: The Basics","id":"arrays-objects-basics"},{"title":"Functions (Advanced)","id":"functions-advanced"}];
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([
        { title: "What's New in ES6?", id: 'whats-new-in-es6' },
        { title: 'Arrays & Objects: The Basics', id: 'arrays-objects-basics' },
        { title: 'Functions (Advanced)', id: 'functions-advanced' }
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
            compiledSource: `const sections = [{"title":"Intro","id":"intro"}];`
          }
        },
        {
          id: '2', 
          slug: 'lesson-2',
          section: { slug: 'section-1' },
          serializedBody: {
            compiledSource: `const sections = [{"title":"Advanced","id":"advanced"}];`
          }
        },
        {
          id: '3',
          slug: 'lesson-3', 
          section: { slug: 'section-2' },
          serializedBody: {
            compiledSource: `const sections = [];`
          }
        }
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': [{ title: 'Intro', id: 'intro' }],
        '/section-1/lesson-2': [{ title: 'Advanced', id: 'advanced' }],
        '/section-2/lesson-3': []
      })
    })

    it('should handle lessons without serializedBody', async () => {
      const mockLessons = [
        {
          id: '1',
          slug: 'lesson-1',
          section: { slug: 'section-1' },
          serializedBody: null
        },
        {
          id: '2',
          slug: 'lesson-2', 
          section: { slug: 'section-1' },
          serializedBody: {
            compiledSource: `const sections = [{"title":"Valid","id":"valid"}];`
          }
        }
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': [],
        '/section-1/lesson-2': [{ title: 'Valid', id: 'valid' }]
      })
    })

    it('should handle lessons without compiledSource', async () => {
      const mockLessons = [
        {
          id: '1',
          slug: 'lesson-1',
          section: { slug: 'section-1' },
          serializedBody: {
            otherField: 'some data'
          }
        }
      ]

      mockPrisma.lesson.findMany.mockResolvedValueOnce(mockLessons)

      const result = await getSectionsByCoursePath('test-course')

      expect(result).toEqual({
        '/section-1/lesson-1': []
      })
    })

    it('should handle empty course', async () => {
      mockPrisma.lesson.findMany.mockResolvedValueOnce([])

      const result = await getSectionsByCoursePath('empty-course')

      expect(result).toEqual({})
    })
  })

  describe('getSectionsByLessonSlug', () => {
    it('should return sections for a specific lesson', async () => {
      const mockLesson = {
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: `const sections = [{"title":"Test Section","id":"test-section"}];`
        }
      }

      mockPrisma.lesson.findUnique.mockResolvedValueOnce(mockLesson)

      const result = await getSectionsByLessonSlug('test-lesson')

      expect(result).toEqual([{ title: 'Test Section', id: 'test-section' }])
    })

    it('should return empty array when lesson not found', async () => {
      mockPrisma.lesson.findUnique.mockResolvedValueOnce(null)

      const result = await getSectionsByLessonSlug('non-existent-lesson')

      expect(result).toEqual([])
    })

    it('should return empty array when lesson has no serializedBody', async () => {
      const mockLesson = {
        id: '1',
        slug: 'test-lesson',
        serializedBody: null
      }

      mockPrisma.lesson.findUnique.mockResolvedValueOnce(mockLesson)

      const result = await getSectionsByLessonSlug('test-lesson')

      expect(result).toEqual([])
    })

    it('should return empty array when lesson has no compiledSource', async () => {
      const mockLesson = {
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          otherField: 'some data'
        }
      }

      mockPrisma.lesson.findUnique.mockResolvedValueOnce(mockLesson)

      const result = await getSectionsByLessonSlug('test-lesson')

      expect(result).toEqual([])
    })
  })

  describe('Edge Cases and Security', () => {
    it('should handle very large sections arrays', async () => {
      // Generate a large sections array in JSON format
      const largeSections = Array.from({ length: 100 }, (_, i) => 
        `{"title":"Section ${i}","id":"section-${i}"}`
      ).join(',')
      
      const mockCompiledSource = `const sections = [${largeSections}];`
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toHaveLength(100)
      expect(result[0]).toEqual({ title: 'Section 0', id: 'section-0' })
      expect(result[99]).toEqual({ title: 'Section 99', id: 'section-99' })
    })

    it('should not execute arbitrary code (security test)', async () => {
      const mockCompiledSource = `
        const sections = []; 
        console.log("This should not execute"); 
        process.exit(1);
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      // This should not throw or cause side effects
      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([])
    })

    it('should handle nested objects and arrays in sections', async () => {
      const mockCompiledSource = `
        const sections = [{"title":"Complex Section","id":"complex-section","metadata":{"difficulty":"advanced","tags":["react","hooks"]}}];
      `
      
      mockPrisma.lesson.findUnique.mockResolvedValueOnce({
        id: '1',
        slug: 'test-lesson',
        serializedBody: {
          compiledSource: mockCompiledSource
        }
      })

      const result = await getSectionsByLessonSlug('test-lesson')
      
      expect(result).toEqual([{
        title: 'Complex Section',
        id: 'complex-section',
        metadata: {
          difficulty: 'advanced',
          tags: ['react', 'hooks']
        }
      }])
    })
  })
})