'use client'

import { Navigation } from '@/components/Navigation'
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
  resourceList?: LessonWithResourcesAndProblems[]
}

export function Wrapper({ userData, resourceList }: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = resourcesToNavigation(resourceList)

  useEffect(() => {
    updateContent(undefined, undefined)
    setUser(userData ?? null)
  }, [updateContent, setUser, userData])

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
