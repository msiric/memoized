import { describe, expect, it } from 'vitest'
import { CONTENT_STATS } from './content-stats'
import { completeCurriculum } from './curriculum'

/**
 * App-CI guard: the premium content files are gitignored and absent in CI, so
 * lessons/problems/resources are verified against the real content in the
 * content sync (verify-content-stats.ts). Here we assert the counts that ARE
 * derivable from committed data — courses and sections come straight from
 * `completeCurriculum` — so an edit to the curriculum that forgets to update
 * CONTENT_STATS fails app CI immediately.
 */
describe('CONTENT_STATS', () => {
  it('courses matches the committed curriculum', () => {
    expect(CONTENT_STATS.courses).toBe(completeCurriculum.length)
  })

  it('sections matches the committed curriculum', () => {
    const sections = completeCurriculum.reduce(
      (total, course) => total + course.sections.length,
      0,
    )
    expect(CONTENT_STATS.sections).toBe(sections)
  })
})
