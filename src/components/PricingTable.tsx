'use client'

import { createCheckout } from '@/actions/createCheckout'
import { useAuthStore } from '@/contexts/auth'
import { ProductWithCoupon, UserWithSubscriptionsAndProgress } from '@/types'
import { CustomError, handleError } from '@/utils/error'
import { calculateDiscountedPrice, formatPrice } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { SubscriptionStatus } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import Stripe from 'stripe'

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
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-screen-xl lg:px-6">
        <div className="space-y-8 sm:gap-6 lg:grid lg:grid-cols-3 lg:space-y-0 xl:gap-10">
          {sortedProducts.map((product) => {
            const price = product.default_price as Stripe.Price
            const features = product.marketing_features
            const originalPrice = (price.unit_amount ?? 0) / 100
            const coupon = product?.default_price?.appliedCoupon
            const discountedPrice = coupon
              ? calculateDiscountedPrice(originalPrice, coupon)
              : originalPrice

            return (
              <div
                key={product.id}
                className="mx-auto flex max-w-lg flex-col justify-between rounded-lg border border-zinc-400 bg-white p-6 text-center text-zinc-900 shadow xl:p-8 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              >
                <div>
                  <h3 className="mb-4 text-2xl font-semibold">
                    {product.name}
                  </h3>
                  <p className="font-light text-zinc-600 sm:text-lg dark:text-zinc-400">
                    {product.description}
                  </p>
                  <div className="my-8 flex flex-col items-center justify-center">
                    <div className="flex items-start">
                      {coupon && (
                        <span className="mr-2 text-2xl text-zinc-500 line-through dark:text-zinc-400">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                      <span className="text-5xl font-extrabold">
                        {formatPrice(discountedPrice)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {price.recurring
                          ? `/${price.recurring.interval}`
                          : 'one-time'}
                      </span>
                      {coupon && (
                        <span className="ml-2 text-sm font-extrabold text-lime-600 dark:text-lime-400">
                          {coupon.percentOff
                            ? `(${coupon.percentOff}% off)`
                            : coupon.amountOff
                              ? `(${coupon.amountOff / 100} off)`
                              : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <ul role="list" className="mb-8 space-y-4 text-left">
                    {features?.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <svg
                          className="h-5 w-5 flex-shrink-0 text-lime-500 dark:text-lime-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
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
                      className="rounded-lg bg-lime-600 px-5 py-2.5 text-center text-sm font-medium text-white enabled:hover:bg-lime-700 enabled:focus:ring-4 enabled:focus:ring-lime-200 disabled:opacity-50 dark:text-white enabled:dark:focus:ring-lime-900"
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
                      className="rounded-lg bg-lime-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-lime-700 focus:ring-4 focus:ring-lime-200 dark:text-white dark:focus:ring-lime-900"
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
