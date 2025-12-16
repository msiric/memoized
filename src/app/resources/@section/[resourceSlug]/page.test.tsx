import { getResourceBySlug } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Resource from './page'

vi.mock('next-auth')
vi.mock('@/services/resource')
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Mocked PreserializedMdxRenderer</div>,
}))

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
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(await Resource({ params: { resourceSlug: 'test-resource' } }))

    expect(screen.getByText(/Test Resource is Premium/)).toBeDefined()
    expect(
      screen.getByText(/Upgrade to access this content/),
    ).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it('renders PreserializedMdxRenderer component when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'resource1',
      title: 'Test Resource',
      access: 'premium',
      serializedBody: { compiledSource: 'mock content' },
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Resource({ params: { resourceSlug: 'test-resource' } }))

    expect(screen.getByText('Mocked PreserializedMdxRenderer')).toBeDefined()
  })

  it('renders notFound when resource is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getResourceBySlug).mockResolvedValue(null)

    await Resource({ params: { resourceSlug: 'non-existent-resource' } })

    expect(notFoundMock).toHaveBeenCalled()
  })
})
