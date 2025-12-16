'use client'

import { Header } from '@/components/Header'
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
  courseSlug: string
  userData?: UserWithSubscriptionsAndProgress | null
  completedLessons?: string[]
  completedProblems?: string[]
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  courseSlug,
  userData,
  completedLessons,
  completedProblems,
  fullCurriculum,
  allLessons,
  allProblems,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const updateContent = useContentStore((state) => state.updateContent)

  const currentCourse = fullCurriculum?.find((item) => item.slug === courseSlug)

  const navigation = curriculumToNavigation(currentCourse)

  useEffect(() => {
    updateContent(
      completedLessons,
      completedProblems,
      fullCurriculum,
      allLessons,
      allProblems,
    )
    setUser(userData ?? null)
  }, [
    completedLessons,
    updateContent,
    allLessons,
    fullCurriculum,
    setUser,
    userData,
    completedProblems,
    allProblems,
  ])

  return <Header navigation={navigation} />
}
