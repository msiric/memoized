import { describe, expect, it, vi } from 'vitest'
import robots from './robots'
import { BLOCKED_CRAWLERS, DEFERRED_AI_TRAINING_CRAWLERS } from '@/lib/crawlers'

vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://www.memoized.io' }))

const groups = () => {
  const { rules } = robots()
  return Array.isArray(rules) ? rules : [rules]
}
const agents = (rule: ReturnType<typeof groups>[number]) =>
  ([] as string[]).concat(rule.userAgent ?? [])

describe('robots policy', () => {
  it('lets search engines, AI search and usage tokens use the default group', () => {
    const named = groups().flatMap(agents).map((agent) => agent.toLowerCase())
    for (const bot of ['google-extended', 'applebot-extended', 'googlebot', 'bingbot', 'yandexbot', 'baiduspider', 'oai-searchbot', 'claude-searchbot', 'perplexitybot']) {
      expect(named).not.toContain(bot)
    }
    const fallback = groups().find((rule) => agents(rule).includes('*'))
    expect(fallback).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/private/'],
    })
  })
  it('drops deprecated agent names and the non-standard Host line', () => {
    const named = groups().flatMap(agents).map((agent) => agent.toLowerCase())
    expect(named).not.toContain('anthropic-ai')
    expect(named).not.toContain('claude-web')
    expect(robots()).not.toHaveProperty('host')
    expect(robots().sitemap).toBe('https://www.memoized.io/sitemap.xml')
  })
  it('disallows exactly the crawlers the middleware blocks', () => {
    const blocked = groups().filter((rule) => rule.disallow === '/')
    expect(agents(blocked[0])).toEqual([...BLOCKED_CRAWLERS])
    expect(agents(blocked[1])).toEqual([...DEFERRED_AI_TRAINING_CRAWLERS])
    expect(blocked).toHaveLength(2)
  })
})
