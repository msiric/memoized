'use client'

import { createCheckout } from '@/actions/createCheckout'
import { useAuthStore } from '@/contexts/auth'
import { ProductWithCoupon, UserWithSubscriptionsAndProgress } from '@/types'
import { CustomError, handleError } from '@/lib/error-tracking'
import { calculateDiscountedPrice, formatPrice } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { SubscriptionStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import Stripe from 'stripe'
import { CheckIcon } from './icons'
import { SPACING } from '@/constants/designTokens'

export type PricingTableProps = {
  products: ProductWithCoupon[]
  user: UserWithSubscriptionsAndProgress | null
}

export const PricingTable = ({ products, user }: PricingTableProps) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [productIdLoading, setProductIdLoading] = useState<string>()

  const openModal = useAuthStore((state) => state.openModal)

  const hasActiveSubscription =
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE

  const currentActiveSubscription = user?.customer?.subscriptions[0]

  const sortedProducts = products.sort(
    (a, b) =>
      (a.default_price?.unit_amount ?? 0) - (b.default_price?.unit_amount ?? 0),
  )

  const handleStripeCheckout = async (product: ProductWithCoupon) => {
    try {
      setProductIdLoading(product.id)

      if (!session?.userId) {
        setProductIdLoading(undefined)
        openModal()
      }

      const response = await createCheckout(product)
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)

      const { sessionUrl } = response as unknown as {
        sessionUrl: string
      }

      if (!sessionUrl) {
        setProductIdLoading(undefined)
        return
      }

      router.push(sessionUrl)

      setProductIdLoading(undefined)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    }
  }

  return (
    <section>
      <div className="mx-auto max-w-xl lg:max-w-screen-xl">
        <div className="space-y-8 gap-8 lg:grid lg:grid-cols-3 lg:space-y-0">
          {sortedProducts.map((product, index) => {
            const price = product.default_price as Stripe.Price
            const features = product.marketing_features
            const originalPrice = (price.unit_amount ?? 0) / 100
            const coupon = product?.default_price?.appliedCoupon
            const discountedPrice = coupon
              ? calculateDiscountedPrice(originalPrice, coupon)
              : originalPrice
            
            const isPopular = index === 1

            return (
              <div
                key={product.id}
                className={`relative flex flex-col justify-between rounded-2xl sm:rounded-3xl bg-white py-6 px-4 sm:p-6 xl:p-8 text-center text-zinc-900 shadow-sm dark:bg-zinc-800/50 dark:text-white ${
                  isPopular
                    ? 'ring-2 ring-lime-500 dark:ring-lime-400'
                    : 'ring-1 ring-zinc-200/50 dark:ring-zinc-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-lime-500 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <h3 className={`${SPACING.headingMargin.h3} text-2xl sm:text-2xl lg:text-3xl font-semibold`}>
                    {product.name}
                  </h3>
                  <p className="text-sm sm:text-base font-light text-zinc-600 dark:text-zinc-400">
                    {product.description}
                  </p>
                  <div className="my-6 sm:my-8 flex flex-col items-center justify-center">
                    <div className="flex items-start">
                      {coupon && (
                        <span className="mr-2 text-lg sm:text-xl lg:text-2xl text-zinc-500 line-through dark:text-zinc-400">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold">
                        {formatPrice(discountedPrice)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
                        {price.recurring
                          ? `/${price.recurring.interval}`
                          : 'one-time'}
                      </span>
                      {coupon && (
                        <span className="ml-2 text-xs sm:text-sm font-extrabold text-lime-600 dark:text-lime-400">
                          {coupon.percentOff
                            ? `(${coupon.percentOff}% off)`
                            : coupon.amountOff
                              ? `(${coupon.amountOff / 100} off)`
                              : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul role="list" className="mb-6 sm:mb-8 space-y-3 sm:space-y-4 text-left">
                    {features?.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                        <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-lime-500 dark:text-lime-400" />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {session ? (
                    <button
                      onClick={() => handleStripeCheckout(product)}
                      disabled={
                        hasActiveSubscription || productIdLoading === product.id
                      }
                      className="w-full rounded-lg bg-lime-600 px-4 py-2 sm:px-5 sm:py-2.5 text-center text-xs sm:text-sm font-medium text-white enabled:hover:bg-lime-700 enabled:focus:ring-4 enabled:focus:ring-lime-200 disabled:opacity-50 dark:text-white enabled:dark:focus:ring-lime-900"
                    >
                      {hasActiveSubscription
                        ? currentActiveSubscription?.priceId === price.id
                          ? price.type === 'one_time'
                            ? 'Purchased'
                            : 'Subscribed'
                          : price.type === 'one_time'
                            ? 'Purchase'
                            : 'Subscribe'
                        : productIdLoading === product.id
                          ? 'Processing...'
                          : price.type === 'one_time'
                            ? 'Purchase'
                            : 'Subscribe'}
                    </button>
                  ) : (
                    <button
                      onClick={() => openModal()}
                      className="w-full rounded-lg bg-lime-600 px-4 py-2 sm:px-5 sm:py-2.5 text-center text-xs sm:text-sm font-medium text-white hover:bg-lime-700 focus:ring-4 focus:ring-lime-200 dark:text-white dark:focus:ring-lime-900"
                    >
                      {price.type === 'one_time'
                        ? 'Log in to purchase'
                        : 'Log in to subscribe'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
