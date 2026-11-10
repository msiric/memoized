'use client'

import { GOOGLE_ADS_CONVERSION, gtag } from '@/lib/google-ads'
import { useCallback } from 'react'

export function useGAConversion() {
  const reportConversion = useCallback((stripeSessionId: string) => {
    // Google's documented Ads conversion call. The previous
    // sendGAEvent({ event: 'conversion', ... }) queued a bare object, which
    // gtag.js does not treat as an event command.
    gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_CONVERSION,
      value: 1.0,
      currency: 'EUR',
      transaction_id: stripeSessionId,
    })
  }, [])

  return reportConversion
}
