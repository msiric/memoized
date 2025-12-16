'use client'

import { Header } from '@/components/Header'
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
  completedLessons?: string[]
  completedProblems?: string[]
  problemList?: LessonWithProblems[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  userData,
  completedLessons,
  completedProblems,
  problemList,
  allLessons,
  allProblems,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = problemListToNavigation(problemList)

  useEffect(() => {
    updateContent(
      completedLessons,
      completedProblems,
      undefined,
      allLessons,
      allProblems,
    )
    setUser(userData ?? null)
  }, [
    completedLessons,
    updateContent,
    allLessons,
    setUser,
    userData,
    completedProblems,
    allProblems,
  ])

  return <Header navigation={navigation} />
}
