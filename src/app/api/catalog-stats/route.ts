import { NextResponse } from 'next/server'
import { getPublicCatalogStats } from '@/services/catalog-stats'
import { reportErrorSafely } from '@/lib/sentry'
import {
  catalogStatsUnavailable,
  parseCatalogStats,
} from '@/types/catalog-stats'

export const dynamic = 'force-dynamic'

const headers = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const stats = parseCatalogStats(await getPublicCatalogStats())
    if (!stats) throw new Error('Invalid catalog count snapshot')
    return NextResponse.json({ status: 'available', stats }, { headers })
  } catch (error) {
    reportErrorSafely(error, { feature: 'catalog', action: 'public-counts' })
    return NextResponse.json(catalogStatsUnavailable, { status: 503, headers })
  }
}
