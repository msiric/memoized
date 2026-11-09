'use client'

import { Header } from '@/components/Header'
import { useProgressInitialization } from '@/hooks/useProblemCompletion'
import type { ProgressSnapshotResult } from '@/types/progress'
import { UserWithSubscriptionsAndProgress } from '@/types'
import { useProblemNavigationStore } from '../navigation-store'

export type LayoutProps = {
  userData?: UserWithSubscriptionsAndProgress | null
  progressData?: ProgressSnapshotResult
}

// Catalog totals and the navigation tree arrive once, through the sidebar slot.
export function Wrapper({ userData, progressData }: LayoutProps) {
  useProgressInitialization(progressData, userData)
  // Mobile menu only; populated by the sidebar slot after hydration.
  const navigation = useProblemNavigationStore((state) => state.navigation)

  return <Header navigation={navigation} />
}
