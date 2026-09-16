import { getLessonBySlug, getLessonMetadataBySlug } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { cleanup, render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Lesson, { generateMetadata } from './page'
import * as lessonRoute from './page'
import type { ReactNode } from 'react'
import { G3B_CARD_ORDER, G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { getSearchCatalog } from '@/services/search'
import { Footer } from '@/components/Footer'
import { renderToStaticMarkup } from 'react-dom/server'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/lesson')
vi.mock('@/services/search', () => ({ getSearchCatalog: vi.fn() }))
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: ({ serializedContent, header }: { serializedContent: { compiledSource: string }; header?: ReactNode }) => <article>{header}<div>Mocked MDX Renderer {serializedContent.compiledSource}</div></article>,
}))
vi.mock('@/components/ProblemCard', () => ({
  ProblemCard: ({ problem }: { problem: { question: string } }) => <div>{problem.question}</div>,
}))
vi.mock('@/hooks/usePages', () => ({
  usePages: () => ({
    isLesson: true, currentPage: { access: 'PREMIUM' },
    previousPage: { title: 'Palindromic Subsequence', href: '/courses/dsa-track/common-techniques/palindromic-subsequence' },
    nextPage: { title: 'Recursion and Memoization', href: '/courses/dsa-track/common-techniques/recursion-and-memoization' },
  }),
}))

// Mock next/navigation
const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

describe('Lesson component', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getSearchCatalog).mockResolvedValue({ courses: [], resources: [], posts: [] })
  })

  it.each([false, true])('renders one server-owned neighbor block without the footer duplicate (access=%s)', async hasAccess => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(userHasAccess).mockReturnValue(hasAccess)
    const titles = ['Palindromic Subsequence', 'Longest Common Substring', 'Recursion and Memoization']
    const slugs = ['palindromic-subsequence', 'longest-common-substring', 'recursion-and-memoization']
    vi.mocked(getSearchCatalog).mockResolvedValue({
      resources: [], posts: [],
      courses: [{
        slug: 'dsa-track', title: 'DSA Track', description: '',
        sections: [{
          slug: 'common-techniques', title: 'Common Techniques', description: '',
          lessons: slugs.map((slug, index) => ({ slug, title: titles[index], description: '', access: 'PREMIUM' })),
        }],
      }],
    })
    vi.mocked(getLessonBySlug).mockResolvedValue({
      id: 'g3b-lesson', contentId: G3B_LESSON_CONTENT_ID, title: titles[1], description: '',
      serializedBody: { compiledSource: 'PREMIUM_SECRET_CONTENT' }, access: 'PREMIUM', problems: [],
      section: { slug: 'common-techniques', course: { slug: 'dsa-track' } },
    })
    const page = await Lesson({ params: {
      courseSlug: 'dsa-track', sectionSlug: 'common-techniques', lessonSlug: 'longest-common-substring',
    } })
    const serverHtml = renderToStaticMarkup(page)
    expect(serverHtml).toContain('aria-label="Previous: Palindromic Subsequence"')
    expect(serverHtml).toContain('aria-label="Next: Recursion and Memoization"')
    render(<>{page}<Footer width="prose" /></>)

    expect(screen.getAllByRole('navigation', { name: 'Lesson navigation' })).toHaveLength(1)
    expect(screen.queryByRole('navigation', { name: 'Page navigation' })).not.toBeInTheDocument()
    expect(screen.queryByText('Continue in this section')).not.toBeInTheDocument()
    expect(screen.getAllByText(titles[0])).toHaveLength(1)
    expect(screen.getAllByText(titles[2])).toHaveLength(1)
    expect(screen.getByRole('link', { name: `Previous: ${titles[0]}` })).toHaveAttribute('href', `/courses/dsa-track/common-techniques/${slugs[0]}`)
    expect(screen.getByRole('link', { name: `Next: ${titles[2]}` })).toHaveAttribute('href', `/courses/dsa-track/common-techniques/${slugs[2]}`)
    expect(document.body.textContent?.includes('PREMIUM_SECRET_CONTENT')).toBe(hasAccess)
  })

  it('declares request-time rendering without build-time lesson enumeration', () => {
    expect(lessonRoute.dynamic).toBe('force-dynamic')
    expect(lessonRoute).not.toHaveProperty('generateStaticParams')
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
    expect(screen.getByRole('heading', { level: 1, name: 'Test Lesson' }).nextElementSibling)
      .toBe(screen.getByText('Public lesson introduction'))
    expect(screen.getByText('A free practice question')).toBeDefined()
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).closest('article')).not.toBeNull()
    expect(document.body.textContent).not.toContain('PREMIUM_SECRET_CONTENT')
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it.each([3, 4])('gates the free primary entry on the active %i-question G3B snapshot', async count => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(userHasAccess).mockReturnValue(false)
    vi.mocked(getLessonBySlug).mockResolvedValue({
      id: 'g3b-lesson',
      contentId: G3B_LESSON_CONTENT_ID,
      title: 'Longest Common Substring',
      description: 'The public lesson introduction',
      serializedBody: { compiledSource: 'PREMIUM_SECRET_CONTENT' },
      access: 'PREMIUM',
      section: { slug: 'common-techniques', course: { slug: 'dsa-track' } },
      problems: G3B_CARD_ORDER.slice(0, count).map((contentId, index) => ({
        id: `problem-${index}`, contentId, title: index === 3 ? G3B_TASK.title : `Existing task ${index}`,
        href: index === 3 ? '' : 'https://leetcode.com/problems/example',
        link: '/courses/dsa-track/common-techniques/longest-common-substring',
        slug: `problem-${index}`, difficulty: 'MEDIUM', type: 'CODING',
        question: index === 3 ? G3B_TASK.question : 'Existing free question',
        serializedQuestion: null, serializedAnswer: { compiledSource: 'free answer' },
        createdAt: new Date(0), updatedAt: new Date(0), lessonId: 'g3b-lesson',
      })),
    })
    render(await Lesson({ params: {
      courseSlug: 'dsa-track', sectionSlug: 'common-techniques', lessonSlug: 'longest-common-substring',
    } }))

    const title = screen.getByRole('heading', { level: 1, name: 'Longest Common Substring' })
    const entry = screen.queryByRole('link', { name: G3B_TASK.title })
    if (count === 3) {
      expect(entry).not.toBeInTheDocument()
      expect(title.nextElementSibling).toBe(screen.getByText('The public lesson introduction'))
    } else {
      expect(entry).toHaveAttribute('href', `#${G3B_TASK.id}`)
      expect(title.nextElementSibling).toContainElement(entry)
      expect(screen.getByText(/Prefix, subsequence and edit distance are optional comparisons/)).toBeInTheDocument()
    }
    expect(document.body.textContent).not.toContain('PREMIUM_SECRET_CONTENT')
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
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).closest('article')).not.toBeNull()
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
