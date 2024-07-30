'use client'

import { usePathname } from 'next/navigation'

export const useNavigationLinks = (
  options = [
    { title: 'Problems', href: '/problems' },
    { title: 'Course', href: '/course' },
    { title: 'Resources', href: '/resources' },
  ],
) => {
  const pathname = usePathname()

  return options.filter((option) => !pathname.startsWith(option.href))
}
