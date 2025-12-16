'use client'

import { Header } from '@/components/Header'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import {
  LessonWithResourcesAndProblems,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { resourcesToNavigation } from '@/utils/helpers'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  completedLessons?: string[]
  completedProblems?: string[]
  resourceList?: LessonWithResourcesAndProblems[]
}

export function Wrapper({
  userData,
  completedLessons,
  completedProblems,
  resourceList,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = resourcesToNavigation(resourceList)

  useEffect(() => {
    updateContent(completedLessons, completedProblems)
    setUser(userData ?? null)
  }, [completedLessons, updateContent, setUser, userData, completedProblems])

  return <Header navigation={navigation} />
}
