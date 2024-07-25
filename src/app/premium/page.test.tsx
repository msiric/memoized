import { getActiveBanners } from '@/services/banner'
import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { getUserWithSubscriptions } from '@/services/user'
import { act, cleanup, render, screen } from '@testing-library/react'
import { getServerSession } from 'next-auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Premium from './page'

// Mock the imported modules and components
vi.mock('next-auth')
vi.mock('@/services/user')
vi.mock('@/services/banner')
vi.mock('@/services/stripe')
vi.mock('@/components/Footer', () => ({
  Footer: () => <div data-testid="footer">Mocked Footer</div>,
}))
vi.mock('@/components/MinimalHeader', () => ({
  MinimalHeader: () => (
    <div data-testid="minimal-header">Mocked Minimal Header</div>
  ),
}))
vi.mock('@/components/PricingTable', () => ({
  PricingTable: ({ products, user }: { products: any[]; user: any }) => (
    <div data-testid="pricing-table">
      Mocked PricingTable (Products: {products.length}, User:{' '}
      {user ? 'Logged In' : 'Not Logged In'})
    </div>
  ),
}))
vi.mock('@/components/TopBanner', () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <div data-testid="top-banner">
      Mocked TopBanner: {title} - {message}
    </div>
  ),
}))

describe('Premium component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getActiveBanners).mockResolvedValue([])
    vi.mocked(getActiveCoupons).mockResolvedValue([])
    vi.mocked(getActiveProducts).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the component with correct elements when user is not logged in', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('minimal-header')).toBeDefined()
    expect(screen.getByTestId('pricing-table')).toBeDefined()
    expect(screen.getByTestId('footer')).toBeDefined()

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toContain(
      'The ultimate JavaScript platform for mastering coding interviews',
    )
  })

  it('renders the component with correct elements when user is logged in', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ userId: 'user123' } as any)
    vi.mocked(getUserWithSubscriptions).mockResolvedValue({
      id: 'user123',
    } as any)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    expect(screen.getByTestId('minimal-header')).toBeDefined()
    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
    expect(pricingTable.textContent).toContain('Logged In')
    expect(screen.getByTestId('footer')).toBeDefined()
  })

  it('fetches and passes correct products to PricingTable', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
      { id: 'prod_2', name: 'Product 2', default_price: { id: 'price_2' } },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable.textContent).toContain('Products: 2')
  })

  it('applies coupons to products when available', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getActiveProducts).mockResolvedValue([
      { id: 'prod_1', name: 'Product 1', default_price: { id: 'price_1' } },
    ] as any)
    vi.mocked(getActiveCoupons).mockResolvedValue([
      {
        id: 'coupon_1',
        name: 'Test Coupon',
        percent_off: 10,
        applies_to: { products: ['prod_1'] },
      },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    const pricingTable = screen.getByTestId('pricing-table')
    expect(pricingTable).toBeDefined()
  })

  it('renders TopBanner when active banners are available', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    vi.mocked(getActiveBanners).mockResolvedValue([
      {
        id: 'banner_1',
        title: 'Test Banner',
        message: 'Banner Message',
        type: 'info',
      },
    ] as any)

    await act(async () => {
      render(await Premium())
    })

    const topBanner = screen.getByTestId('top-banner')
    expect(topBanner).toBeDefined()
    expect(topBanner.textContent).toContain('Test Banner - Banner Message')
  })
})
