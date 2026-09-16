export type CatalogStats = {
  courses: number
  sections: number
  lessons: number
  problems: number
  resources: number
}

export type CatalogStatsResult =
  | { status: 'available'; stats: CatalogStats }
  | { status: 'unavailable'; code: 'CATALOG_STATS_UNAVAILABLE' }

export const catalogStatsUnavailable = {
  status: 'unavailable',
  code: 'CATALOG_STATS_UNAVAILABLE',
} as const satisfies CatalogStatsResult

/** Validate and copy only public scalar fields, never forward a database object. */
export function parseCatalogStats(value: unknown): CatalogStats | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const stats = value as Record<string, unknown>
  const keys = [
    'courses',
    'sections',
    'lessons',
    'problems',
    'resources',
  ] as const
  if (
    keys.some(
      (key) =>
        typeof stats[key] !== 'number' ||
        !Number.isSafeInteger(stats[key]) ||
        (stats[key] as number) < 0,
    )
  )
    return null

  const { courses, sections, lessons, problems, resources } =
    stats as CatalogStats
  if (
    (!courses && sections) ||
    (!sections && lessons) ||
    (!lessons && problems)
  ) {
    return null
  }

  return { courses, sections, lessons, problems, resources }
}

export function parseCatalogStatsResult(value: unknown): CatalogStatsResult {
  if (
    value &&
    typeof value === 'object' &&
    'status' in value &&
    value.status === 'available' &&
    'stats' in value
  ) {
    const stats = parseCatalogStats(value.stats)
    if (stats) return { status: 'available', stats }
  }
  return catalogStatsUnavailable
}
