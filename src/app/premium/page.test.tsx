import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { getUserWithSubscriptions } from '@/services/user'
import { act, cleanup, render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Premium from './page'

// Mock the imported modules and components
vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/stripe')
vi.mock('@/components/Footer', () => ({
  Footer: () => <div data-testid="footer">Mocked Footer</div>,
}))
vi.mock('@/components/Header', () => ({
  Header: ({ fullWidth, withAuth, withSearch, withSubheader }: any) => (
    <div data-testid="header">
      Mocked Header (fullWidth: {String(fullWidth)}, withAuth:{' '}
      {String(withAuth)}, withSearch: {String(withSearch)}, withSubheader:{' '}
      {String(withSubheader)})
    </div>
  ),
}))
vi.mock('@/components/PricingTable', () => ({
  PricingTable: ({ products, user }: { products: any[]; user: any }) => (
    <div data-testid="pricing-table">
      Mocked PricingTable (Products: {products.length}, User:{' '}
      {user ? 'Logged In' : 'Not Logged In'}, First Product Coupon:{' '}
      {products[0]?.default_price?.appliedCoupon
        ? `${products[0].default_price.appliedCoupon.percentOff}% off`
        : 'No Coupon'}
      )
    </div>
  ),
}))

describe('Premium page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getActiveCoupons).mockResolvedValue([])
    vi.mocked(getActiveProducts).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the page with correct elements when user is not logged in', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('header')).toBeDefined()
    expect(screen.getByTestId('header').textContent).toContain(
      'fullWidth: true',
    )
    expect(screen.getByTestId('header').textContent).toContain(
      'withAuth: false',
    )
    expect(screen.getByTestId('header').textContent).toContain(
      'withSearch: false',
    )
    expect(screen.getByTestId('header').textContent).toContain(
      'withSubheader: true',
    )

    expect(screen.getByTestId('pricing-table')).toBeDefined()
    expect(screen.getByTestId('footer')).toBeDefined()

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toBe(
      'The ultimate JavaScript platform for mastering coding interviews',
    )

    const description = screen.getByText(/Invest in your future/i)
    expect(description).toBeDefined()
  })

  it('renders the page with correct elements when user is logged in', async () => {
    const mockUser = { id: 'user123', subscriptions: [] }
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue(mockUser as any)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('header')).toBeDefined()
    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
    expect(pricingTable.textContent).toContain('Logged In')
    expect(screen.getByTestId('footer')).toBeDefined()
  })

  it('correctly applies coupons to products', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const mockProducts = [
      {
        id: 'prod_1',
        name: 'Product 1',
        default_price: { id: 'price_1' } as Stripe.Price,
      },
    ]

    const mockCoupons = [
      {
        id: 'coupon_1',
        name: 'Test Coupon',
        valid: true,
        percent_off: 10,
        amount_off: null,
        applies_to: { products: ['prod_1'] },
      },
    ]

    vi.mocked(getActiveProducts).mockResolvedValue(mockProducts as any)
    vi.mocked(getActiveCoupons).mockResolvedValue(mockCoupons as any)

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
    expect(pricingTable.textContent).toContain('10% off')
  })

  it('handles multiple products and coupons correctly', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const mockProducts = [
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
      { id: 'prod_2', name: 'Product 2', default_price: { id: 'price_2' } },
    ]

    vi.mocked(getActiveProducts).mockResolvedValue(mockProducts as any)

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable.textContent).toContain('Products: 2')
  })
})
