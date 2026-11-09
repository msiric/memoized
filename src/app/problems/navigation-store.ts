'use client'

import { NavigationContent } from '@/types'
import { create } from 'zustand'

// The /problems sidebar slot receives the navigation tree once and shares it
// with the header's mobile menu, so the tree is not serialized into the page twice.
export const useProblemNavigationStore = create<{
  navigation?: NavigationContent
  setNavigation: (navigation?: NavigationContent) => void
}>((set) => ({
  navigation: undefined,
  setNavigation: (navigation) => set({ navigation }),
}))
