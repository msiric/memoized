export type NavigationPage = {
  title: string
  href: string
}

export type NavigationSection = NavigationPage & {
  lessons: NavigationPage[]
}

export function getLessonNavigation(
  sections: NavigationSection[],
  sectionIndex: number,
  lessonIndex: number,
): { previousPage: NavigationPage | null; nextPage: NavigationPage | null } {
  const section = sections[sectionIndex]
  if (!section?.lessons[lessonIndex]) {
    return { previousPage: null, nextPage: null }
  }

  return {
    previousPage: lessonIndex === 0 ? section : section.lessons[lessonIndex - 1],
    nextPage: section.lessons[lessonIndex + 1] ?? sections[sectionIndex + 1] ?? null,
  }
}
