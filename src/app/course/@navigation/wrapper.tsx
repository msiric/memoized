'use client'

import { Navigation } from '@/components/Navigation'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import {
  Curriculum,
  LessonConfig,
  ProblemConfig,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { curriculumToNavigation } from '@/utils/helpers'
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

  const navigation = curriculumToNavigation(fullCurriculum?.[0])

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
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
