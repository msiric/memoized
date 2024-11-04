'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { CustomError, handleError } from '@/utils/error'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useState } from 'react'

export const PREMIUM_BUTTON_STYLES = {
  shared:
    'border border-solid border-lime-600 px-1.5 py-0.5 leading-5 text-lime-600 dark:border-lime-500 dark:text-lime-500 leading-5',
  base: 'text-sm rounded-lg',
  interactive:
    'transition hover:border-lime-500 hover:text-lime-500 dark:hover:border-lime-400 dark:hover:text-lime-400',
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
  const shouldRender = !pathname.startsWith('/premium')

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

  const content =
    user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <p
          className={clsx(
            'inline-block',
            PREMIUM_BUTTON_STYLES.shared,
            PREMIUM_BUTTON_STYLES.base,
          )}
        >
          {currentSubscription} &#10024;
        </p>
      ) : (
        <button
          onClick={handleStripePortalRequest}
          disabled={isSubmitting}
          className={clsx(
            PREMIUM_BUTTON_STYLES.shared,
            PREMIUM_BUTTON_STYLES.base,
            PREMIUM_BUTTON_STYLES.interactive,
            PREMIUM_BUTTON_STYLES.disabled,
            isSubmitting && PREMIUM_BUTTON_STYLES.loading,
          )}
        >
          {currentSubscription}
        </button>
      )
    ) : (
      <Link href="/premium">
        <button
          className={clsx(
            PREMIUM_BUTTON_STYLES.shared,
            PREMIUM_BUTTON_STYLES.base,
            PREMIUM_BUTTON_STYLES.interactive,
          )}
        >
          Premium
        </button>
      </Link>
    )

  return <li>{content}</li>
}
