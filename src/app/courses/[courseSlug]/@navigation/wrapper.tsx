'use client'

import { Navigation } from '@/components/Navigation'
import { useContentStore } from '@/contexts/progress'
import {
  Curriculum,
  LessonConfig,
  ProblemConfig,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { curriculumToNavigation } from '@/utils/helpers'
import { useEffect } from 'react'
import { useCourseSlug } from '../../../../hooks/useCourseSlug'

export type LayoutProps = {
  courseSlug: string
  userData?: UserWithSubscriptionsAndProgress | null
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({
  fullCurriculum,
  allLessons,
  allProblems,
}: LayoutProps) {
  const courseSlug = useCourseSlug()

  const updateContent = useContentStore((state) => state.updateContent)

  const currentCourse = fullCurriculum?.find((item) => item.slug === courseSlug)

  const navigation = curriculumToNavigation(currentCourse)

  useEffect(() => {
    updateContent(undefined, undefined, fullCurriculum, allLessons, allProblems)
  }, [
    updateContent,
    allLessons,
    fullCurriculum,
    allProblems,
  ])

  if (!courseSlug) return null

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
