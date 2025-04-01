import { IoMdCheckmarkCircleOutline } from 'react-icons/io'
import { Button } from './Button'

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
        <div className="mx-auto flex h-full max-w-screen-md flex-col justify-center text-center">
          <h2 className="mb-6 text-3xl font-extrabold leading-tight tracking-tight text-gray-900 lg:mb-8 dark:text-white">
            Unlock Your Full Potential 🚀
          </h2>
          <p className="mb-6 font-light text-gray-600 md:text-lg dark:text-gray-400">
            {`Get access to ${heading} and all the other content on the platform by upgrading`}
          </p>

          <div className="mx-auto mb-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start">
                <IoMdCheckmarkCircleOutline className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-lime-600" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <Button
            href="/premium"
            className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 mx-auto w-full max-w-sm transform rounded-lg px-5 py-3 text-base font-medium text-white transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-4"
            aria-label="Upgrade to Premium"
          >
            Upgrade now
          </Button>
        </div>
      </div>
    </section>
  )
}
