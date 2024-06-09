'use client'

import { useProgressStore } from '@/contexts/progress'
import { usePathname } from 'next/navigation'

export const usePages = () => {
  const pathname = usePathname()
  const fullCurriculum = useProgressStore((state) => state.fullCurriculum)

  const courseSections = fullCurriculum[0]?.sections ?? []

  // Find the current section
  const currentSectionIndex = courseSections.findIndex(
    (section) =>
      section.href === pathname ||
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

  let previousPage = null
  let currentPage = null
  let nextPage = null

  if (pathname === currentSection.href) {
    // We are at the section intro page
    currentPage = currentSection
    nextPage = allPagesInSection[0] || null
  } else if (currentPageIndex !== -1) {
    // We are within a lesson in the section
    previousPage =
      currentPageIndex === 0
        ? currentSection
        : allPagesInSection[currentPageIndex - 1] || null
    currentPage = allPagesInSection[currentPageIndex]
    nextPage = allPagesInSection[currentPageIndex + 1] || null
  }

  const isStartOfSection = pathname === currentSection.href
  const isEndOfSection = currentPageIndex === allPagesInSection.length - 1
  const isEndOfCourse =
    currentSectionIndex === courseSections.length - 1 && isEndOfSection

  const previousSection = courseSections[currentSectionIndex - 1] || null
  const nextSection = courseSections[currentSectionIndex + 1] || null

  return {
    previousPage,
    currentPage,
    nextPage,
    previousSection,
    currentSection,
    nextSection,
    isStartOfSection,
    isEndOfSection,
    isEndOfCourse,
  }
}
