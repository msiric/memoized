import { getLessonBySlug } from '@/services/lesson'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Lesson from './page'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/lesson')
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Mocked MDX Renderer</div>,
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
      serializedBody: { compiledSource: 'mock content' },
      access: 'premium',
      problems: [],
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

    expect(screen.getByText(/Test Lesson is Premium/)).toBeDefined()
    expect(
      screen.getByText(/Upgrade to access this content/),
    ).toBeDefined()
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

    expect(screen.getByText('Mocked MDX Renderer')).toBeDefined()
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
