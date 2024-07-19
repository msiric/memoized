'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <HeroPattern />
        <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            500
          </p>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
            Sorry, there’s a problem loading this page.
          </p>
          <button onClick={() => reset()} className="mt-8">
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
