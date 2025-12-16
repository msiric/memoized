import { getResourceBySlug } from '@/services/resource'
import { getUserWithSubscriptionDetails } from '@/services/user'
import { userHasAccess } from '@/utils/helpers'
import { render, screen, cleanup } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import Resources from './page'

vi.mock('next-auth')
vi.mock('@/services/resource')
vi.mock('@/services/user')
vi.mock('@/utils/helpers')
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Mocked MDX Renderer</div>,
}))
vi.mock('@/components/PremiumCTA', () => ({
  PremiumCTA: ({ heading }: { heading: string }) => (
    <div>
      <h1>Unlock Your Full Potential</h1>
      <p>Get access to {heading} and all the other content</p>
      <a href="/premium" role="link">
        Upgrade to Premium
      </a>
    </div>
  ),
}))

const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

describe('Resources intro page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders PremiumCTA when user does not have access to premium resource', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'intro',
      title: 'Intro Resource',
      description: 'Intro description',
      body: 'Intro content',
      serializedBody: { compiledSource: 'mock content' },
      access: 'PREMIUM',
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(false)

    render(await Resources())

    expect(screen.getByText(/Unlock Your Full Potential/)).toBeDefined()
    expect(
      screen.getByText(
        /Get access to Intro Resource and all the other content/,
      ),
    ).toBeDefined()
    expect(
      screen.getByRole('link', { name: 'Upgrade to Premium' }),
    ).toBeDefined()
  })

  it('renders MDX content when user has access', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'intro',
      title: 'Intro Resource',
      description: 'Intro description',
      body: 'Intro content',
      serializedBody: { compiledSource: 'mock content' },
      access: 'FREE',
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Resources())

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders MDX content for free resources without authentication', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'intro',
      title: 'Intro Resource',
      description: 'Intro description',
      body: 'Intro content',
      serializedBody: { compiledSource: 'mock content' },
      access: 'FREE',
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Resources())

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
  })

  it('renders notFound when resource is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getResourceBySlug).mockResolvedValue(null)

    await Resources()

    expect(notFoundMock).toHaveBeenCalled()
  })

  it('handles premium access check with valid subscription', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getResourceBySlug).mockResolvedValue({
      id: 'intro',
      title: 'Premium Resource',
      description: 'Premium description',
      body: 'Premium content',
      serializedBody: { compiledSource: 'mock content' },
      access: 'PREMIUM',
    } as any)
    vi.mocked(getUserWithSubscriptionDetails).mockResolvedValue({
      id: 'user123',
      customer: {
        subscriptions: [{ status: 'ACTIVE' }],
      },
    } as any)
    vi.mocked(userHasAccess).mockReturnValue(true)

    render(await Resources())

    expect(screen.getAllByText('Mocked MDX Renderer')).toHaveLength(1)
    expect(screen.queryByText('Unlock Your Full Potential')).toBeNull()
  })
})
