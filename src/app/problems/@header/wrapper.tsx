'use client'

import { Header } from '@/components/Header'
import { useProgressInitialization } from '@/hooks/useProblemCompletion'
import type { ProgressSnapshotResult } from '@/types/progress'
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
  progressData?: ProgressSnapshotResult
  completedLessons?: string[]
  completedProblems?: string[]
  problemList?: LessonWithProblems[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  userData,
  progressData,
  problemList,
  allLessons,
  allProblems,
}: LayoutProps) {
  useProgressInitialization(progressData, userData)
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = problemListToNavigation(problemList)

  useEffect(() => {
    updateContent(
      undefined,
      undefined,
      undefined,
      allLessons,
      allProblems,
    )
  }, [
    updateContent,
    allLessons,
    allProblems,
  ])

  return <Header navigation={navigation} />
}
