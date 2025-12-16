import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PreserializedMdxRenderer } from './PreserializedMdxRenderer'

// Mock next-mdx-remote-client components and dependencies
vi.mock('next-mdx-remote-client/csr', () => ({
  hydrate: vi.fn(({ compiledSource, components }) => {
    // Mock hydrate function to test props passing
    if (components?.wrapper) {
      const MockWrapper = components.wrapper
      return {
        content: (
          <div data-testid="mdx-remote" data-compiled-source={compiledSource}>
            <MockWrapper>
              <p>Mock MDX Content</p>
            </MockWrapper>
          </div>
        ),
        mod: {},
        error: null,
      }
    }
    return {
      content: (
        <div data-testid="mdx-remote" data-compiled-source={compiledSource}>
          <p>Mock MDX Content (no wrapper)</p>
        </div>
      ),
      mod: {},
      error: null,
    }
  }),
}))

vi.mock('../../mdx-components', () => ({
  useMDXComponents: vi.fn(() => ({
    wrapper: vi.fn((props) => (
      <div data-testid="mock-wrapper" {...props}>
        <div data-testid="wrapper-content">{props.children}</div>
        <div data-testid="wrapper-lesson-id">{props.lessonId}</div>
        <div data-testid="wrapper-problems-count">{props.problems?.length || 0}</div>
        <div data-testid="wrapper-with-padding">{props.withPadding?.toString()}</div>
        <div data-testid="wrapper-show-next">{props.showNextPage?.toString()}</div>
        <div data-testid="wrapper-show-footer">{props.showFooter?.toString()}</div>
      </div>
    )),
    h1: vi.fn((props) => <h1 data-testid="custom-h1" {...props} />),
    p: vi.fn((props) => <p data-testid="custom-p" {...props} />),
  })),
}))

describe('PreserializedMdxRenderer', () => {
  // Create a mock that satisfies JsonValue type constraints for next-mdx-remote-client
  const mockSerializedContent = {
    compiledSource: 'mock-compiled-source',
    scope: {},
    frontmatter: {}
  } as any // Use any to satisfy the JsonValue constraint

  const mockProblem = { 
    id: 'problem-1', 
    title: 'Test Problem', 
    difficulty: 'EASY' as const,
    href: '/problem-1',
    link: '/lesson#problem-1',
    question: 'Test question',
    answer: 'Test answer',
    type: 'CODING' as const,
    slug: 'test-problem',
    lessonId: 'lesson-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    serializedAnswer: { compiledSource: 'mock serialized answer' }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Basic Rendering', () => {
    it('renders MDXRemote with serialized content', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      expect(screen.getByTestId('mdx-remote')).toBeInTheDocument()
      expect(screen.getByTestId('mdx-remote')).toHaveAttribute(
        'data-compiled-source', 
        'mock-compiled-source'
      )
    })

    it('handles null serialized content by throwing error', () => {
      expect(() => {
        render(
          <PreserializedMdxRenderer serializedContent={null} />
        )
      }).toThrow()
    })

    it('handles undefined serialized content by throwing error', () => {
      expect(() => {
        render(
          <PreserializedMdxRenderer serializedContent={undefined} />
        )
      }).toThrow()
    })
  })

  describe('Wrapper Component Props', () => {
    it('passes lessonId to wrapper component', () => {
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="test-lesson-123"
        />
      )

      expect(screen.getByTestId('wrapper-lesson-id')).toHaveTextContent('test-lesson-123')
    })

    it('passes problems array to wrapper component', () => {
      const problems = [mockProblem, { ...mockProblem, id: 'problem-2' }]
      
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          problems={problems}
        />
      )

      expect(screen.getByTestId('wrapper-problems-count')).toHaveTextContent('2')
    })

    it('uses default empty array for problems when not provided', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      expect(screen.getByTestId('wrapper-problems-count')).toHaveTextContent('0')
    })

    it('passes withPadding prop to wrapper component', () => {
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          withPadding={true}
        />
      )

      expect(screen.getByTestId('wrapper-with-padding')).toHaveTextContent('true')
    })

    it('uses default true for withPadding when not provided', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      expect(screen.getByTestId('wrapper-with-padding')).toHaveTextContent('true')
    })

    it('passes showNextPage prop to wrapper component', () => {
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          showNextPage={false}
        />
      )

      expect(screen.getByTestId('wrapper-show-next')).toHaveTextContent('false')
    })

    it('uses default true for showNextPage when not provided', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      expect(screen.getByTestId('wrapper-show-next')).toHaveTextContent('true')
    })

    it('passes showFooter prop to wrapper component', () => {
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          showFooter={false}
        />
      )

      expect(screen.getByTestId('wrapper-show-footer')).toHaveTextContent('false')
    })

    it('uses default true for showFooter when not provided', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      expect(screen.getByTestId('wrapper-show-footer')).toHaveTextContent('true')
    })
  })

  describe('All Props Combined', () => {
    it('passes all props correctly to wrapper component', () => {
      const problems = [mockProblem]
      
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="comprehensive-lesson"
          problems={problems}
          withPadding={true}
          showNextPage={true}
          showFooter={true}
        />
      )

      expect(screen.getByTestId('wrapper-lesson-id')).toHaveTextContent('comprehensive-lesson')
      expect(screen.getByTestId('wrapper-problems-count')).toHaveTextContent('1')
      expect(screen.getByTestId('wrapper-with-padding')).toHaveTextContent('true')
      expect(screen.getByTestId('wrapper-show-next')).toHaveTextContent('true')
      expect(screen.getByTestId('wrapper-show-footer')).toHaveTextContent('true')
    })
  })

  describe('MDX Components Integration', () => {
    it('integrates with MDX components system', () => {
      // Since we mocked useMDXComponents, we can verify it was called by checking render output
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      // The mock is set up, so if the component renders without error, integration works
      expect(screen.getByTestId('mdx-remote')).toBeInTheDocument()
    })

    it('passes custom components to MDXRemote', () => {
      render(
        <PreserializedMdxRenderer serializedContent={mockSerializedContent} />
      )

      // Verify that the mock wrapper component is rendered
      expect(screen.getByTestId('mock-wrapper')).toBeInTheDocument()
      expect(screen.getByTestId('wrapper-content')).toBeInTheDocument()
    })
  })

  describe('Performance and Memoization', () => {
    it('memoizes components properly', () => {
      const { rerender } = render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="lesson-1"
          problems={[]}
        />
      )

      // Rerender with same props
      rerender(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="lesson-1"
          problems={[]}
        />
      )

      // Component should still be rendered correctly
      expect(screen.getByTestId('mdx-remote')).toBeInTheDocument()
    })

    it('preserves initial props due to memoization', () => {
      const { rerender } = render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="lesson-1"
        />
      )

      expect(screen.getByTestId('wrapper-lesson-id')).toHaveTextContent('lesson-1')

      // Rerender with different lessonId - content should be memoized and NOT update
      rerender(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          lessonId="lesson-2"
        />
      )

      // Component preserves initial hydrated content for performance
      expect(screen.getByTestId('wrapper-lesson-id')).toHaveTextContent('lesson-1')
    })
  })

  describe('Edge Cases', () => {
    it('handles complex serialized content with scope and frontmatter', () => {
      const complexContent = {
        compiledSource: 'complex-source',
        scope: { customVar: 'test', count: 42 },
        frontmatter: { title: 'Test Lesson', author: 'Test Author' }
      } as any // Use any to satisfy the JsonValue constraint

      render(
        <PreserializedMdxRenderer serializedContent={complexContent} />
      )

      expect(screen.getByTestId('mdx-remote')).toHaveAttribute(
        'data-compiled-source', 
        'complex-source'
      )
    })

    it('handles large problems array', () => {
      const manyProblems = Array.from({ length: 50 }, (_, i) => ({
        ...mockProblem,
        id: `problem-${i}`,
        title: `Problem ${i}`
      }))

      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          problems={manyProblems}
        />
      )

      expect(screen.getByTestId('wrapper-problems-count')).toHaveTextContent('50')
    })

    it('handles missing optional lesson ID', () => {
      render(
        <PreserializedMdxRenderer 
          serializedContent={mockSerializedContent}
          problems={[mockProblem]}
        />
      )

      // Should still render without errors
      expect(screen.getByTestId('wrapper-problems-count')).toHaveTextContent('1')
    })
  })
})