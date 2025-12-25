'use client'

import { createPortal } from '@/actions/createPortal'
import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/providers/SectionProvider'
import { Tag } from '@/components/Tag'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useAccess } from '@/hooks/useAccess'
import { useNavigationLinks } from '@/hooks/useNavigationLinks'
import {
  CompletedKey,
  NavigationLink,
  NavigationProps,
  NavigationSection,
} from '@/types'
import { CustomError, handleError } from '@/lib/error-tracking'
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
import { memo, useEffect, useRef, useState } from 'react'
import { AuthButton } from './AuthButton'
import { BookIcon } from './icons/BookIcon'
import { CheckIcon } from './icons/CheckIcon'
import { LockIcon } from './icons/LockIcon'
import { ChevronLeftIcon } from './icons'
import { IconWrapper } from './IconWrapper'
import { PREMIUM_PREFIX } from '../constants'
import { HiSparkles } from 'react-icons/hi2'

export const useInitialValue = <T,>(value: T, condition = true) => {
  const initialValue = useRef(value).current
  return condition ? initialValue : value
}

const SectionLink = memo(
  ({
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
  }) => {
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
          active
            ? 'text-zinc-900 dark:text-white'
            : 'text-zinc-900 hover:text-zinc-900 dark:text-white dark:hover:text-white',
        )}
        ref={sectionRef}
      >
        <span
          className={clsx('truncate', active && 'border-b border-lime-600')}
        >
          {children}
        </span>
        {isCompleted ? <IconWrapper icon={CheckIcon} className="stroke-lime-500 dark:stroke-lime-400" /> : null}
      </Link>
    )
  },
)

SectionLink.displayName = 'SectionLink'

const TopLevelNavItem = memo(
  ({ href, children }: { href: string; children: React.ReactNode }) => {
    return (
      <li className="flex-1 md:hidden">
        <Link
          href={href}
          className="flex items-center justify-center rounded-lg py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-zinc-700/50 hover:text-white"
          scroll={false}
        >
          {children}
        </Link>
      </li>
    )
  },
)

TopLevelNavItem.displayName = 'TopLevelNavItem'

const NavLink = memo(
  ({
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
  }) => {
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
          active
            ? 'text-zinc-900 dark:text-white'
            : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
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
          <IconWrapper icon={CheckIcon} className="stroke-lime-500 dark:stroke-lime-400" />
        ) : null}
      </Link>
    )
  },
)

NavLink.displayName = 'NavLink'

const VisibleSectionHighlight = memo(
  ({ section, pathname }: { section: NavigationSection; pathname: string }) => {
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
  },
)

VisibleSectionHighlight.displayName = 'VisibleSectionHighlight'

const ActivePageMarker = memo(
  ({ section, pathname }: { section: NavigationSection; pathname: string }) => {
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
  },
)

ActivePageMarker.displayName = 'ActivePageMarker'

const NavigationGroup = memo(
  ({
    section,
    className,
  }: {
    section: NavigationSection
    className?: string
  }) => {
    // If this is the mobile navigation then we always render the initial
    // state, so that the state does not change during the close animation.
    // The state will still update when we re-open (re-render) the navigation.
    const isInsideMobileNavigation = useIsInsideMobileNavigation()
    const [pathname, sections] = useInitialValue(
      [usePathname(), useSectionStore((s) => s.sections)],
      isInsideMobileNavigation,
    )

    const isActiveGroup = section.links?.some((link) => link.href === pathname)

    const formattedPathname = `/${pathname.split('/').slice(1, 4).join('/')}`

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
          active={section.href === formattedPathname}
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
  },
)

NavigationGroup.displayName = 'NavigationGroup'

export const NavPremiumButton = memo(() => {
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
      <li className="flex-1 md:hidden">
        <span className="flex items-center justify-center rounded-lg py-2.5 text-sm font-medium text-zinc-500">
          ...
        </span>
      </li>
    ) : user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
      user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
        <li className="flex-1 md:hidden">
          <span className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium text-indigo-400">
            <HiSparkles className="h-4 w-4" />
            {currentSubscription}
          </span>
        </li>
      ) : (
        <li className="flex-1 md:hidden">
          <button
            onClick={handleStripePortalRequest}
            disabled={isSubmitting}
            className={clsx(
              'flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all',
              isSubmitting 
                ? 'text-zinc-500' 
                : 'text-indigo-400 hover:bg-zinc-700/50 hover:text-indigo-300'
            )}
          >
            <HiSparkles className="h-4 w-4" />
            {currentSubscription}
          </button>
        </li>
      )
    ) : (
      <li className="flex-1 md:hidden">
        <Link
          href={PREMIUM_PREFIX}
          className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium text-indigo-400 transition-all hover:bg-zinc-700/50 hover:text-indigo-300"
        >
          <HiSparkles className="h-4 w-4" />
          Premium
        </Link>
      </li>
    )

  return content
})

NavPremiumButton.displayName = 'NavPremiumButton'

export const Navigation = ({ navigation, ...props }: NavigationProps) => {
  const pathname = usePathname()
  const navigationLinks = useNavigationLinks()

  const completedItems = useContentStore((state) => state.completedLessons)

  const links = navigation?.sections.flatMap((section) => section.links)

  const isActive = pathname === navigation?.href

  const isCompleted =
    links?.length && links?.every((link) => completedItems.has(link?.id ?? ''))

  return (
    <nav {...props}>
      <ul role="list">
        <div className="mb-6 mt-4 flex items-center overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-1 md:hidden">
          {navigationLinks.map((link) => (
            <TopLevelNavItem key={link.href} href={link.href}>
              {link.title}
            </TopLevelNavItem>
          ))}
          <NavPremiumButton />
        </div>
        <div className="text-md mt-4 flex items-center justify-start font-bold md:mt-6">
          {pathname.startsWith('/courses/') && !pathname.endsWith('/courses') && (
            <Link
              href="/courses"
              className="mr-2 rounded-md p-1 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              title="Back to Courses"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Link>
          )}
          <Link
            href={navigation?.href ?? ''}
            className={clsx(
              'flex items-center',
              isActive && '',
              isCompleted
                ? 'text-lime-600 dark:text-lime-400'
                : 'text-zinc-900 hover:text-zinc-900 dark:text-white dark:hover:text-white',
            )}
          >
            <span
              className={clsx(
                'mr-2 truncate',
                isActive && 'border-b border-indigo-500',
              )}
            >
              {navigation?.title}
            </span>
            <IconWrapper icon={BookIcon} />
          </Link>
        </div>
        <div className="px-2">
          {navigation?.sections.map((section) => (
            <NavigationGroup key={section.title} section={section} />
          ))}
        </div>
        {/* Mobile-only auth button - hidden when header auth button is visible */}
        <div className="sticky bottom-0 z-10 min-[416px]:hidden">
          <li className="flex justify-between gap-2">
            <AuthButton
              variant="filled"
              className="mt-6 w-full truncate"
              isMobile
            />
          </li>
        </div>
      </ul>
    </nav>
  )
}
