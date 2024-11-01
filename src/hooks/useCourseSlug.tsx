'use client'

import { usePathname } from 'next/navigation'
import { COURSES_PREFIX } from '../constants'

export const useCourseSlug = (): string | null => {
  const pathname = usePathname()

  if (!pathname.startsWith(COURSES_PREFIX)) {
    return null
  }

  const path = pathname.replace(COURSES_PREFIX, '').split('/')

  const courseSlug = path.find((segment) => segment.length > 0)

  return courseSlug || null
}
