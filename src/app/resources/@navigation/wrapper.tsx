'use client'

import { Navigation } from '@/components/Navigation'
import {
  LessonWithResourcesAndProblems,
  UserWithSubscriptionsAndProgress,
} from '@/types'
import { resourcesToNavigation } from '@/utils/helpers'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  resourceList?: LessonWithResourcesAndProblems[]
}

export function Wrapper({ resourceList }: LayoutProps) {
  const navigation = resourcesToNavigation(resourceList)

  return (
    <Navigation navigation={navigation} className="hidden lg:mt-10 lg:block" />
  )
}
