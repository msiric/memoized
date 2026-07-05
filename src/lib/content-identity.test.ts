import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'

vi.mock('@/constants', () => ({
  SLUGIFY_OPTIONS: { lower: true, strict: true },
}))

// Two lessons in different sections share the title "Security" — the exact
// shape that caused the production data loss (their slugs collide).
vi.mock('@/constants/curriculum', () => ({
  completeCurriculum: [
    {
      id: '/course',
      title: 'Course',
      sections: [
        { id: '/advanced', title: 'Advanced Concepts' },
        { id: '/frontend', title: 'Frontend Development' },
      ],
    },
  ],
}))

vi.mock('fs')

import { buildContentIndex, validContentIds } from './content-identity'

describe('content-identity', () => {
  beforeEach(() => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
      const s = String(p)
      if (s.includes('/advanced/')) {
        return JSON.stringify({
          lessons: [
            {
              id: '/security',
              title: 'Security',
              problems: [{ id: 'xss', title: 'XSS' }],
            },
          ],
        })
      }
      if (s.includes('/frontend/')) {
        return JSON.stringify({
          lessons: [
            {
              id: '/security',
              title: 'Security',
              problems: [{ id: 'sqli', title: 'SQL Injection' }],
            },
          ],
        })
      }
      return '{}'
    }) as any
  })

  it('keeps BOTH same-titled lessons in the valid set (regression: slug collision must not drop a lesson)', () => {
    const { maps, validIds } = buildContentIndex('content')

    // The slug -> contentId map collides (last section wins). This is the
    // documented limitation of `maps`; it must never be used to decide validity.
    expect(maps.lesson['security']).toBe('/course/frontend/security')

    // The valid set keeps BOTH, because contentIds are unique. Losing one here
    // is what let the prune cascade-delete a real lesson and its problems.
    expect(validIds.lesson.has('/course/advanced/security')).toBe(true)
    expect(validIds.lesson.has('/course/frontend/security')).toBe(true)
    expect(validIds.lesson.size).toBe(2)
  })

  it('validContentIds returns the complete problem set across colliding lessons', () => {
    const ids = validContentIds('content')

    expect(ids.problem.has('/course/advanced/security/xss')).toBe(true)
    expect(ids.problem.has('/course/frontend/security/sqli')).toBe(true)
    expect(ids.problem.size).toBe(2)
  })

  it('always treats the intro resource as valid', () => {
    const ids = validContentIds('content')
    expect(ids.resource.has('intro')).toBe(true)
  })
})
