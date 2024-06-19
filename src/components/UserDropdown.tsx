'use client'

import { CUSTOMER_PORTAL_LINK } from '@/constants'
import { useAuthStore } from '@/contexts/auth'
import { useProgressStore } from '@/contexts/progress'
import { useSignOut } from '@/hooks/useSignOut'
import { getInitials } from '@/utils/helpers'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Image from "next/legacy/image"
import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

export const UserDropdown = ({ isMobile = false }) => {
  const [open, setOpen] = useState(false)

  const { signOut } = useSignOut()

  const user = useAuthStore((state) => state.user)
  const currentProgress = useProgressStore((state) => state.currentProgress)

  const formattedProgress = `${currentProgress.toFixed(2)}%`

  const handleClick = () => {
    signOut()
    setOpen(false)
  }

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const userInitials = getInitials(user?.name ?? '')

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
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-2 rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium text-white duration-150 hover:text-lime-400 active:text-lime-400"
        >
          <Image
            alt="Avatar"
            className="rounded-full"
            src={user?.image ?? ''}
            height="24"
            width="24"
          />
          {user?.name ?? ''}
        </Button>
      ) : (
        <Button
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
          />
          {userInitials}
        </Button>
      )}

      <div
        ref={dropdownRef}
        className={clsx(
          'w-50 absolute right-2 top-[64px] z-10 divide-y divide-gray-300 rounded-lg bg-zinc-100 shadow dark:divide-gray-600 dark:bg-zinc-700',
          open ? '' : 'hidden',
          isMobile ? '-top-[228px] bottom-10 left-0 w-full' : '',
        )}
      >
        <div className="px-4 py-3 text-sm text-gray-900 dark:text-white">
          <div className="truncate font-bold">{user?.name ?? ''}</div>
          <div className="truncate font-medium">{user?.email ?? ''}</div>
        </div>
        <div className="py-2">
          <div className="flex gap-1 px-4">
            <p className="block text-sm font-medium">Progress</p>
            <p className="font-sm block text-xs">({formattedProgress})</p>
          </div>
          <div className="block h-2.5 w-full rounded-full px-4 dark:bg-zinc-700">
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500 dark:bg-white">
              <div
                className="h-1.5 bg-lime-500 dark:bg-lime-600"
                style={{ width: formattedProgress }}
              />
            </div>
          </div>
        </div>
        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
          {user?.currentSubscriptionStatus === SubscriptionStatus.ACTIVE ? (
            user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
              <li>
                <p className="block w-full px-4 py-2">
                  Lifetime access &#10024;
                </p>
              </li>
            ) : (
              <li>
                <a
                  href={CUSTOMER_PORTAL_LINK}
                  target="_blank"
                  className="block px-4 py-2 hover:bg-gray-200 dark:hover:bg-zinc-600 dark:hover:text-white"
                >
                  Subscription
                </a>
              </li>
            )
          ) : null}
          <li>
            <button
              onClick={handleClick}
              className="block w-full px-4 py-2 text-left hover:bg-gray-200 dark:hover:bg-zinc-600 dark:hover:text-white"
            >
              Sign out
            </button>
          </li>
        </ul>
      </div>
    </>
  )
}
