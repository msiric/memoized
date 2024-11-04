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
