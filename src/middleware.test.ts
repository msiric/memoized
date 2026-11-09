import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('Public asset rate-limit isolation', () => {
  it('keeps static assets available after a client exhausts its document budget', async () => {
    vi.resetModules()
    const { middleware } = await import('./middleware')
    const request = (path: string, userAgent = 'Example browser') => new NextRequest(`https://www.memoized.io${path}`, {
      headers: { 'x-forwarded-for': '192.0.2.10', 'user-agent': userAgent },
    })
    for (let i = 0; i < 120; i++) expect(middleware(request('/courses')).status).toBe(200)
    expect(middleware(request('/courses')).status).toBe(429)
    expect(middleware(request('/og-image.png')).status).toBe(200)
    expect(middleware(request('/fonts/example.woff2')).status).toBe(200)
    expect(middleware(request('/giscus-theme.css')).status).toBe(200)
    expect(middleware(request('/api/newsletter/subscribe')).status).toBe(429)
    expect(middleware(request('/private/file.png')).status).toBe(429)
    expect(middleware(request('/og-image.png', 'SemrushBot')).status).toBe(403)
  })

  it.each(['Mozilla/5.0 (compatible; GPTBot/1.2)', 'Mozilla/5.0 (compatible; ClaudeBot/1.0)', 'CCBot/2.0'])(
    'admits AI training crawler %s but keeps it inside the per-IP cost guard',
    async (userAgent) => {
      vi.resetModules()
      const { middleware } = await import('./middleware')
      const request = () => new NextRequest('https://www.memoized.io/courses', {
        headers: { 'x-forwarded-for': '192.0.2.20', 'user-agent': userAgent },
      })
      for (let i = 0; i < 120; i++) expect(middleware(request()).status).toBe(200)
      expect(middleware(request()).status).toBe(429)
    },
  )

  it('lets blocked crawlers read robots.txt so they can see their Disallow', async () => {
    vi.resetModules()
    const { middleware } = await import('./middleware')
    const request = new NextRequest('https://www.memoized.io/robots.txt', {
      headers: { 'x-forwarded-for': '192.0.2.30', 'user-agent': 'Mozilla/5.0 (compatible; Bytespider)' },
    })
    expect(middleware(request).status).toBe(200)
    expect(middleware(new NextRequest('https://www.memoized.io/courses', {
      headers: { 'x-forwarded-for': '192.0.2.30', 'user-agent': 'Mozilla/5.0 (compatible; Bytespider)' },
    })).status).toBe(403)
  })
})
