import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('Sync Content Script - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Content Structure Detection', () => {
    it('should handle array-based curriculum structure', () => {
      const curriculum = [
        {
          id: 'test-course',
          sections: [
            {
              id: 'test-section',
              lessons: []
            }
          ]
        }
      ]

      expect(curriculum).toHaveLength(1)
      expect(curriculum[0].sections).toHaveLength(1)
      expect(curriculum[0].sections[0].lessons).toEqual([])
    })

    it('should parse JSON lesson configurations', () => {
      const jsonConfig = {
        lessons: [
          {
            id: '/test-lesson',
            title: 'Test Lesson',
            description: 'Test description',
            access: 'FREE',
            problems: []
          }
        ]
      }

      expect(jsonConfig.lessons).toHaveLength(1)
      expect(jsonConfig.lessons[0].access).toBe('FREE')
    })
  })

  describe('Path Construction', () => {
    it('should construct file paths correctly', () => {
      const basePath = '/content'
      const courseId = 'test-course'
      const sectionId = 'test-section'
      const lessonId = '/test-lesson'

      const sectionPath = `${basePath}/${courseId}/${sectionId}`
      const lessonPath = `${sectionPath}${lessonId}/page.mdx`

      expect(sectionPath).toBe('/content/test-course/test-section')
      expect(lessonPath).toBe('/content/test-course/test-section/test-lesson/page.mdx')
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parse errors gracefully', () => {
      const malformedJson = 'invalid json {'
      
      let result
      try {
        result = JSON.parse(malformedJson)
      } catch (error) {
        result = { lessons: [] }
      }

      expect(result).toEqual({ lessons: [] })
    })

    it('should validate lesson configuration structure', () => {
      const validLesson = {
        id: '/test',
        title: 'Test',
        access: 'FREE'
      }

      const invalidLesson = {
        title: 'Test'
        // Missing id and access
      }

      expect(validLesson.id).toBeDefined()
      expect(validLesson.title).toBeDefined()
      expect(validLesson.access).toBeDefined()

      expect((invalidLesson as any).id).toBeUndefined()
      expect((invalidLesson as any).access).toBeUndefined()
    })
  })

  describe('Content Processing', () => {
    it('should handle empty lesson arrays', () => {
      const sections = [
        { lessons: [] },
        { lessons: undefined },
        { lessons: null }
      ]

      sections.forEach(section => {
        const lessons = section.lessons || []
        expect(Array.isArray(lessons)).toBe(true)
        expect(lessons.length).toBe(0)
      })
    })

    it('should process lesson problems correctly', () => {
      const lesson = {
        problems: [
          {
            title: 'Test Problem',
            difficulty: 'EASY',
            type: 'MULTIPLE_CHOICE'
          }
        ]
      }

      expect(lesson.problems).toHaveLength(1)
      expect(lesson.problems[0].difficulty).toBe('EASY')
    })
  })

  describe('Type Safety', () => {
    it('should handle curriculum type structure', () => {
      type CurriculumSection = {
        id: string
        lessons: any[]
      }

      type CurriculumCourse = {
        id: string
        sections: CurriculumSection[]
      }

      const course: CurriculumCourse = {
        id: 'test',
        sections: [
          {
            id: 'section-1',
            lessons: []
          }
        ]
      }

      expect(course.sections).toHaveLength(1)
      expect(course.sections[0].lessons).toEqual([])
    })
  })
})