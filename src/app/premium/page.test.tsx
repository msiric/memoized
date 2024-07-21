import React from 'react'
import { render, screen, cleanup, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getServerSession } from 'next-auth'
import { getUserWithSubscriptions } from '@/services/user'
import { stripe } from '@/lib/stripe'
import Premium from './page'
import { STRIPE_PRICE_IDS } from '@/constants'

// Mock the imported modules and components
vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/lib/stripe')
vi.mock('@/components/Logo', () => ({
  Logo: () => <div data-testid="logo">Mocked Logo</div>,
}))
vi.mock('@/components/PricingTable', () => ({
  PricingTable: ({ prices, user }: { prices: any[]; user: any }) => (
    <div data-testid="pricing-table">
      Mocked PricingTable (Prices: {prices.length}, User:{' '}
      {user ? 'Logged In' : 'Not Logged In'})
    </div>
  ),
}))
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}))

describe('Premium component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Mock the coupons list to return an empty array by default
    vi.mocked(stripe.coupons.list).mockResolvedValue({ data: [] } as any)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the component with correct elements when user is not logged in', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(stripe.prices.retrieve).mockResolvedValue({
      id: 'price_1',
      product: { name: 'Product 1' },
    } as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('logo')).toBeDefined()
    expect(screen.getAllByTestId('next-link')).toHaveLength(3) // Logo, Course, Problems links
    expect(screen.getByTestId('pricing-table')).toBeDefined()

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toContain(
      'The ultimate JavaScript platform for mastering coding interviews.',
    )
  })

  it('renders the component with correct elements when user is logged in', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(stripe.prices.retrieve).mockResolvedValue({
      id: 'price_1',
      product: { name: 'Product 1' },
    } as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('logo')).toBeDefined()
    expect(screen.getAllByTestId('next-link')).toHaveLength(3) // Logo, Course, Problems links
    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
    expect(pricingTable.textContent).toContain('Logged In')
  })

  it('fetches and passes correct prices to PricingTable', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(stripe.prices.retrieve).mockImplementation((id) =>
      Promise.resolve({ id, product: { name: `Product ${id}` } } as any),
    )

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable.textContent).toContain(
      `Prices: ${STRIPE_PRICE_IDS.length}`,
    )
  })

  it('applies coupons to prices when available', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(stripe.prices.retrieve).mockResolvedValue({
      id: 'price_1',
      product: { id: 'prod_1', name: 'Product 1' },
    } as any)
    vi.mocked(stripe.coupons.list).mockResolvedValue({
      data: [
        {
          id: 'coupon_1',
          percent_off: 10,
          applies_to: { products: ['prod_1'] },
        },
      ],
    } as any)

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
  })
})
