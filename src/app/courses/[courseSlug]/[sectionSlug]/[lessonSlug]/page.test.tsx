import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { getLessonBySlug } from '@/services/lesson'
import { getUserWithSubscriptions } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import Lesson from './page'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/lesson')
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('next/dynamic', () => ({
  default: () => {
    const DynamicComponent = () => <div>Mocked Dynamic Component</div>
    DynamicComponent.displayName = 'DynamicComponent'
    return DynamicComponent
  },
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
      access: 'premium',
      problems: [],
    } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(await Lesson({ params: { lessonSlug: 'test-lesson' } }))

    expect(screen.getByText('Upgrade to Premium')).toBeDefined()
    expect(
      screen.getByText(
        /Unlock access to Test Lesson and all the other content/,
      ),
    ).toBeDefined()
    expect(screen.getByRole('link', { name: 'Upgrade' })).toBeDefined()
  })

  it('renders dynamic Page component when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getLessonBySlug).mockResolvedValue({
      id: 'lesson1',
      title: 'Test Lesson',
      access: 'premium',
      problems: [],
    } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Lesson({ params: { lessonSlug: 'test-lesson' } }))

    expect(screen.getByText('Mocked Dynamic Component')).toBeDefined()
  })

  it('renders notFound when lesson is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getLessonBySlug).mockResolvedValue(null)

    await Lesson({ params: { lessonSlug: 'non-existent-lesson' } })

    expect(notFoundMock).toHaveBeenCalled()
  })
})
