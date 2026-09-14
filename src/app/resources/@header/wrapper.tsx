'use client'

import { Header } from '@/components/Header'
import { useProgressInitialization } from '@/hooks/useProblemCompletion'
import type { ProgressSnapshotResult } from '@/types/progress'
import {
  LessonWithResourcesAndProblems,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { resourcesToNavigation } from '@/utils/helpers'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  progressData?: ProgressSnapshotResult
  completedLessons?: string[]
  completedProblems?: string[]
  resourceList?: LessonWithResourcesAndProblems[]
}

export function Wrapper({
  userData,
  progressData,
  resourceList,
}: LayoutProps) {
  useProgressInitialization(progressData, userData)

  const navigation = resourcesToNavigation(resourceList)

  return <Header navigation={navigation} />
}
