'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { GoogleAnalytics as GoogleTag } from '@next/third-parties/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { productionAnalyticsAllowed } from '@/lib/analytics'
import { WebVitals } from './WebVitals'

export function SiteAnalytics() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    setEnabled(productionAnalyticsAllowed(window.location.hostname))
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
      {/* Preserve the existing Ads destination; this is not a configured GA4 property. */}
      <GoogleTag gaId="AW-16659115277" />
    </>
  )
}
