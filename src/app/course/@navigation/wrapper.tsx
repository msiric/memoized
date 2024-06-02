'use client'

import { Navigation } from '@/components/Navigation'
import { type Section } from '@/components/SectionProvider'
import { useAuthStore } from '@/contexts/auth'
import { useProgressStore } from '@/contexts/progress'
import { UserWithSubscriptionsAndProgress } from '@/services/user'
import { Curriculum, LessonConfig } from '@/types'
import { useEffect } from 'react'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  allSections?: Record<string, Array<Section>>
  completedLessons?: string[]
  fullCurriculum?: Curriculum[]
  allLessons?: LessonConfig[]
}

export function Wrapper({
  userData,
  completedLessons,
  fullCurriculum,
  allLessons,
}: LayoutProps) {
  const setUser = useAuthStore((state) => state.setUser)
  const initializeProgress = useProgressStore(
    (state) => state.initializeProgress,
  )

  useEffect(() => {
    initializeProgress(
      completedLessons ?? [],
      fullCurriculum ?? [],
      allLessons ?? [],
    )
    setUser(userData ?? null)
  }, [
    completedLessons,
    initializeProgress,
    allLessons,
    fullCurriculum,
    setUser,
    userData,
  ])

  return (
    <Navigation
      fullCurriculum={fullCurriculum}
      className="hidden lg:mt-10 lg:block"
    />
  )
}
