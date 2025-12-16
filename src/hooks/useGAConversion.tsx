'use client'

import { sendGAEvent } from '@next/third-parties/google'
import { useCallback } from 'react'

export function useGAConversion() {
  const reportConversion = useCallback((stripeSessionId: string) => {
    sendGAEvent({
      event: 'conversion',
      send_to: 'AW-16659115277/bQ1KCJajgMcZEI3a14c-',
      value: 1.0,
      currency: 'EUR',
      transaction_id: stripeSessionId,
    })
  }, [])

  return reportConversion
}
