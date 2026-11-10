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

    // Sentry records web vitals itself (browser tracing). Never read
    // window.Sentry here: the lazy Replay loader defines a partial one.
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

declare global {
  interface Window {
    vercelAnalytics?: VercelAnalytics
    umami?: UmamiAnalytics
  }
}