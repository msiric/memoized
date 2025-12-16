'use client'

import { Navigation } from '@/components/Navigation'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import {
  LessonConfig,
  LessonWithProblems,
  ProblemConfig,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { problemListToNavigation } from '@/utils/helpers'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  problemList?: LessonWithProblems[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  userData,
  problemList,
  allLessons,
  allProblems,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = problemListToNavigation(problemList)

  useEffect(() => {
    updateContent(undefined, undefined, undefined, allLessons, allProblems)
    setUser(userData ?? null)
  }, [updateContent, allLessons, setUser, userData, allProblems])

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
