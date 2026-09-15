/**
 * Source/release baseline for the ordinary catalog verifier and publisher.
 * Not a learner-facing active count or a fallback when a database read fails.
 * Live public counts come from the committed catalog; list pages use their
 * loaded snapshot. An additive release validates its own explicit manifests.
 *
 * These are guarded against the real content, not trusted blindly:
 *  - content-stats.test.ts asserts the structural counts (courses, sections)
 *    against the committed `completeCurriculum`, so app CI catches drift there.
 *  - verify-content-stats.ts asserts ALL counts against the actual content files
 *    via the same identity walk the prune uses. An admitted additive release
 *    validates its separate base/candidate/recovery manifests without changing
 *    this ordinary baseline or weakening the shape-preserving release checks.
 *
 * Do not advance this baseline merely because a new task is proposed/prepared.
 */
export const CONTENT_STATS = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
} as const

export type ContentStats = { [Key in keyof typeof CONTENT_STATS]: number }
