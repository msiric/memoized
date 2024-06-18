'use client'

import { CUSTOMER_PORTAL_LINK } from '@/constants'
import { useAuthStore } from '@/contexts/auth'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Link from 'next/link'

export type PremiumButtonProps = {
  withList?: boolean
  isMobile?: boolean
}

export const PremiumButton = ({
  withList = true,
  isMobile = false,
}: PremiumButtonProps) => {
  const user = useAuthStore((state) => state.user)

  const content = isMobile ? (
    user === undefined ? (
      <p className="inline-flex w-full w-full justify-center gap-0.5 overflow-hidden rounded-full border border-lime-500 bg-white px-3 py-1 text-sm font-medium text-lime-500 transition hover:bg-lime-500 hover:text-white min-[768px]:hidden dark:bg-zinc-900 dark:hover:bg-lime-900 dark:hover:text-lime-500">
        Loading
      </p>
    ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      <a
        href={CUSTOMER_PORTAL_LINK}
        target="_blank"
        className="inline-flex w-full w-full justify-center gap-0.5 overflow-hidden rounded-full border border-lime-500 bg-white px-3 py-1 text-sm font-medium text-lime-500 transition hover:bg-lime-500 hover:text-white min-[768px]:hidden dark:bg-zinc-900 dark:hover:bg-lime-900 dark:hover:text-lime-500"
      >
        {capitalizeFirstLetter(user?.currentSubscriptionPlan ?? 'Subscribed')}
      </a>
    ) : (
      <Link
        href="/premium"
        className="inline-flex w-full w-full justify-center gap-0.5 overflow-hidden rounded-full border border-lime-500 bg-white px-3 py-1 text-sm font-medium text-lime-500 transition hover:bg-lime-500 hover:text-white min-[768px]:hidden dark:bg-zinc-900 dark:hover:bg-lime-900 dark:hover:text-lime-500"
      >
        Premium
      </Link>
    )
  ) : user === undefined ? (
    <p className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
      Loading
    </p>
  ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
    <a
      href={CUSTOMER_PORTAL_LINK}
      target="_blank"
      className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
    >
      {capitalizeFirstLetter(user?.currentSubscriptionPlan ?? 'Subscribed')}
    </a>
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
