'use client'

import { useCatalogStats } from './CatalogStatsProvider'
import { StatCard } from './StatCard'

export function CatalogProblemStat() {
  const result = useCatalogStats()
  return (
    <div role="status" aria-busy={result.status === 'loading'}>
      <StatCard
        value={result.status === 'available' ? result.stats.problems : '—'}
        label={
          result.status === 'available'
            ? 'JS Problems'
            : result.status === 'loading'
              ? 'Loading problem count…'
              : 'Problem count unavailable'
        }
        variant="lime"
      />
    </div>
  )
}
