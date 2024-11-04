import { getSectionBySlug } from '@/services/lesson'
import { getUserWithSubscriptions } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Section from './page'

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

describe('Section component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders dynamic Page component when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getSectionBySlug).mockResolvedValue({
      id: 'section1',
      title: 'Test Section',
      problems: [],
    } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Section({ params: { sectionSlug: 'test-section' } }))

    expect(screen.getByText('Mocked Dynamic Component')).toBeDefined()
  })

  it('renders notFound when section is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getSectionBySlug).mockResolvedValue(null)

    await Section({ params: { sectionSlug: 'non-existent-section' } })

    expect(notFoundMock).toHaveBeenCalled()
  })
})
