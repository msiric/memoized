// RSC consumers only. The /problems header and sidebar slots share one read per
// request and send the client only what they render: a slim navigation tree and
// id-only totals for progress percentages.
import { cache } from 'react'
import { getUserProgressWithProblems } from '@/services/user'
import { NavigationContent } from '@/types'
import { problemListToNavigation } from '@/utils/helpers'

export const toSlimProblemNavigation = (
  navigation?: NavigationContent,
): NavigationContent | undefined =>
  navigation && {
    ...navigation,
    sections: navigation.sections.map((section) => ({
      ...section,
      description: null,
      // Only what NavLink renders; slug and description are never read.
      links: section.links?.map(({ id, title, href, order }) => ({
        id,
        title,
        href,
        order,
      })),
    })),
  }

export const getProblemNavigationSnapshot = cache(async (userId?: string) => {
  const data = await getUserProgressWithProblems(userId)
  return {
    user: data.user,
    progress: data.progress,
    navigation: toSlimProblemNavigation(
      problemListToNavigation(data.problemList),
    ),
    lessonIds: (data.lessons ?? []).map(({ id }) => ({ id })),
    problemIds: (data.problems ?? []).map(({ id }) => ({ id })),
  }
})
