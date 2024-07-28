'use client'

import { usePathname } from 'next/navigation'

export const useNavigationLinks = (
  options = [
    { title: 'Problems', href: '/problems' },
    { title: 'Course', href: '/course' },
  ],
) => {
  const pathname = usePathname()

  return options.filter((option) => option.href !== pathname)
}
