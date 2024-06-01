import { Button } from './Button'

export type PremiumCTAProps = {
  heading?: string
}

export const PremiumCTA = ({ heading }: PremiumCTAProps) => {
  return (
    <section className="h-full bg-white dark:bg-zinc-900">
      <div className="mx-auto h-full max-w-screen-xl px-4 py-8 sm:py-16 lg:px-6">
        <div className="align-center mx-auto flex h-full max-w-screen-sm flex-col justify-center text-center">
          <h2 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Upgrade to Premium
          </h2>
          <p className="mb-6 font-light text-gray-500 md:text-lg dark:text-gray-400">
            {`Unlock access to ${heading} and all the other content on the platform by upgrading to
            Premium.`}
          </p>
          <Button
            href="/premium"
            className="bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800 mb-2 mr-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-4"
          >
            Upgrade
          </Button>
        </div>
      </div>
    </section>
  )
}
