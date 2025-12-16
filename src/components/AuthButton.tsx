'use client'

import { Button, ButtonProps } from '@/components/Button'
import { useAuthStore } from '@/contexts/auth'
import { useSignOut } from '@/hooks/useSignOut'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { HiUser } from 'react-icons/hi2'
import { UserDropdown } from './UserDropdown'

export type AuthButtonProps = ButtonProps & { isMobile?: boolean }

export const AuthButton = ({ isMobile = false, className, ...props }: AuthButtonProps) => {
  const openModal = useAuthStore((state) => state.openModal)

  const { data: session } = useSession()

  const { signOut } = useSignOut()

  const isLoading = session === undefined

  const handleClick = () => {
    if (session) {
      signOut()
    } else {
      openModal()
    }
  }

  if (isLoading) {
    if (isMobile) {
      return (
        <div className={clsx(
          'flex w-full items-center gap-3.5 rounded-2xl border border-zinc-700/40 bg-zinc-800/95 px-4 py-3.5 opacity-50',
          className
        )}>
          <div className="flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-zinc-700" />
          <span className="text-[15px] font-semibold text-zinc-400">Loading...</span>
        </div>
      )
    }
    return (
      <Button {...props} className={className} disabled={true}>
        Loading
      </Button>
    )
  }

  if (session) {
    return <UserDropdown {...props} className={className} isMobile={isMobile} />
  }

  // Mobile sign-in button
  if (isMobile) {
    return (
      <button
        onClick={handleClick}
        className={clsx(
          'flex w-full items-center gap-3.5 rounded-2xl border border-zinc-700/40 bg-zinc-800/95 px-4 py-3.5 backdrop-blur-sm transition-all duration-300 hover:bg-zinc-700/80 hover:shadow-xl hover:shadow-black/20',
          className
        )}
      >
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 ring-2 ring-zinc-600/50">
          <HiUser className="h-5 w-5 text-zinc-300" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[15px] font-semibold tracking-tight text-white">Sign in</p>
          <p className="text-[13px] text-zinc-500">Access your progress</p>
        </div>
      </button>
    )
  }

  // Desktop sign-in button
  return (
    <Button {...props} className={className} onClick={handleClick}>
      Sign in
    </Button>
  )
}
