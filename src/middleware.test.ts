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
})
