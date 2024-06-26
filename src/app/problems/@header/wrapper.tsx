'use client'

import { Header } from '@/components/Header'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  completedLessons?: string[]
  completedProblems?: string[]
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  userData,
  completedLessons,
  completedProblems,
  fullCurriculum,
  allLessons,
  allProblems,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const initializeContent = useContentStore((state) => state.initializeContent)

  useEffect(() => {
    initializeContent(
      completedLessons ?? [],
      completedProblems ?? [],
      fullCurriculum ?? [],
      allLessons ?? [],
      allProblems ?? [],
    )
    setUser(userData ?? null)
  }, [
    completedLessons,
    initializeContent,
    allLessons,
    fullCurriculum,
    setUser,
    userData,
    completedProblems,
    allProblems,
  ])

  return <Header fullWidth={true} fullCurriculum={fullCurriculum} />
}
