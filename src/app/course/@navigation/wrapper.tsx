'use client'

import { Navigation } from '@/components/Navigation'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { Curriculum, LessonConfig, ProblemConfig } from '@/types'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  userData,
  fullCurriculum,
  allLessons,
  allProblems,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  useEffect(() => {
    updateContent(undefined, undefined, fullCurriculum, allLessons, allProblems)
    setUser(userData ?? null)
  }, [
    updateContent,
    allLessons,
    fullCurriculum,
    setUser,
    userData,
    allProblems,
  ])

  return (
    <Navigation
      fullCurriculum={fullCurriculum}
      className="hidden lg:mt-10 lg:block"
    />
  )
}
