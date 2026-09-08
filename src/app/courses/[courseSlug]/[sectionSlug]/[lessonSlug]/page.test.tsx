import { getLessonBySlug, getLessonMetadataBySlug } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Lesson, { generateMetadata } from './page'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/lesson')
vi.mock('@/services/search', () => ({ getSearchCatalog: async () => ({ courses: [], resources: [], posts: [] }) }))
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: ({ serializedContent }: { serializedContent: { compiledSource: string } }) => <div>Mocked MDX Renderer {serializedContent.compiledSource}</div>,
}))
vi.mock('@/components/ProblemCard', () => ({
  ProblemCard: ({ problem }: { problem: { question: string } }) => <div>{problem.question}</div>,
}))

// Mock next/navigation
const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

describe('Lesson component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders PremiumCTA when user does not have access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getLessonBySlug).mockResolvedValue({
      id: 'lesson1',
      title: 'Test Lesson',
      serializedBody: { compiledSource: 'PREMIUM_SECRET_CONTENT' },
      description: 'Public lesson introduction',
      access: 'PREMIUM',
      problems: [{ id: 'free-problem', question: 'A free practice question' }],
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(
      await Lesson({
        params: {
          lessonSlug: 'test-lesson',
          sectionSlug: 'test-section',
          courseSlug: 'test-course',
        },
      }),
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Test Lesson' })).toBeDefined()
    expect(screen.getByText('Public lesson introduction')).toBeDefined()
    expect(screen.getByText('A free practice question')).toBeDefined()
    expect(document.body.textContent).not.toContain('PREMIUM_SECRET_CONTENT')
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it('renders dynamic Page component when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getLessonBySlug).mockResolvedValue({
      id: 'lesson1',
      title: 'Test Lesson',
      serializedBody: { compiledSource: 'mock content' },
      access: 'premium',
      problems: [],
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(
      await Lesson({
        params: {
          lessonSlug: 'test-lesson',
          sectionSlug: 'test-section',
          courseSlug: 'test-course',
        },
      }),
    )

    expect(screen.getByText(/Mocked MDX Renderer/)).toBeDefined()
  })

  describe('generateMetadata', () => {
    it('should return lesson title from focused metadata query', async () => {
      vi.mocked(getLessonMetadataBySlug).mockResolvedValue({
        title: 'Variables',
        description: 'Learn about variable declarations',
      })

      const metadata = await generateMetadata({
        params: {
          lessonSlug: 'variables',
          sectionSlug: 'test-section',
          courseSlug: 'test-course',
        },
      })

      expect(metadata.title).toEqual({ absolute: 'Variables — JavaScript Interview Practice | Memoized' })
      expect(getLessonMetadataBySlug).toHaveBeenCalledWith(
        'test-course',
        'test-section',
        'variables',
      )
      expect(getLessonBySlug).not.toHaveBeenCalled()
    })

    it('should signal notFound rather than publish fallback metadata', async () => {
      vi.mocked(getLessonMetadataBySlug).mockResolvedValue(null)

      const metadata = await generateMetadata({
        params: {
          lessonSlug: 'nonexistent',
          sectionSlug: 'test-section',
          courseSlug: 'test-course',
        },
      })

      expect(metadata).toBeUndefined()
      expect(notFoundMock).toHaveBeenCalled()
    })
  })

  it('renders notFound when lesson is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getLessonBySlug).mockResolvedValue(null)

    await Lesson({
      params: {
        lessonSlug: 'non-existent-lesson',
        sectionSlug: 'test-section',
        courseSlug: 'test-course',
      },
    })

    expect(notFoundMock).toHaveBeenCalled()
  })
})
