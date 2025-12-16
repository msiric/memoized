'use client'

import { createPortal } from '@/actions/createPortal'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useSignOut } from '@/hooks/useSignOut'
import { CustomError, handleError } from '@/lib/error-tracking'
import { formatPercentage, getInitials } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'
import clsx from 'clsx'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { HiArrowTopRightOnSquare, HiPower } from 'react-icons/hi2'
import { IoChevronDown } from 'react-icons/io5'
import { Button } from './Button'

export const UserDropdown = ({ isMobile = false, ...props }) => {
  const router = useRouter()

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

  const formattedLessonProgress = `${formatPercentage(currentLessonProgress)}%`
  const formattedProblemProgress = `${formatPercentage(currentProblemProgress)}%`

  const handleSignOut = () => {
    signOut()
    setOpen(false)
  }

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const userInitials = getInitials(user?.name ?? '')

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

  // Shared dropdown content
  const dropdownContent = (
    <>
      {/* User info */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="truncate text-sm font-medium text-white">{user?.name}</p>
        <p className="truncate text-xs text-zinc-500">{user?.email}</p>
      </div>

      {/* Progress section */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="mb-2 text-sm text-white">Progress</p>
        <div className="space-y-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Lessons</span>
              <span className="text-zinc-300">{formattedLessonProgress}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-lime-500 transition-all"
                style={{ width: formattedLessonProgress }}
              />
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Problems</span>
              <span className="text-zinc-300">{formattedProblemProgress}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: formattedProblemProgress }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="py-1">
        {user?.currentSubscriptionStatus &&
          (user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm text-lime-400">Lifetime</span>
              <span className="text-lime-400">✨</span>
            </div>
          ) : (
            <button
              onClick={handleStripePortalRequest}
              disabled={isSubmitting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            >
              <HiArrowTopRightOnSquare className="h-4 w-4 text-zinc-500" />
              <span>Manage subscription</span>
            </button>
          ))}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <HiPower className="h-4 w-4 text-zinc-500" />
          <span>Sign out</span>
        </button>
      </div>
    </>
  )

  // Mobile layout - expandable section
  if (isMobile) {
    return (
      <div
        ref={dropdownRef}
        className={clsx(
          'w-full overflow-hidden rounded-2xl border border-zinc-700/40 bg-zinc-800/95 backdrop-blur-sm transition-all duration-300',
          open && 'shadow-xl shadow-black/20'
        )}
      >
        {/* Mobile trigger button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-zinc-700/30"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 ring-2 ring-zinc-600/50">
            {user?.image ? (
              <Image
                alt="Avatar"
                className="h-full w-full object-cover"
                src={user.image}
                height={44}
                width={44}
              />
            ) : (
              <span className="text-sm font-semibold text-zinc-200">{userInitials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[15px] font-semibold tracking-tight text-white">{user?.name}</p>
            <p className="truncate text-[13px] text-zinc-500">{user?.email}</p>
          </div>
          <div className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300',
            open ? 'bg-zinc-600/50' : 'bg-zinc-700/50'
          )}>
            <IoChevronDown
              className={clsx(
                'h-4 w-4 text-zinc-300 transition-transform duration-300',
                open && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Mobile expanded content */}
        <div
          className={clsx(
            'grid transition-all duration-300 ease-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-zinc-700/40">
              {/* Progress section */}
              <div className="border-b border-zinc-700/40 px-4 py-4">
                <p className="mb-3 text-sm text-white">Progress</p>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-zinc-400">Lessons</span>
                      <span className="tabular-nums text-zinc-300">{formattedLessonProgress}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-900/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400 transition-all"
                        style={{ width: formattedLessonProgress }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-zinc-400">Problems</span>
                      <span className="tabular-nums text-zinc-300">{formattedProblemProgress}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-900/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                        style={{ width: formattedProblemProgress }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-2">
                {user?.currentSubscriptionStatus &&
                  (user.currentSubscriptionPlan === SubscriptionPlan.LIFETIME ? (
                    <div className="flex items-center justify-between rounded-lg bg-lime-500/10 px-3 py-2.5">
                      <span className="text-sm font-medium text-lime-400">Lifetime Member</span>
                      <span className="text-lg">✨</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleStripePortalRequest}
                      disabled={isSubmitting}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50 hover:text-white disabled:opacity-50"
                    >
                      <HiArrowTopRightOnSquare className="h-4 w-4 text-zinc-400" />
                      <span>Manage subscription</span>
                    </button>
                  ))}
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50 hover:text-white"
                >
                  <HiPower className="h-4 w-4 text-zinc-400" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop layout - floating dropdown
  return (
    <div className="relative">
      {/* Trigger button */}
      <Button
        {...props}
        ref={buttonRef}
        className="flex items-center justify-center rounded-full text-sm"
        type="button"
        onClick={() => setOpen(!open)}
      >
        <span className="sr-only">Open user menu</span>
        {user?.image ? (
          <Image
            alt="Avatar"
            className={clsx('rounded-full', userInitials && 'mr-2')}
            src={user.image}
            height={20}
            width={20}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        ) : null}
        <span className="truncate">{userInitials}</span>
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-4 w-56 overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900 shadow-xl"
        >
          {dropdownContent}
        </div>
      )}
    </div>
  )
}
