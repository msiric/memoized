'use client'

import { useSitePathname } from '@/hooks/useSitePathname'

export const useIsCourseRoute = (): boolean => {
  const pathname = useSitePathname()
  return pathname.startsWith('/course')
}
