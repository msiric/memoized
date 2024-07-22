'use client'

import { usePathname } from 'next/navigation'

function useIsCourseRoute(): boolean {
  const pathname = usePathname()
  return pathname.startsWith('/course')
}

export default useIsCourseRoute
