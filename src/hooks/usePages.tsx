import { useProgressStore } from '@/contexts/progress'
import { usePathname } from 'next/navigation'

export const usePages = () => {
  const pathname = usePathname()
  const fullCurriculum = useProgressStore((state) => state.fullCurriculum)

  const courseSections = fullCurriculum[0]?.sections ?? []

  const currentSectionIndex = courseSections.findIndex((section) =>
    section.lessons.some((lesson) => lesson.href === pathname),
  )

  if (currentSectionIndex === -1) {
    return {}
  }

  const currentSection = courseSections[currentSectionIndex]
  const allPagesInSection = currentSection.lessons
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
    currentSectionIndex === courseSections.length - 1 && isEndOfSection

  const previousSection = courseSections[currentSectionIndex - 1]
  const nextSection = courseSections[currentSectionIndex + 1]

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
