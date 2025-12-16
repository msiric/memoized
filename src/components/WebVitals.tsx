'use client'

import { useEffect } from 'react'
import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals'
import { isDevelopment } from '../utils/helpers'

function sendToAnalytics(metric: Metric) {
  const developmentEnv = isDevelopment();
  
  if (developmentEnv) {
    const color = metric.rating === 'good' ? 'green' : 
                  metric.rating === 'needs-improvement' ? 'orange' : 'red'
    console.log(
      `%c[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)}${metric.name === 'CLS' ? '' : 'ms'} (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    )
  }

  if (!developmentEnv) {
    if (typeof window !== 'undefined' && window.vercelAnalytics) {
      window.vercelAnalytics.track('Web Vitals', {
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      })
    }

    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track('web-vitals', {
        metric: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
      })
    }

    if (typeof window !== 'undefined' && window.Sentry) {
      const transaction = window.Sentry.getCurrentHub().getScope().getTransaction()
      if (transaction) {
        transaction.setMeasurement(
          metric.name,
          metric.value,
          metric.name === 'CLS' ? '' : 'millisecond'
        )
      }
    }
  }
}

export function WebVitals() {
  useEffect(() => {
    // Core Web Vitals
    onCLS(sendToAnalytics)
    onINP(sendToAnalytics) // INP replaced FID as a Core Web Vital
    onLCP(sendToAnalytics)
    
    // Additional metrics
    onFCP(sendToAnalytics)
    onTTFB(sendToAnalytics)
  }, [])

  return null
}

interface VercelAnalytics {
  track: (event: string, properties: Record<string, string | number>) => void
}

interface UmamiAnalytics {
  track: (event: string, properties: Record<string, string | number>) => void
}

interface SentryHub {
  getScope: () => SentryScope
}

interface SentryScope {
  getTransaction: () => SentryTransaction | null
}

interface SentryTransaction {
  setMeasurement: (name: string, value: number, unit?: string) => void
}

interface SentryGlobal {
  getCurrentHub: () => SentryHub
  captureException: (error: Error, context?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    vercelAnalytics?: VercelAnalytics
    umami?: UmamiAnalytics
    Sentry?: SentryGlobal
  }
}