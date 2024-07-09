'use client'

import { COURSE_PREFIX } from '@/constants'
import { useContentStore } from '@/contexts/progress'
import { LessonResult, SectionResult } from '@/types'
import { usePathname } from 'next/navigation'

export const usePages = () => {
  const pathname = usePathname()
  const fullCurriculum = useContentStore((state) => state.fullCurriculum)
  const courseSections = fullCurriculum[0]?.sections ?? []

  const isIntroduction = pathname === COURSE_PREFIX

  if (isIntroduction) {
    return {
      isIntroduction,
      previousPage: null,
      currentPage: null,
      nextPage: courseSections[0],
    }
  }

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

  let previousPage: LessonResult | SectionResult | null = null
  let currentPage: LessonResult | SectionResult | null = null
  let nextPage: LessonResult | SectionResult | null = null

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
    isIntroduction,
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
