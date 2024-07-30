'use client'

import { createPortal } from '@/actions/createPortal'
import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/components/SectionProvider'
import { Tag } from '@/components/Tag'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useAccess } from '@/hooks/useAccess'
import { useNavigationLinks } from '@/hooks/useNavigationLinks'
import {
  CompletedKey,
  NavigationContent,
  NavigationLink,
  NavigationSection,
} from '@/types'
import { CustomError, handleError } from '@/utils/error'
import { capitalizeFirstLetter, remToPx } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import {
  AccessOptions,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@prisma/client'
import clsx from 'clsx'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { AuthButton } from './AuthButton'
import { IconWrapper } from './IconWrapper'
import { CheckIcon } from './icons/CheckIcon'
import { LockIcon } from './icons/LockIcon'

function useInitialValue<T>(value: T, condition = true) {
  const initialValue = useRef(value).current
  return condition ? initialValue : value
}

function SectionLink({
  href,
  active = false,
  links = [],
  completedKey = 'completedLessons',
  children,
}: {
  href: string
  active?: boolean
  links?: NavigationLink[]
  completedKey?: CompletedKey
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const completedItems = useContentStore((state) => state[completedKey])

  const isCompleted =
    links.length && links.every((link) => completedItems.has(link.id))

  const sectionRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (active && sectionRef.current) {
      setTimeout(
        () =>
          sectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          }),
        250,
      )
    }
  }, [active, pathname])

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex items-center justify-between text-sm font-semibold',
        active && 'font-bold',
        isCompleted
          ? 'text-lime-600 dark:text-lime-400'
          : 'text-zinc-900 hover:text-zinc-900 dark:text-white dark:hover:text-white',
      )}
      ref={sectionRef}
    >
      <span className={clsx('truncate', active && 'border-b border-lime-500')}>
        {children}
      </span>
      {isCompleted ? <IconWrapper icon={CheckIcon} /> : null}
    </Link>
  )
}

export const NavPremiumButton = () => {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const user = useAuthStore((state) => state.user)

  const currentSubscription = capitalizeFirstLetter(
    user?.currentSubscriptionPlan ?? 'Subscribed',
  )

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

  const content =
    user === undefined ? (
      <li>
        <p className="text-md block py-1 text-zinc-600 dark:text-white">
          Loading
        </p>
      </li>
    ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <li>
          <p className="text-md block py-1 text-zinc-600 dark:text-white">
            {currentSubscription} &#10024;
          </p>
        </li>
      ) : (
        <li className="md:hidden">
          <button
            onClick={handleStripePortalRequest}
            disabled={isSubmitting}
            className={clsx(
              'text-md block py-1 text-zinc-600 transition hover:text-zinc-900 dark:text-white dark:hover:text-lime-500',
              isSubmitting && 'cursor-wait',
            )}
          >
            {currentSubscription}
          </button>
        </li>
      )
    ) : (
      <li className="md:hidden">
        <Link
          href="/premium"
          className="text-md block py-1 text-zinc-600 transition hover:text-zinc-900 dark:text-white dark:hover:text-lime-500"
        >
          Premium
        </Link>
      </li>
    )

  return content
}

function TopLevelNavItem({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li className="md:hidden">
      <Link
        href={href}
        className="text-md block py-1 text-zinc-600 transition hover:text-zinc-900 dark:text-white dark:hover:text-lime-500"
      >
        {children}
      </Link>
    </li>
  )
}

function NavLink({
  id,
  href,
  children,
  tag,
  access,
  active = false,
  isAnchorLink = false,
  completedKey = 'completedLessons',
}: {
  id: string
  href: string
  children: React.ReactNode
  tag?: string
  access?: AccessOptions
  active?: boolean
  isAnchorLink?: boolean
  completedKey?: CompletedKey
}) {
  const pathname = usePathname()

  const userData = useAuthStore((state) => state.user)
  const completedItems = useContentStore((state) => state[completedKey])

  const isCompleted = Array.from(completedItems).some((item) => item === id)

  const hasAccess = useAccess(userData, access)

  const linkRef = useRef<HTMLAnchorElement | null>(null)

  const isExternal = /^https?:\/\/|^\/\//i.test(href)

  useEffect(() => {
    if (active && linkRef.current) {
      setTimeout(
        () =>
          linkRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          }),
        250,
      )
    }
  }, [active, pathname])

  return (
    <Link
      href={href}
      {...(isExternal && { target: '_blank' })}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex items-center justify-between gap-2 py-1 text-sm transition',
        isAnchorLink ? 'pl-7' : 'pl-4',
        active && 'font-semibold',
        isCompleted
          ? 'text-lime-600 dark:text-lime-400'
          : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
        active && !isCompleted && 'text-zinc-900 dark:text-white',
      )}
      ref={linkRef}
    >
      <span className="truncate">{children}</span>
      {tag && (
        <Tag variant="small" color="zinc">
          {tag}
        </Tag>
      )}
      {!hasAccess ? (
        <IconWrapper
          icon={LockIcon}
          className="fill-zinc-600 dark:fill-zinc-400"
        />
      ) : isCompleted ? (
        <IconWrapper icon={CheckIcon} />
      ) : null}
    </Link>
  )
}

function VisibleSectionHighlight({
  section,
  pathname,
}: {
  section: NavigationSection
  pathname: string
}) {
  const [sections, visibleSections] = useInitialValue(
    [
      useSectionStore((s) => s.sections),
      useSectionStore((s) => s.visibleSections),
    ],
    useIsInsideMobileNavigation(),
  )

  const isPresent = useIsPresent()
  const firstVisibleSectionIndex = Math.max(
    0,
    [{ id: '_top' }, ...sections].findIndex(
      (section) => section.id === visibleSections[0],
    ),
  )
  const itemHeight = remToPx(2)
  const height = isPresent
    ? Math.max(1, visibleSections.length) * itemHeight
    : itemHeight
  const top =
    (section.links?.findIndex((link) => link.href === pathname) ?? -1) *
      itemHeight +
    firstVisibleSectionIndex * itemHeight

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      className="absolute inset-x-0 top-0 bg-zinc-800/2.5 will-change-transform dark:bg-white/2.5"
      style={{ borderRadius: 8, height, top }}
    />
  )
}

function ActivePageMarker({
  section,
  pathname,
}: {
  section: NavigationSection
  pathname: string
}) {
  const itemHeight = remToPx(2)
  const offset = remToPx(0.25)
  const activePageIndex =
    section.links?.findIndex((link) => link.href === pathname) ?? -1
  const top = offset + activePageIndex * itemHeight

  return (
    <motion.div
      layout
      className="absolute left-2 h-6 w-px bg-lime-500"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.2 } }}
      exit={{ opacity: 0 }}
      style={{ top }}
    />
  )
}

function NavigationGroup({
  section,
  className,
}: {
  section: NavigationSection
  className?: string
}) {
  // If this is the mobile navigation then we always render the initial
  // state, so that the state does not change during the close animation.
  // The state will still update when we re-open (re-render) the navigation.
  const isInsideMobileNavigation = useIsInsideMobileNavigation()
  const [pathname, sections] = useInitialValue(
    [usePathname(), useSectionStore((s) => s.sections)],
    isInsideMobileNavigation,
  )

  const isActiveGroup = section.links?.some((link) => link.href === pathname)

  return (
    <li
      className={clsx(
        section.links?.length || section.order === 0
          ? 'relative mt-6'
          : 'relative mt-4',
        className,
      )}
    >
      <SectionLink
        href={section.href}
        active={section.href === pathname}
        links={section.links}
      >
        {section.title}
      </SectionLink>
      <div className="relative mt-3 pl-2">
        <AnimatePresence initial={!isInsideMobileNavigation}>
          {isActiveGroup && (
            <VisibleSectionHighlight
              section={section}
              pathname={pathname ?? ''}
            />
          )}
        </AnimatePresence>
        <motion.div
          layout
          className="absolute inset-y-0 left-2 w-px bg-zinc-900/10 dark:bg-white/5"
        />
        <AnimatePresence initial={false}>
          {isActiveGroup && (
            <ActivePageMarker section={section} pathname={pathname ?? ''} />
          )}
        </AnimatePresence>
        <ul role="list" className="border-l border-transparent">
          {section.links?.map((link) => (
            <motion.li key={link.href} layout="position" className="relative">
              <NavLink
                id={link.id}
                href={link.href}
                active={link.href === pathname}
                access={link.access}
              >
                {link.title}
              </NavLink>
              <AnimatePresence mode="popLayout" initial={false}>
                {link.href === pathname && sections.length > 0 && (
                  <motion.ul
                    role="list"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: { delay: 0.1 },
                    }}
                    exit={{
                      opacity: 0,
                      transition: { duration: 0.15 },
                    }}
                  >
                    {sections.map((section) => (
                      <li key={section.id}>
                        <NavLink
                          id={`${link.id}_${section.id}`}
                          href={`${link.href}#${section.id}`}
                          tag={section.tag}
                          isAnchorLink
                        >
                          {section.title}
                        </NavLink>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export type NavigationProps = {
  navigation?: NavigationContent
} & React.ComponentPropsWithoutRef<'nav'>

export function Navigation({ navigation, ...props }: NavigationProps) {
  const navigationLinks = useNavigationLinks()

  return (
    <nav {...props}>
      <ul role="list">
        <div className="mt-6 flex flex-col gap-2 md:hidden">
          {navigationLinks.map((link) => (
            <TopLevelNavItem key={link.href} href={link.href}>
              {link.title}
            </TopLevelNavItem>
          ))}
          <NavPremiumButton />
        </div>
        {navigation?.sections.map((section) => (
          <NavigationGroup key={section.title} section={section} />
        ))}
        <div className="sticky bottom-0 z-10 flex flex-col justify-between gap-2">
          <li className="bottom-0 z-10 flex justify-between gap-2">
            <AuthButton
              variant="filled"
              className="mt-6 w-full truncate min-[416px]:hidden"
              isMobile
            />
          </li>
        </div>
      </ul>
    </nav>
  )
}
