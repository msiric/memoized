import { HiCheck, HiLockClosed, HiSparkles } from 'react-icons/hi2'
import Link from 'next/link'
import { PREMIUM_PREFIX } from '../constants'

export type PremiumCTAProps = {
  heading?: string
}

export const PremiumCTA = ({ heading }: PremiumCTAProps) => {
  const benefits = [
    'All course tracks & premium content',
    'From basics to advanced masterclasses',
    'Built for JS/TS developers like you',
    'Real-world tips & common pitfalls',
  ]

  return (
    <section className="my-8 rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-screen-md flex-col items-center text-center">
          {/* Lock icon */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <HiLockClosed className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>

          <h2 className="mb-3 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            {heading ? `Explore the full ${heading} material` : 'Continue with Premium'}
          </h2>
          <p className="mb-6 max-w-md text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Premium includes the complete lessons and implementation references. Free practice questions remain available without a subscription.
          </p>

          <div className="mx-auto mb-8 grid grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <HiCheck className="h-4 w-4 flex-shrink-0 text-lime-600 dark:text-lime-500" />
                <span className="text-xs text-zinc-700 sm:text-sm dark:text-zinc-300">
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <Link
            href={PREMIUM_PREFIX}
            data-umami-event="upgrade_clicked"
            data-umami-event-source="premium_preview"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            aria-label="Upgrade to Premium"
          >
            <HiSparkles className="h-4 w-4" />
            Upgrade to Premium
          </Link>
        </div>
      </div>
    </section>
  )
}
