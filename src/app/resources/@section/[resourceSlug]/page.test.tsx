import { getResourceBySlug } from '@/services/resource'
import { getUserWithSubscriptions } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Resource from './page'

// Mock the imported modules
vi.mock('next-auth')
vi.mock('@/services/resource')
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

describe('Resource component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders PremiumCTA when user does not have access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'resource1',
      title: 'Test Resource',
      access: 'premium',
    } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(await Resource({ params: { resourceSlug: 'test-resource' } }))

    expect(screen.getByText(/Unlock Your Full Potential/)).toBeDefined()
    expect(
      screen.getByText(/Get access to Test Resource and all the other content/),
    ).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it('renders dynamic Page component when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'resource1',
      title: 'Test Resource',
      access: 'premium',
    } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Resource({ params: { resourceSlug: 'test-resource' } }))

    expect(screen.getByText('Mocked Dynamic Component')).toBeDefined()
  })

  it('renders notFound when resource is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getResourceBySlug).mockResolvedValue(null)

    await Resource({ params: { resourceSlug: 'non-existent-resource' } })

    expect(notFoundMock).toHaveBeenCalled()
  })
})
