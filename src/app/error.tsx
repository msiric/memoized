'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
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
    <>
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
        <Button onClick={() => reset()} arrow="right" className="mt-8">
          Try again
        </Button>
      </div>
    </>
  )
}
