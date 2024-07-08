'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useSignOut } from '@/hooks/useSignOut'
import { getInitials } from '@/utils/helpers'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

export const UserDropdown = ({ isMobile = false, ...props }) => {
  const router = useRouter()
  const currentPath = usePathname()

  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signOut } = useSignOut()

  const user = useAuthStore((state) => state.user)
  const currentLessonProgress = useContentStore(
    (state) => state.currentLessonProgress,
  )
  const currentProblemProgress = useContentStore(
    (state) => state.currentProblemProgress,
  )

  const formattedLessonProgress = `${currentLessonProgress.toFixed(2)}%`
  const formattedProblemProgress = `${currentProblemProgress.toFixed(2)}%`

  const handleClick = () => {
    signOut()
    setOpen(false)
  }

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const userInitials = getInitials(user?.name ?? '')

  const handleStripePortalRequest = async () => {
    setIsSubmitting(true)
    const redirectUrl = await createPortal(currentPath)
    setIsSubmitting(false)
    return router.push(redirectUrl)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownRef, buttonRef])

  return (
    <>
      {isMobile ? (
        <Button
          {...props}
          variant="filled"
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
        >
          <Image
            alt="Avatar"
            className={clsx('rounded-full', userInitials && 'mr-2')}
            src={user?.image ?? ''}
            height="24"
            width="24"
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
          <span className="truncate">{user?.name ?? ''}</span>
        </Button>
      ) : (
        <Button
          {...props}
          ref={buttonRef}
          className={'flex items-center justify-center rounded-full text-sm'}
          type="button"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">Open user menu</span>
          <Image
            alt="Avatar"
            className={clsx('rounded-full', userInitials && 'mr-2')}
            src={user?.image ?? ''}
            height="20"
            width="20"
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />

          <span className="truncate">{userInitials}</span>
        </Button>
      )}

      <div
        ref={dropdownRef}
        className={clsx(
          'w-50 absolute right-2 top-[64px] z-10 max-w-[300px] divide-y divide-zinc-300 divide-zinc-600 rounded-lg bg-zinc-900 shadow dark:bg-zinc-700',
          open ? '' : 'hidden',
          isMobile
            ? '!-top-[230px] bottom-[84px] left-0 block w-full bg-zinc-100 min-[416px]:hidden'
            : '',
        )}
      >
        <div className="px-4 py-3 text-sm text-white">
          <div className="truncate font-bold">{user?.name ?? ''}</div>
          <div className="truncate font-medium">{user?.email ?? ''}</div>
        </div>
        <div className="py-2">
          <p className="block px-4 text-sm font-bold text-white">Progress</p>
          <div>
            <div className="flex gap-1 px-4">
              <p className="block text-sm text-white">Lessons</p>
              <p className="font-sm block text-xs text-white">
                ({formattedLessonProgress})
              </p>
            </div>
            <div className="block h-2.5 w-full rounded-full px-4">
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-1.5 bg-lime-500"
                  style={{ width: formattedLessonProgress }}
                />
              </div>
            </div>
            <div className="flex gap-1 px-4">
              <p className="block text-sm text-white">Problems</p>
              <p className="font-sm block text-xs text-white">
                ({formattedProblemProgress})
              </p>
            </div>
            <div className="block h-2.5 w-full rounded-full px-4">
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className="h-1.5 bg-indigo-400"
                  style={{ width: formattedProblemProgress }}
                />
              </div>
            </div>
          </div>
        </div>
        <ul className="py-2 text-sm text-zinc-200">
          {user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
            user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
              <li>
                <p className="block w-full px-4 py-2">
                  Lifetime access &#10024;
                </p>
              </li>
            ) : (
              <li>
                <button
                  onClick={handleStripePortalRequest}
                  disabled={isSubmitting}
                  className={clsx(
                    'block w-full px-4 py-2 text-left hover:bg-zinc-600 hover:text-white disabled:opacity-50',
                    isSubmitting && 'cursor-wait',
                  )}
                >
                  Subscription
                </button>
              </li>
            )
          ) : null}
          <li>
            <button
              onClick={handleClick}
              className="block w-full px-4 py-2 text-left hover:bg-zinc-600 hover:text-white disabled:opacity-50"
            >
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}
