import { beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'

vi.mock('@/lib/prisma', () => ({ default: {} }))
vi.mock('@/constants', () => ({
  SLUGIFY_OPTIONS: { lower: true, strict: true },
  CONTENT_FOLDER: 'content',
}))

// Two lessons that slugify to the same title ("Security") in different
// sections — the exact content shape behind the production incident.
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

import { buildContentIndex } from '@/lib/content-identity'
import { computeStale } from './prune-stale-content'

describe('prune stale decision (content -> validIds -> computeStale)', () => {
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

  it('does NOT prune two same-titled lessons that both exist in content (regression)', () => {
    const { validIds } = buildContentIndex('content')

    // A DB row for each "Security" lesson, keyed by its stable contentId. Before
    // the fix, validIds.lesson dropped one of these, so the prune flagged a real
    // lesson stale and cascade-deleted it and its problems.
    const rows = [
      { id: 'db-advanced', contentId: '/course/advanced/security' },
      { id: 'db-frontend', contentId: '/course/frontend/security' },
    ]

    expect(computeStale(rows, validIds.lesson)).toEqual([])
  })

  it('does prune a row whose contentId the content no longer defines', () => {
    const { validIds } = buildContentIndex('content')

    const rows = [
      { id: 'keep', contentId: '/course/advanced/security' },
      { id: 'stale', contentId: '/course/removed/gone' },
    ]

    expect(computeStale(rows, validIds.lesson)).toEqual(['stale'])
  })

  it('prunes a row that never got a contentId', () => {
    const { validIds } = buildContentIndex('content')

    expect(
      computeStale([{ id: 'orphan', contentId: null }], validIds.lesson),
    ).toEqual(['orphan'])
  })
})
