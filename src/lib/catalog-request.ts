// RSC consumers only. Keep React request caching out of the Node CLI services.
import { cache } from 'react'
import { getPublicCatalogStats } from '@/services/catalog-stats'
import { getActiveCoursesWithProgress } from '@/services/course'
import { getProblems } from '@/services/problem'
import { reportErrorSafely } from '@/lib/sentry'
import {
  CatalogStatsResult,
  catalogStatsUnavailable,
  parseCatalogStats,
} from '@/types/catalog-stats'

export const getCatalogStatsSnapshot = cache(
  async (): Promise<CatalogStatsResult> => {
    try {
      const stats = parseCatalogStats(await getPublicCatalogStats())
      if (!stats) throw new Error('Invalid catalog count snapshot')
      return { status: 'available', stats }
    } catch (error) {
      reportErrorSafely(error, { feature: 'catalog', action: 'read-counts' })
      return catalogStatsUnavailable
    }
  },
)

export const getCoursesSnapshot = cache(async () => {
  try {
    const courses = await getActiveCoursesWithProgress()
    const stats = {
      courses: courses.length,
      lessons: courses.reduce(
        (sum, course) => sum + course.metadata.lessons.total,
        0,
      ),
      problems: courses.reduce(
        (sum, course) => sum + course.metadata.problems.total,
        0,
      ),
    }
    return { status: 'available' as const, courses, stats }
  } catch (error) {
    reportErrorSafely(error, { feature: 'catalog', action: 'read-courses' })
    return { status: 'unavailable' as const }
  }
})

// No filter object: metadata and the table must share one unfiltered user-aware read.
export const getProblemBankSnapshot = cache(() => getProblems())
