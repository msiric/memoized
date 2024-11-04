'use client'
import { Logo } from '@/components/Logo'
import {
  MobileNavigation,
  useIsInsideMobileNavigation,
  useMobileNavigationStore,
} from '@/components/MobileNavigation'
import { MobileSearch, Search } from '@/components/Search'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useNavigationLinks } from '@/hooks/useNavigationLinks'
import { NavigationContent } from '@/types'
import clsx from 'clsx'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { forwardRef } from 'react'
import { AuthButton } from './AuthButton'
import { PremiumButton } from './PremiumButton'

export type HeaderProps = {
  navigation?: NavigationContent
  fullWidth?: boolean
  className?: string
  withSearch?: boolean
  withAuth?: boolean
  withSubheader?: boolean
}

export const Header = forwardRef<React.ElementRef<'div'>, HeaderProps>(
  function Header(
    {
      navigation,
      fullWidth,
      className,
      withSearch = true,
      withAuth = true,
      withSubheader = false,
    },
    ref,
  ) {
    const { isOpen: mobileNavIsOpen } = useMobileNavigationStore()
    const isInsideMobileNavigation = useIsInsideMobileNavigation()
    const { scrollY } = useScroll()
    const bgOpacityLight = useTransform(scrollY, [0, 72], [0.5, 0.9])
    const bgOpacityDark = useTransform(scrollY, [0, 72], [0.2, 0.8])
    const navigationLinks = useNavigationLinks()

    return (
      <div className={clsx('relative', withSubheader && 'mb-10 md:mb-0')}>
        <motion.div
          ref={ref}
          className={clsx(
            className,
            'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-4 px-4 transition xs:gap-6 sm:px-6 md:gap-12 lg:z-30 lg:px-8',
            fullWidth ? '' : 'lg:left-72 xl:left-80',
            !isInsideMobileNavigation && 'backdrop-blur-sm dark:backdrop-blur',
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
          {fullWidth && (
            <Link href="/" aria-label="Home">
              <Logo className="h-5 xs:h-6" />
            </Link>
          )}
          <div
            className={clsx(
              'absolute inset-x-0 top-full h-px transition',
              (isInsideMobileNavigation || !mobileNavIsOpen) &&
                'bg-zinc-900/7.5 dark:bg-white/7.5',
            )}
          />
          {withSearch && <Search />}
          {!fullWidth && (
            <div className="flex items-center gap-5 lg:hidden">
              <MobileNavigation navigation={navigation} />
              <Link href="/" aria-label="Home">
                <Logo className="h-5 xs:h-6" />
              </Link>
            </div>
          )}
          <div className="flex items-center gap-3 xs:gap-5">
            <nav className="hidden md:block">
              <ul role="list" className="flex items-center gap-8">
                {navigationLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
                <PremiumButton />
              </ul>
            </nav>
            <div className="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15" />
            <div className="flex gap-2 xs:gap-4">
              {withSearch && <MobileSearch />}
              <ThemeToggle />
            </div>
            {withAuth && (
              <div
                className={clsx(
                  withSubheader ? 'contents' : 'hidden min-[416px]:contents',
                )}
              >
                <AuthButton />
              </div>
            )}
          </div>
        </motion.div>

        {withSubheader && (
          <div className="fixed inset-x-0 top-14 z-40 block bg-white/[var(--bg-opacity-light)] backdrop-blur-sm xs:block md:hidden dark:bg-zinc-900/[var(--bg-opacity-dark)] dark:backdrop-blur">
            <div className="container mx-auto px-4 py-2">
              <div
                className={clsx(
                  'absolute inset-x-0 top-full h-px transition',
                  (isInsideMobileNavigation || !mobileNavIsOpen) &&
                    'bg-zinc-900/7.5 dark:bg-white/7.5',
                )}
              />
              <ul className="flex items-center justify-center gap-8">
                {navigationLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm leading-5 text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                    >
                      {link.title}
                    </Link>
                  </li>
                ))}
                <PremiumButton />
              </ul>
            </div>
          </div>
        )}
      </div>
    )
  },
)
