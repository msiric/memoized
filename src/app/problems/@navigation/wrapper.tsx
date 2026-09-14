'use client'

import { Navigation } from '@/components/Navigation'
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
  problemList,
  allLessons,
  allProblems,
}: LayoutProps) {
  const updateContent = useContentStore((state) => state.updateContent)

  const navigation = problemListToNavigation(problemList)

  useEffect(() => {
    updateContent(undefined, undefined, undefined, allLessons, allProblems)
  }, [updateContent, allLessons, allProblems])

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
