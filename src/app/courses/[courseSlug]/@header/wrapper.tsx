'use client'

import { Header } from '@/components/Header'
import { useProgressInitialization } from '@/hooks/useProblemCompletion'
import type { ProgressSnapshotResult } from '@/types/progress'
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
  progressData?: ProgressSnapshotResult
  completedLessons?: string[]
  completedProblems?: string[]
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  courseSlug,
  userData,
  progressData,
  fullCurriculum,
  allLessons,
  allProblems,
}: LayoutProps) {
  useProgressInitialization(progressData, userData)
  const updateContent = useContentStore((state) => state.updateContent)

  const currentCourse = fullCurriculum?.find((item) => item.slug === courseSlug)

  const navigation = curriculumToNavigation(currentCourse)

  useEffect(() => {
    updateContent(
      undefined,
      undefined,
      fullCurriculum,
      allLessons,
      allProblems,
    )
  }, [
    updateContent,
    allLessons,
    fullCurriculum,
    allProblems,
  ])

  return <Header navigation={navigation} />
}
