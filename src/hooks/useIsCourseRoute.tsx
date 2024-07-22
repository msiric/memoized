'use client'

import { usePathname } from 'next/navigation'

export const useIsCourseRoute = (): boolean => {
  const pathname = usePathname()
  return pathname.startsWith('/course')
}
