import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { getPricingCatalog, resolveCheckoutProduct } from './pricing'

vi.mock('@/services/stripe')

const product = (id: string, priceId: string, active = true, priceActive = true) => ({
  id,
  active,
  default_price: { id: priceId, active: priceActive, unit_amount: 1000 },
})

describe('server-side pricing', () => {
  beforeEach(() => {
    vi.mocked(getActiveProducts).mockResolvedValue([
      product('prod_monthly', 'price_monthly'),
      product('prod_yearly', 'price_yearly'),
      product('prod_old', 'price_old', true, false),
    ] as never)
    vi.mocked(getActiveCoupons).mockResolvedValue([
      { id: 'YEARLY20', name: 'Yearly', valid: true, percent_off: 20, amount_off: null, redeem_by: 9, applies_to: { products: ['prod_yearly'] } },
      { id: 'EXPIRED', name: 'Old', valid: false, percent_off: 90, amount_off: null, redeem_by: 1, applies_to: { products: ['prod_monthly'] } },
    ] as never)
  })

  it('applies only valid coupons that Stripe scopes to the product', async () => {
    const catalog = await getPricingCatalog()
    expect(catalog.find((p) => p.id === 'prod_yearly')?.default_price.appliedCoupon).toEqual({
      id: 'YEARLY20', name: 'Yearly', percentOff: 20, amountOff: null, redeemBy: 9,
    })
    expect(catalog.find((p) => p.id === 'prod_monthly')?.default_price.appliedCoupon).toBeNull()
  })

  it('resolves a known active price to the server product with the server coupon', async () => {
    const resolved = await resolveCheckoutProduct('price_yearly')
    expect(resolved?.id).toBe('prod_yearly')
    expect(resolved?.default_price.appliedCoupon?.id).toBe('YEARLY20')
  })

  it.each([
    ['an unknown price', 'price_other'],
    ['an inactive price', 'price_old'],
    ['a malformed id', 'price_x; drop'],
    ['an object', { id: 'price_yearly', appliedCoupon: { id: 'FRIENDS100' } }],
    ['nothing', undefined],
  ])('rejects %s', async (_label, input) => {
    expect(await resolveCheckoutProduct(input)).toBeNull()
  })
})
