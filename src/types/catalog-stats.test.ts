import { describe, expect, it } from 'vitest'
import {
  catalogStatsUnavailable,
  parseCatalogStats,
  parseCatalogStatsResult,
} from './catalog-stats'

const baseline = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
}

describe('public catalog DTO', () => {
  it.each([506, 507])(
    'accepts the complete %i snapshot without a compiled fallback',
    (problems) => {
      const stats = { ...baseline, problems }
      expect(parseCatalogStats(stats)).toEqual(stats)
      expect(parseCatalogStatsResult({ status: 'available', stats })).toEqual({
        status: 'available',
        stats,
      })
    },
  )

  it('allows a genuinely empty catalog, including an independent intro resource', () => {
    const empty = {
      courses: 0,
      sections: 0,
      lessons: 0,
      problems: 0,
      resources: 1,
    }
    expect(parseCatalogStats(empty)).toEqual(empty)
  })

  it.each([
    undefined,
    null,
    [],
    {},
    -1,
    '506',
    NaN,
    Infinity,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects incomplete or non-count fields: %s', (problems) => {
    expect(parseCatalogStats({ ...baseline, problems })).toBeNull()
    expect(
      parseCatalogStatsResult({
        status: 'available',
        stats: { ...baseline, problems },
      }),
    ).toEqual(catalogStatsUnavailable)
  })

  it.each([
    { ...baseline, courses: 0 },
    { ...baseline, sections: 0 },
    { ...baseline, lessons: 0 },
  ])('rejects contradictory parent/child totals', (stats) => {
    expect(parseCatalogStats(stats)).toBeNull()
  })

  it.each([
    undefined,
    null,
    [],
    {},
    { status: 'available' },
    { status: 'unavailable' },
  ])(
    'turns missing or unavailable results into an explicit unavailable state',
    (value) => {
      expect(parseCatalogStatsResult(value)).toEqual(catalogStatsUnavailable)
    },
  )

  it('copies only the five public counts, discarding any extra fields', () => {
    expect(
      parseCatalogStatsResult({
        status: 'available',
        stats: {
          ...baseline,
          userId: 'private',
          body: 'paid',
          answer: 'private',
        },
        secret: 'private',
      }),
    ).toEqual({ status: 'available', stats: baseline })
  })
})
