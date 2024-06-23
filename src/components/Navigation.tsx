'use client'

import { useIsInsideMobileNavigation } from '@/components/MobileNavigation'
import { useSectionStore } from '@/components/SectionProvider'
import { Tag } from '@/components/Tag'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useAccess } from '@/hooks/useAccess'
import { Curriculum, LessonResult, SectionResult } from '@/types'
import { remToPx } from '@/utils/helpers'
import { AccessOptions } from '@prisma/client'
import clsx from 'clsx'
import { AnimatePresence, motion, useIsPresent } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { AuthButton } from './AuthButton'
import { IconWrapper } from './IconWrapper'
import { PremiumButton } from './PremiumButton'
import { CheckIcon } from './icons/CheckIcon'
import { LockIcon } from './icons/LockIcon'

function useInitialValue<T>(value: T, condition = true) {
  const initialValue = useRef(value).current
  return condition ? initialValue : value
}

function SectionLink({
  id,
  href,
  active = false,
  lessons = [],
  children,
}: {
  id: string
  href: string
  active?: boolean
  lessons?: LessonResult[]
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const completedLessons = useContentStore((state) => state.completedLessons)

  const isCompleted = lessons.every((lesson) => completedLessons.has(lesson.id))

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

function NavLink({
  id,
  href,
  children,
  tag,
  access,
  active = false,
  isAnchorLink = false,
  onRef,
}: {
  id: string
  href: string
  children: React.ReactNode
  tag?: string
  access?: AccessOptions
  active?: boolean
  isAnchorLink?: boolean
  onRef?: (ref: HTMLAnchorElement | null) => void
}) {
  const pathname = usePathname()

  const userData = useAuthStore((state) => state.user)
  const completedLessons = useContentStore((state) => state.completedLessons)

  const isCompleted = Array.from(completedLessons).some(
    (lesson) => lesson === id,
  )

  const hasAccess = useAccess(userData, access)

  const lessonRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (active && lessonRef.current) {
      setTimeout(
        () =>
          lessonRef.current?.scrollIntoView({
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
      ref={lessonRef}
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
  section: SectionResult
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
    section.lessons.findIndex((lesson) => lesson.href === pathname) *
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
  section: SectionResult
  pathname: string
}) {
  const itemHeight = remToPx(2)
  const offset = remToPx(0.25)
  const activePageIndex = section.lessons.findIndex(
    (lesson) => lesson.href === pathname,
  )
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
  section: SectionResult
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

  const isActiveGroup = section.lessons.some(
    (lesson) => lesson.href === pathname,
  )

  return (
    <li className={clsx('relative mt-6', className)}>
      <SectionLink
        id={section.id}
        href={section.href}
        active={section.href === pathname}
        lessons={section.lessons}
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
          {section.lessons.map((lesson) => (
            <motion.li key={lesson.href} layout="position" className="relative">
              <NavLink
                id={lesson.id}
                href={lesson.href}
                active={lesson.href === pathname}
                access={lesson.access}
              >
                {lesson.title}
              </NavLink>
              <AnimatePresence mode="popLayout" initial={false}>
                {lesson.href === pathname && sections.length > 0 && (
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
                          id={`${lesson.id}_${section.id}`}
                          href={`${lesson.href}#${section.id}`}
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
  fullCurriculum?: Curriculum[]
} & React.ComponentPropsWithoutRef<'nav'>

export function Navigation({ fullCurriculum, ...props }: NavigationProps) {
  return (
    <nav {...props}>
      <ul role="list">
        {fullCurriculum?.map((course) =>
          course.sections.map((section, index) => (
            <NavigationGroup
              key={section.title}
              section={section}
              className={index === 0 ? 'md:mt-0' : ''}
            />
          )),
        )}
        <li className="sticky bottom-0 z-10 mt-6 flex justify-between gap-2">
          <AuthButton
            variant="filled"
            className="w-full min-[416px]:hidden"
            isMobile
          />
          <PremiumButton isMobile withList={false} />
        </li>
      </ul>
    </nav>
  )
}
