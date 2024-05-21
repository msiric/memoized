import { navigation } from '@/components/Navigation'
import { usePathname } from 'next/navigation'

export const usePages = () => {
  const pathname = usePathname()

  const currentSectionIndex = navigation.findIndex((section) =>
    section.links.some((page) => page.href === pathname),
  )

  if (currentSectionIndex === -1) {
    return {}
  }

  const currentSection = navigation[currentSectionIndex]
  const allPagesInSection = currentSection.links
  const currentPageIndex = allPagesInSection.findIndex(
    (page) => page.href === pathname,
  )

  if (currentPageIndex === -1) {
    return {}
  }

  const previousPage = allPagesInSection[currentPageIndex - 1]
  const currentPage = allPagesInSection[currentPageIndex]
  const nextPage = allPagesInSection[currentPageIndex + 1]

  const isEndOfSection = currentPageIndex === allPagesInSection.length - 1
  const isEndOfCourse =
    currentSectionIndex === navigation.length - 1 && isEndOfSection

  const previousSection = navigation[currentSectionIndex - 1]
  const nextSection = navigation[currentSectionIndex + 1]

  return {
    previousPage,
    currentPage,
    nextPage,
    isEndOfSection,
    isEndOfCourse,
    previousSection,
    nextSection,
  }
}
