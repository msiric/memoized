import { getCourseBySlug } from '@/services/course'
import { render, screen, cleanup } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Course from './page'

vi.mock('next-auth')
vi.mock('@/services/course')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Mocked MDX Renderer</div>,
}))

const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

describe('Course component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders MDX content for authenticated users - course intros are always free', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getCourseBySlug).mockResolvedValue({
      id: 'course1',
      title: 'Test Course',
      description: 'Test Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(await Course({ params: { courseSlug: 'js-track' } }))

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders MDX content for unauthenticated users - course intros are free', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getCourseBySlug).mockResolvedValue({
      id: 'course1',
      title: 'Course Title',
      description: 'Course Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(await Course({ params: { courseSlug: 'any-course' } }))

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders notFound when course is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getCourseBySlug).mockResolvedValue(null)

    await Course({ params: { courseSlug: 'non-existent' } })

    expect(notFoundMock).toHaveBeenCalled()
  })

  it('passes userId to PreserializedMdxRenderer when user is authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getCourseBySlug).mockResolvedValue({
      id: 'course1',
      title: 'Test Course',
      description: 'Test Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(await Course({ params: { courseSlug: 'test-course' } }))

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })
})
