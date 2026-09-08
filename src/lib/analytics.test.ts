import { afterEach, describe, expect, it, vi } from 'vitest'
import { productionAnalyticsAllowed, trackLearningEvent } from './analytics'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Learning-action telemetry', () => {
  it('excludes development, localhost and preview hostnames', () => {
    expect(productionAnalyticsAllowed('www.memoized.io', 'production')).toBe(
      true,
    )
    expect(productionAnalyticsAllowed('www.memoized.io', 'development')).toBe(
      false,
    )
    expect(productionAnalyticsAllowed('localhost', 'production')).toBe(false)
    expect(
      productionAnalyticsAllowed('memoized-preview.vercel.app', 'production'),
    ).toBe(false)
  })
  it('sends only the explicit allowlist, never user or query data', () => {
    const track = vi.fn()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('window', {
      location: { hostname: 'www.memoized.io' },
      umami: { track },
    })
    const data = {
      content_id: 'catalog-item',
      source: 'practice' as const,
      email: 'private@example.test',
      user_id: 'private',
      query: '?token=secret',
    }
    trackLearningEvent('practice_answer_revealed', data)
    expect(track).toHaveBeenCalledWith('practice_answer_revealed', {
      content_id: 'catalog-item',
      source: 'practice',
    })
  })
  it('does not fail the user action if optional analytics fails', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('window', {
      location: { hostname: 'www.memoized.io' },
      umami: {
        track: () => {
          throw new Error('offline')
        },
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => trackLearningEvent('lesson_marked_complete')).not.toThrow()
    expect(warn).toHaveBeenCalledWith('Analytics event delivery failed.')
  })
})
