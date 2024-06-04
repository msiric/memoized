'use client'

import { Logo } from '@/components/Logo'
import {
  MobileNavigation,
  useIsInsideMobileNavigation,
  useMobileNavigationStore,
} from '@/components/MobileNavigation'
import { MobileSearch, Search } from '@/components/Search'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CUSTOMER_PORTAL_LINK } from '@/constants'
import { useAuthStore } from '@/contexts/auth'
import { Curriculum } from '@/types'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { forwardRef } from 'react'
import { AuthButton } from './AuthButton'

function TopLevelNavItem({
  href,
  target,
  disabled,
  children,
}: {
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <li>
      {disabled ? (
        <p className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
          {children}
        </p>
      ) : target ? (
        <a
          href={href ?? ''}
          target={target}
          className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          {children}
        </a>
      ) : (
        <Link
          href={href ?? ''}
          className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          {children}
        </Link>
      )}
    </li>
  )
}

export type HeaderProps = {
  fullCurriculum?: Curriculum[]
  className?: string
}

export const Header = forwardRef<React.ElementRef<'div'>, HeaderProps>(
  function Header({ fullCurriculum, className }, ref) {
    const user = useAuthStore((state) => state.user)

    const { isOpen: mobileNavIsOpen } = useMobileNavigationStore()
    const isInsideMobileNavigation = useIsInsideMobileNavigation()

    const { scrollY } = useScroll()

    const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9])
    const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8])

    return (
      <motion.div
        ref={ref}
        className={clsx(
          className,
          'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:left-72 lg:z-30 lg:px-8 xl:left-80',
          !isInsideMobileNavigation &&
            'backdrop-blur-sm lg:left-72 xl:left-80 dark:backdrop-blur',
          isInsideMobileNavigation
            ? 'bg-white dark:bg-zinc-900'
            : 'bg-white/[var(--bg-opacity-light)] dark:bg-zinc-900/[var(--bg-opacity-dark)]',
        )}
        style={
          {
            '--bg-opacity-light': bgOpacityLight,
            '--bg-opacity-dark': bgOpacityDark,
          } as React.CSSProperties
        }
      >
        <div
          className={clsx(
            'absolute inset-x-0 top-full h-px transition',
            (isInsideMobileNavigation || !mobileNavIsOpen) &&
              'bg-zinc-900/7.5 dark:bg-white/7.5',
          )}
        />
        <Search />
        <div className="flex items-center gap-5 lg:hidden">
          <MobileNavigation fullCurriculum={fullCurriculum} />
          <Link href="/" aria-label="Home">
            <Logo className="h-6" />
          </Link>
        </div>
        <div className="flex items-center gap-5">
          <nav className="hidden md:block">
            <ul role="list" className="flex items-center gap-8">
              {user === undefined ? (
                <TopLevelNavItem disabled>Loading</TopLevelNavItem>
              ) : user?.currentSubscriptionStatus ===
                SubscriptionStatus.ACTIVE ? (
                <TopLevelNavItem href={CUSTOMER_PORTAL_LINK} target="_blank">
                  {capitalizeFirstLetter(
                    user?.currentSubscriptionPlan ?? 'Subscribed',
                  )}
                </TopLevelNavItem>
              ) : (
                <TopLevelNavItem href="/premium">Premium</TopLevelNavItem>
              )}
            </ul>
          </nav>
          <div className="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15" />
          <div className="flex gap-4">
            <MobileSearch />
            <ThemeToggle />
          </div>
          <div className="hidden min-[416px]:contents">
            <AuthButton />
          </div>
        </div>
      </motion.div>
    )
  },
)
