import { Button, ButtonProps } from '@/components/Button'
import { useAuthStore } from '@/contexts/auth'
import { signOut, useSession } from 'next-auth/react'

export type AuthButtonProps = ButtonProps

export const AuthButton = (props: AuthButtonProps) => {
  const openModal = useAuthStore((state) => state.openModal)

  const { data: session } = useSession()

  const isLoading = session === undefined

  const handleClick = () => {
    if (session) {
      signOut()
    } else {
      openModal()
    }
  }

  return (
    <Button {...props} onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Loading' : session ? 'Sign out' : 'Sign in'}
    </Button>
  )
}
