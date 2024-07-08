'use client'

import { Session } from 'next-auth'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Stripe from 'stripe'

export type PricingTableProps = {
  prices: (Stripe.Price & { product: Stripe.Product })[]
  session: Session | null
}

export const PricingTable = ({ prices, session }: PricingTableProps) => {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async (priceId: string) => {
    setLoading(true)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId, userId: session?.userId ?? '' }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoading(false)
      }
    } catch (error) {
      setLoading(false)
      console.error('Error creating checkout session:', error)
      alert('Error creating checkout session')
    }
  }

  return (
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-screen-xl lg:px-6">
        <div className="space-y-8 sm:gap-6 lg:grid lg:grid-cols-3 lg:space-y-0 xl:gap-10">
          {prices.map((price) => (
            <div
              key={price.id}
              className="mx-auto flex max-w-lg flex-col rounded-lg border border-zinc-100 bg-white p-6 text-center text-zinc-900 shadow xl:p-8 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
            >
              <h3 className="mb-4 text-2xl font-semibold">
                {price.product.name}
              </h3>
              <p className="font-light text-zinc-500 sm:text-lg dark:text-zinc-400">
                {price.product.description}
              </p>
              <div className="my-8 flex items-baseline justify-center">
                <span className="mr-2 text-5xl font-extrabold">
                  €{(price.unit_amount ?? 0) / 100}
                </span>
                <span className="text-zinc-500 dark:text-zinc-400">
                  {price.recurring
                    ? `/${price.recurring.interval}`
                    : 'one-time'}
                </span>
              </div>
              <ul role="list" className="mb-8 space-y-4 text-left">
                {price.product.marketing_features?.map((feature, index) => (
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
              {session ? (
                <button
                  onClick={() => handleSubscribe(price.id)}
                  disabled={loading}
                  className="rounded-lg bg-lime-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-lime-700 focus:ring-4 focus:ring-lime-200 dark:text-white dark:focus:ring-lime-900"
                >
                  {loading
                    ? 'Processing...'
                    : price.type === 'one_time'
                      ? 'Purchase'
                      : 'Subscribe'}
                </button>
              ) : (
                <button
                  onClick={() => signIn()}
                  className="rounded-lg bg-lime-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-lime-700 focus:ring-4 focus:ring-lime-200 dark:text-white dark:focus:ring-lime-900"
                >
                  Log in to Subscribe
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
