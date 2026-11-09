import { getActiveCoupons, getActiveProducts } from '@/services/stripe'
import { ProductWithCoupon } from '@/types'
import Stripe from 'stripe'

// A coupon is a public sale only when it is explicitly marked in Stripe with
// metadata public=true. Unmarked coupons (one person, a partner, testing) are
// never advertised or applied automatically.
export const isPublicCoupon = (coupon: Stripe.Coupon) =>
  coupon.valid && coupon.metadata?.public === 'true'

// Prices and discounts always come from Stripe on the server. The browser only
// says which price it wants; it never supplies amounts or coupon ids.
export async function getPricingCatalog(): Promise<ProductWithCoupon[]> {
  const [coupons, products] = await Promise.all([
    getActiveCoupons(),
    getActiveProducts(),
  ])

  return products.map((product) => {
    const price = product.default_price as Stripe.Price
    const appliedCoupon = coupons.find(
      (coupon) =>
        isPublicCoupon(coupon) && coupon.applies_to?.products?.includes(product.id),
    )

    return {
      ...product,
      default_price: {
        ...price,
        appliedCoupon: appliedCoupon
          ? {
              id: appliedCoupon.id,
              name: appliedCoupon.name ?? '',
              percentOff: appliedCoupon.percent_off,
              amountOff: appliedCoupon.amount_off,
              redeemBy: appliedCoupon.redeem_by,
            }
          : null,
      },
    } as ProductWithCoupon
  })
}

// Only the active default price of an active product can be bought, with the
// coupon the server itself would show for it.
export async function resolveCheckoutProduct(
  priceId: unknown,
): Promise<ProductWithCoupon | null> {
  if (typeof priceId !== 'string' || !/^price_[A-Za-z0-9]{1,64}$/.test(priceId))
    return null
  const catalog = await getPricingCatalog()
  return (
    catalog.find(
      (product) =>
        product.active &&
        product.default_price?.id === priceId &&
        product.default_price.active,
    ) ?? null
  )
}
