/**
 * Single source of truth for the headline content counts shown across the app
 * (landing page, /premium, /courses, and SEO metadata). One place, exact
 * numbers — so the same figure is never hardcoded (and never drifts) across the
 * ~dozen surfaces that cite it.
 *
 * These are guarded against the real content, not trusted blindly:
 *  - content-stats.test.ts asserts the structural counts (courses, sections)
 *    against the committed `completeCurriculum`, so app CI catches drift there.
 *  - verify-content-stats.ts asserts ALL counts against the actual content files
 *    via the same identity walk the prune uses; the content sync runs it before
 *    deploying, so adding/removing a lesson or problem without updating this
 *    constant fails the sync instead of silently shipping a wrong number.
 *
 * When the curriculum changes, update these numbers (the guards tell you the
 * expected values).
 */
export const CONTENT_STATS = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
} as const

export type ContentStats = typeof CONTENT_STATS
