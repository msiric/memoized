'use client'

import { signOut as nextAuthSignOut } from 'next-auth/react'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'

export const useSignOut = () => {
  const signOut = () => {
    useContentStore.getState().setProgressOwner(null)
    useAuthStore.getState().setUser(null)
    nextAuthSignOut()
  }

  return { signOut }
}
