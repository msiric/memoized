import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'

vi.mock('@/constants', () => ({
  SLUGIFY_OPTIONS: { lower: true, strict: true },
}))

// Two sections in DIFFERENT courses share the title "Introduction" — the
// section-level analogue of the lesson "Security" collision. Their slugs
// collide, so section identity must key on the (course-qualified) contentId,
// never the slug, or the prune would treat one as stale and cascade-delete a
// real section, its lessons and their problems.
vi.mock('@/constants/curriculum', () => ({
  completeCurriculum: [
    {
      id: '/course-a',
      title: 'Course A',
      sections: [{ id: '/introduction', title: 'Introduction' }],
    },
    {
      id: '/course-b',
      title: 'Course B',
      sections: [{ id: '/introduction', title: 'Introduction' }],
    },
  ],
}))

vi.mock('fs')

import { buildContentIndex, validContentIds } from './content-identity'

describe('content-identity (section slug collision)', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      const s = String(p)
      if (s.includes('/course-a/')) {
        return JSON.stringify({
          lessons: [
            {
              id: '/basics',
              title: 'Basics',
              problems: [{ id: 'a-p', title: 'A Problem' }],
            },
          ],
        })
      }
      if (s.includes('/course-b/')) {
        return JSON.stringify({
          lessons: [
            {
              id: '/basics',
              title: 'Basics',
              problems: [{ id: 'b-p', title: 'B Problem' }],
            },
          ],
        })
      }
      return '{}'
    }) as any
  })

  it('keeps BOTH same-titled sections in the valid set (regression: slug collision must not drop a section)', () => {
    const { maps, validIds } = buildContentIndex('content')

    // The slug -> contentId map collides (last course wins). This is the
    // documented limitation of `maps`; it must never be used to decide validity.
    expect(maps.section['introduction']).toBe('/course-b/introduction')

    // The valid set keeps BOTH, because contentIds are course-qualified and
    // unique. Dropping one here is what would let the prune cascade-delete a
    // real section (and everything under it).
    expect(validIds.section.has('/course-a/introduction')).toBe(true)
    expect(validIds.section.has('/course-b/introduction')).toBe(true)
    expect(validIds.section.size).toBe(2)
  })

  it('keeps lessons under colliding sections distinct and complete', () => {
    const ids = validContentIds('content')

    // Same section slug + same lesson slug across courses must not collapse.
    expect(ids.lesson.has('/course-a/introduction/basics')).toBe(true)
    expect(ids.lesson.has('/course-b/introduction/basics')).toBe(true)
    expect(ids.lesson.size).toBe(2)

    expect(ids.problem.has('/course-a/introduction/basics/a-p')).toBe(true)
    expect(ids.problem.has('/course-b/introduction/basics/b-p')).toBe(true)
    expect(ids.problem.size).toBe(2)
  })
})
