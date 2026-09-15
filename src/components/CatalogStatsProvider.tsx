'use client'

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  CatalogStatsResult,
  catalogStatsUnavailable,
  parseCatalogStatsResult,
} from '@/types/catalog-stats'

type CatalogStatsState = CatalogStatsResult | { status: 'loading' }

const CatalogStatsContext = createContext<CatalogStatsState>(
  catalogStatsUnavailable,
)

/** Homepage-only: no ISR-seeded counts and no cross-page/global persistent cache. */
export function CatalogStatsProvider({ children }: { children?: ReactNode }) {
  const [state, setState] = useState<CatalogStatsState>({ status: 'loading' })

  useEffect(() => {
    let revision = 0
    let controller: AbortController | undefined

    const refresh = async () => {
      const current = ++revision
      controller?.abort()
      controller = new AbortController()
      setState({ status: 'loading' })
      try {
        const response = await fetch('/api/catalog-stats', {
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        })
        const result = response.ok
          ? parseCatalogStatsResult(await response.json())
          : catalogStatsUnavailable
        if (revision === current) setState(result)
      } catch {
        if (revision === current) setState(catalogStatsUnavailable)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void refresh()
    }

    void refresh()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      revision++
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  return (
    <CatalogStatsContext.Provider value={state}>
      {children}
    </CatalogStatsContext.Provider>
  )
}

export const useCatalogStats = () => useContext(CatalogStatsContext)
