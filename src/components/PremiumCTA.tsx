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
    <section className="h-full bg-white dark:bg-zinc-900">
      <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
        <div className="mx-auto flex h-full max-w-screen-md flex-col items-center justify-center text-center">
          {/* Lock icon */}
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <HiLockClosed className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
          </div>

          <h2 className="mb-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            {heading ? `${heading} is Premium` : 'Unlock Your Full Potential'}
          </h2>
          <p className="mb-6 max-w-md text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
            Upgrade to access this content and everything else on the platform with flexible plans
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
