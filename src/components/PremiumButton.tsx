'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

export const PremiumButton = () => {
  const router = useRouter()
  const currentPath = usePathname()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((state) => state.user)

  const currentSubscription = capitalizeFirstLetter(
    user?.currentSubscriptionPlan ?? 'Subscribed',
  )

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true)
    const redirectUrl = await createPortal(currentPath ?? '')
    setIsSubmitting(false)
    return router.push(redirectUrl)
  }

  const content =
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">
          {currentSubscription} &#10024;
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

  return <li>{content}</li>
}
