'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { CustomError, handleError } from '@/lib/error-tracking'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'
import { HiSparkles } from 'react-icons/hi2'
import { PREMIUM_PREFIX } from '../constants'

export const PREMIUM_BUTTON_STYLES = {
  shared:
    'border border-solid border-indigo-600 px-1.5 py-0.5 leading-5 text-indigo-600 dark:border-indigo-500 dark:text-indigo-500 leading-5',
  base: 'text-sm rounded-lg',
  interactive:
    'transition hover:border-indigo-500 hover:text-indigo-500 dark:hover:border-indigo-400 dark:hover:text-indigo-400',
  disabled: 'disabled:opacity-50',
  loading: 'cursor-wait',
}

export const PremiumButton = () => {
  const pathname = usePathname()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const user = useAuthStore((state) => state.user)
  const currentSubscription = capitalizeFirstLetter(
    user?.currentSubscriptionPlan ?? 'Subscribed',
  )
  const shouldRender = !pathname.startsWith(PREMIUM_PREFIX)

  const handleStripePortalRequest = async () => {
    try {
      setIsSubmitting(true)
      const response = await createPortal()
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)
      return router.push((response as unknown as { url: string }).url)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!shouldRender) return null

  const iconClasses = "h-3.5 w-3.5 -mt-px"

  const content =
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <span className="inline-flex items-center gap-1 text-sm leading-5 text-indigo-500 dark:text-indigo-400">
          <HiSparkles className={iconClasses} />
          {currentSubscription}
        </span>
      ) : (
        <button
          onClick={handleStripePortalRequest}
          disabled={isSubmitting}
          className={clsx(
            'inline-flex items-center gap-1 text-sm leading-5 transition-colors',
            isSubmitting
              ? 'cursor-wait text-zinc-500'
              : 'text-indigo-500 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300'
          )}
        >
          <HiSparkles className={iconClasses} />
          {currentSubscription}
        </button>
      )
    ) : (
      <Link
        href={PREMIUM_PREFIX}
        className="inline-flex items-center gap-1 text-sm leading-5 text-indigo-500 transition-colors hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        <HiSparkles className={iconClasses} />
        Premium
      </Link>
    )

  return <li className="flex items-center">{content}</li>
}
