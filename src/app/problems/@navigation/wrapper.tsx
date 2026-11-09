'use client'

import { Navigation } from '@/components/Navigation'
import { useContentStore } from '@/contexts/progress'
import { NavigationContent, ProblemConfig } from '@/types'
import { useEffect } from 'react'
import { useProblemNavigationStore } from '../navigation-store'

export type LayoutProps = {
  navigation?: NavigationContent
  allLessons?: ProblemConfig[]
  allProblems?: ProblemConfig[]
}

export function Wrapper({ navigation, allLessons, allProblems }: LayoutProps) {
  const updateContent = useContentStore((state) => state.updateContent)
  const setNavigation = useProblemNavigationStore((state) => state.setNavigation)

  useEffect(() => {
    setNavigation(navigation)
  }, [setNavigation, navigation])

  useEffect(() => {
    updateContent(undefined, undefined, undefined, allLessons, allProblems)
  }, [updateContent, allLessons, allProblems])

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
