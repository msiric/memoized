import { getResourceBySlug, getResourceMetadataBySlug } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Resource, { generateMetadata } from './page'

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
  permanentRedirect: vi.fn(),
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
      slug: 'test-resource',
      description: 'Public reference description',
      serializedBody: { compiledSource: 'PRIVATE_REFERENCE_BODY' },
      access: 'PREMIUM',
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(await Resource({ params: { resourceSlug: 'test-resource' } }))

    expect(screen.getByRole('heading', { level: 1, name: 'Test Resource' })).toBeDefined()
    expect(screen.getByText('Public reference description')).toBeDefined()
    expect(document.body.textContent).not.toContain('PRIVATE_REFERENCE_BODY')
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it('uses a resource-specific canonical and excludes a paid stub from indexing', async () => {
    vi.mocked(getResourceMetadataBySlug).mockResolvedValue({
      title: 'Promises', description: 'Promise reference', slug: 'promise-internals', access: 'PREMIUM',
    })
    const meta = await generateMetadata({ params: { resourceSlug: 'promise-internals' } })
    expect(meta?.alternates?.canonical).toMatch(/\/resources\/promise-internals$/)
    expect(meta?.robots).toEqual({ index: false, follow: true })
    expect(getResourceBySlug).not.toHaveBeenCalled()
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
