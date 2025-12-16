import { getSectionBySlug } from '@/services/lesson'
import { render, screen, cleanup } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Section from './page'

vi.mock('next-auth')
vi.mock('@/services/lesson')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Mocked MDX Renderer</div>,
}))

const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

describe('Section component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders MDX content for any user - section intros are always free', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getSectionBySlug).mockResolvedValue({
      id: 'section1',
      title: 'Test Section',
      description: 'Test Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(
      await Section({
        params: { sectionSlug: 'test-section', courseSlug: 'test-course' },
      }),
    )

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders MDX content for unauthenticated users - section intros are free', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getSectionBySlug).mockResolvedValue({
      id: 'section1',
      title: 'Test Section',
      description: 'Test Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(
      await Section({
        params: { sectionSlug: 'test-section', courseSlug: 'test-course' },
      }),
    )

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders notFound when section is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getSectionBySlug).mockResolvedValue(null)

    await Section({
      params: {
        sectionSlug: 'non-existent-section',
        courseSlug: 'test-course',
      },
    })

    expect(notFoundMock).toHaveBeenCalled()
  })

  it('passes session userId to PreserializedMdxRenderer when authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getSectionBySlug).mockResolvedValue({
      id: 'section1',
      title: 'Test Section',
      description: 'Test Description',
      serializedBody: { compiledSource: 'mock content' },
    } as any)

    render(
      await Section({
        params: { sectionSlug: 'test-section', courseSlug: 'test-course' },
      }),
    )

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })
})
