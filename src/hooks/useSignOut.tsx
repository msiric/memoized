import { signOut as nextAuthSignOut } from 'next-auth/react'

export const useSignOut = () => {
  const signOut = () => {
    nextAuthSignOut()
  }

  return { signOut }
}
