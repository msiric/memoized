import { NextResponse } from 'next/server'
import { buildVizManifest } from '@/components/visualizations/registry'

// The app-before-content contract (VIZ-01 spec §6.6): content CI fetches the
// production manifest and fails on any unknown `<Viz id preset>`. Built once
// at build time; it changes only when the app ships new visuals.
export const dynamic = 'force-static'

export function GET() {
  return NextResponse.json(buildVizManifest(), {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
