'use client'

import { useContentStore } from '@/contexts/progress'
import { LessonResult, SectionResult } from '@/types'
import { AccessOptions } from '@prisma/client'
import { usePathname } from 'next/navigation'
import { useCourseSlug } from './useCourseSlug'

export const usePages = () => {
  const pathname = usePathname()
  const fullCurriculum = useContentStore((state) => state.fullCurriculum)

  const courseSlug = useCourseSlug()

  const currentCourse = fullCurriculum?.find((item) => item.slug === courseSlug)

  const courseSections = currentCourse?.sections ?? []

  const isIntroduction = pathname === currentCourse?.href

  const introPage = {
    ...currentCourse,
    access: AccessOptions.FREE,
  } as LessonResult

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

  const isFirstSection = pathname === courseSections[0].href
  const isStartOfSection = pathname === currentSection.href
  const isEndOfSection = currentPageIndex === allPagesInSection.length - 1
  const isEndOfCourse =
    currentSectionIndex === courseSections.length - 1 && isEndOfSection

  const previousSection = courseSections[currentSectionIndex - 1] || null
  const nextSection = courseSections[currentSectionIndex + 1] || null

  if (isFirstSection) {
    // We are at the first section of the course
    previousPage = introPage
    currentPage = courseSections[0] || null
    nextPage = courseSections[0]?.lessons?.[0] || null
  } else if (pathname === currentSection.href) {
    // We are at the section intro page
    previousPage =
      courseSections[currentSectionIndex - 1]?.lessons?.at(-1) || null
    currentPage = currentSection
    nextPage = allPagesInSection[0] || null
  } else if (currentPageIndex !== -1) {
    // We are within a lesson in the section
    previousPage =
      currentPageIndex === 0
        ? currentSection
        : allPagesInSection[currentPageIndex - 1] || null
    currentPage = allPagesInSection[currentPageIndex]
    nextPage = isEndOfSection
      ? nextSection
      : allPagesInSection[currentPageIndex + 1] || null
  }

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
