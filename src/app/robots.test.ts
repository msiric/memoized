import { describe, expect, it, vi } from 'vitest'
import robots from './robots'
import { BLOCKED_CRAWLERS } from '@/lib/crawlers'

vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://www.memoized.io' }))

const groups = () => {
  const { rules } = robots()
  return Array.isArray(rules) ? rules : [rules]
}
const agents = (rule: ReturnType<typeof groups>[number]) =>
  ([] as string[]).concat(rule.userAgent ?? [])

describe('robots policy', () => {
  it('lets every other crawler, including AI training crawlers, use the default group', () => {
    const named = groups().flatMap(agents).map((agent) => agent.toLowerCase())
    for (const bot of ['gptbot', 'ccbot', 'claudebot', 'google-extended', 'applebot-extended', 'googlebot', 'bingbot']) {
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
    const blocked = groups().find((rule) => rule.disallow === '/')
    expect(agents(blocked!)).toEqual([...BLOCKED_CRAWLERS])
  })
})
