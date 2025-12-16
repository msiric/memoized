'use client'

import { usePathname } from 'next/navigation'
import { COURSES_PREFIX, PROBLEMS_PREFIX, RESOURCES_PREFIX } from '../constants'

export const useNavigationLinks = (
  options = [
    { title: 'Problems', href: PROBLEMS_PREFIX },
    { title: 'Courses', href: COURSES_PREFIX},
    { title: 'Resources', href: RESOURCES_PREFIX },
  ],
) => {
  const pathname = usePathname()

  return options.filter((option) => !pathname.startsWith(option.href))
}
