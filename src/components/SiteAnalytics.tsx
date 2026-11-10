'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { productionAnalyticsAllowed } from '@/lib/analytics'
import { GOOGLE_ADS_SCRIPT_SRC, initGoogleAds } from '@/lib/google-ads'
import { WebVitals } from './WebVitals'

export function SiteAnalytics() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const allowed = productionAnalyticsAllowed(window.location.hostname)
    if (allowed) initGoogleAds()
    setEnabled(allowed)
  }, [])
  if (!enabled) return null
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <WebVitals />
      <Script
        src="https://cloud.umami.is/script.js"
        data-website-id="8573b390-8d88-4b52-b4b1-63ff2a5df61d"
        data-domains="memoized.io,www.memoized.io"
        data-exclude-search="true"
        data-exclude-hash="true"
        strategy="afterInteractive"
      />
      {/* Google Ads loads after the page has finished loading; commands
          queued before then are replayed. See src/lib/google-ads.ts. */}
      <Script
        id="google-ads"
        src={GOOGLE_ADS_SCRIPT_SRC}
        strategy="lazyOnload"
      />
    </>
  )
}
