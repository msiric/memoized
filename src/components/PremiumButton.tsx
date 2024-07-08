'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export type PremiumButtonProps = {
  withList?: boolean
  isMobile?: boolean
}

export const PremiumButton = ({
  withList = true,
  isMobile = false,
}: PremiumButtonProps) => {
  const router = useRouter()
  const currentPath = usePathname()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((state) => state.user)

  const currentSubscription = capitalizeFirstLetter(
    user?.currentSubscriptionPlan ?? 'Subscribed',
  )

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true)
    const redirectUrl = await createPortal(currentPath)
    setIsSubmitting(false)
    return router.push(redirectUrl)
  }

  const content = isMobile ? (
    user === undefined ? (
      <p className="inline-flex w-full w-full items-center justify-center gap-0.5 overflow-hidden rounded-full border border-lime-600 bg-lime-600 px-3 py-1 text-sm font-medium text-white transition hover:border-lime-500 hover:bg-lime-500 min-[768px]:hidden dark:bg-zinc-900 dark:text-lime-500 dark:hover:bg-lime-900 dark:hover:text-lime-500">
        Loading
      </p>
    ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <p className="inline-flex w-full w-full items-center justify-center gap-0.5 overflow-hidden rounded-full border border-lime-600 bg-lime-600 px-3 py-1 text-sm font-medium text-white min-[768px]:hidden dark:bg-zinc-900 dark:text-lime-500">
          {currentSubscription}
        </p>
      ) : (
        <button
          onClick={handleStripePortalRequest}
          disabled={isSubmitting}
          className={clsx(
            'inline-flex w-full w-full items-center justify-center gap-0.5 overflow-hidden rounded-full border border-lime-600 bg-lime-600 px-3 py-1 text-sm font-medium text-white transition hover:border-lime-500 hover:bg-lime-500 disabled:opacity-50 min-[768px]:hidden dark:bg-zinc-900 dark:text-lime-500 dark:hover:bg-lime-900 dark:hover:text-lime-500',
            isSubmitting && 'cursor-wait',
          )}
        >
          {currentSubscription}
        </button>
      )
    ) : (
      <Link
        href="/premium"
        className="inline-flex w-full w-full items-center justify-center gap-0.5 overflow-hidden rounded-full border border-lime-600 bg-lime-600 px-3 py-1 text-sm font-medium text-white transition hover:border-lime-500 hover:bg-lime-500 min-[768px]:hidden dark:bg-zinc-900 dark:text-lime-500 dark:hover:bg-lime-900 dark:hover:text-lime-500"
      >
        Premium
      </Link>
    )
  ) : user === undefined ? (
    <p className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
      Loading
    </p>
  ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
    user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
      <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">
        {currentSubscription}
      </p>
    ) : (
      <button
        onClick={handleStripePortalRequest}
        disabled={isSubmitting}
        className={clsx(
          'text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white',
          isSubmitting && 'cursor-wait',
        )}
      >
        {currentSubscription}
      </button>
    )
  ) : (
    <Link
      href="/premium"
      className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      Premium
    </Link>
  )

  return withList ? (
    <li className={clsx(isMobile && 'sticky bottom-0 z-10 mt-6')}>{content}</li>
  ) : (
    content
  )
}
