import { Logo } from '@/components/Logo'
import { PricingTable } from '@/components/PricingTable'
import { STRIPE_PRICE_IDS } from '@/constants'
import { stripe } from '@/lib/stripe'
import {
  UserWithSubscriptionsAndProgress,
  getUserWithSubscriptions,
} from '@/services/user'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import Stripe from 'stripe'
import { authOptions } from '../api/auth/[...nextauth]/route'

export default async function Premium() {
  const session = await getServerSession(authOptions)

  const user = await getUserWithSubscriptions(session?.userId ?? '', false)

  const prices = await Promise.all(
    STRIPE_PRICE_IDS.map((id) =>
      stripe.prices.retrieve(id, { expand: ['product'] }),
    ),
  )

  const plainPrices = prices.map((price) => ({
    ...price,
    product: { ...(price.product as Stripe.Product) },
  }))

  return (
    <section className="bg-white dark:bg-zinc-900">
      <div className="mx-6 mt-4 flex flex-col items-center justify-between gap-4 xs:flex-row">
        <div>
          <Link href="/" aria-label="Home">
            <Logo className="h-6" />
          </Link>
        </div>
        <div className="flex gap-8">
          <Link
            href="/course"
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Course
          </Link>
          <Link
            href="/problems"
            className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            Problems
          </Link>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-screen-xl px-4 py-4 xs:py-8 md:py-16 lg:px-6">
        <div className="mx-auto mb-8 max-w-screen-md text-center lg:mb-12">
          <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900 xs:text-3xl md:text-4xl dark:text-white">
            The ultimate JavaScript platform for mastering coding interviews.
          </h2>
          <p className="mb-5 font-light text-zinc-500 sm:text-xl dark:text-zinc-400">
            Invest in your future, enhance your skills and land your dream job
            with confidence
          </p>
        </div>
        <PricingTable
          prices={plainPrices}
          user={user as UserWithSubscriptionsAndProgress | null}
        />
      </div>
    </section>
  )
}
