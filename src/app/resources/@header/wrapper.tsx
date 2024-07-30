'use client'

import { Header } from '@/components/Header'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { resourcesToNavigation } from '@/utils/helpers'
import { Resource } from '@prisma/client'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  completedLessons?: string[]
  completedProblems?: string[]
  resources?: Resource[]
}

export function Wrapper({
  userData,
  completedLessons,
  completedProblems,
  resources,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = resourcesToNavigation(resources)

  useEffect(() => {
    updateContent(completedLessons, completedProblems)
    setUser(userData ?? null)
  }, [completedLessons, updateContent, setUser, userData, completedProblems])

  return <Header navigation={navigation} />
}
