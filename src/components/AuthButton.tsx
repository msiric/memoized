'use client'

import { Button, ButtonProps } from '@/components/Button'
import { useAuthStore } from '@/contexts/auth'
import { useSignOut } from '@/hooks/useSignOut'
import { useSession } from 'next-auth/react'
import { UserDropdown } from './UserDropdown'

export type AuthButtonProps = ButtonProps & { isMobile?: boolean }

export const AuthButton = ({ isMobile = false, ...props }: AuthButtonProps) => {
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

  if (isLoading)
    return (
      <Button {...props} disabled={true}>
        Loading
      </Button>
    )

  return session ? (
    <UserDropdown {...props} isMobile={isMobile} />
  ) : (
    <Button {...props} onClick={handleClick}>
      Sign in
    </Button>
  )
}
