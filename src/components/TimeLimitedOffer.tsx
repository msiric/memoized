import type { ProductWithCoupon } from '@/types'
import { Badge } from './Badge'
import { CountdownTimer } from './CountdownTimer'
import { SPACING } from '@/constants/designTokens'

interface AppliedCoupon {
  id: string
  name?: string
  percentOff?: number
  amountOff?: number
  redeemBy?: number
}

interface TimeLimitedOfferProps {
  products: ProductWithCoupon[]
}

export const TimeLimitedOffer = ({ products }: TimeLimitedOfferProps) => {
  const findActiveCoupon = () => {
    for (const product of products) {
      const price = product.default_price
      if (price?.appliedCoupon) {
        const discount = price.appliedCoupon as AppliedCoupon
        const couponName = discount.name || 'Special Offer'

        let expiresAt: Date | null = null
        if (discount.redeemBy) {
          expiresAt = new Date(discount.redeemBy * 1000)
        }

        if (expiresAt && expiresAt > new Date()) {
          const discountText = discount.percentOff
            ? `${discount.percentOff}%`
            : `$${(discount.amountOff || 0) / 100}`

          return {
            name: couponName,
            expiresAt: expiresAt.getTime(),
            discount: discountText,
          }
        }
      }
    }
    return null
  }

  const validCoupon = findActiveCoupon()

  if (!validCoupon) {
    return null
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-zinc-50 to-white p-4 sm:p-6 lg:p-8 text-center ring-1 ring-zinc-200/50 dark:from-zinc-800/50 dark:to-zinc-900/50 dark:ring-zinc-700">
      <Badge variant="lime" animated className="mb-3 sm:mb-4">
        Limited Time Offer
      </Badge>
      
      <h2 className={`${SPACING.headingMargin.h2} text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white`}>
        Save{' '}
        <span className="bg-gradient-to-r from-lime-600 to-indigo-600 bg-clip-text text-transparent dark:from-lime-400 dark:to-indigo-400">
          {validCoupon.discount}
        </span>
        {' '}with <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-amber-500">
          {validCoupon.name}
        </span>
        {' '}discount
      </h2>
      
      <p className="mx-auto mb-4 sm:mb-6 max-w-2xl text-sm sm:text-base lg:text-lg text-zinc-600 dark:text-zinc-400">
        Choose the plan that works best for you. <br className="hidden sm:block"/>All plans include full access to courses and problems.
      </p>
      
      <CountdownTimer expiresAt={validCoupon.expiresAt} />
    </div>
  )
}
