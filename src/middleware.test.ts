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

  it.each(['Mozilla/5.0 (compatible; YandexBot/3.0)', 'Mozilla/5.0 (compatible; Baiduspider/2.0)', 'SeznamBot/4.0', 'Sogou web spider/4.0', 'Mozilla/5.0 (compatible; PetalBot)'])(
    'admits search engine %s under the normal rate limit',
    async (userAgent) => {
      vi.resetModules()
      const { middleware } = await import('./middleware')
      const request = () => new NextRequest('https://www.memoized.io/courses', {
        headers: { 'x-forwarded-for': '192.0.2.40', 'user-agent': userAgent },
      })
      expect(middleware(request()).status).toBe(200)
    },
  )
})

describe('signed-out lesson cache routing', () => {
  const load = async () => { vi.resetModules(); return (await import('./middleware')).middleware }
  const req = (url: string, init: { cookie?: string; ua?: string; method?: string; ip?: string } = {}) =>
    new NextRequest(`https://www.memoized.io${url}`, {
      method: init.method ?? 'GET',
      headers: {
        'x-forwarded-for': init.ip ?? '192.0.2.50',
        'user-agent': init.ua ?? 'Example browser',
        ...(init.cookie ? { cookie: init.cookie } : {}),
      },
    })
  const rewrite = (response: Response) => response.headers.get('x-middleware-rewrite')

  it('serves signed-out lesson views from the cached tree, keeping the URL', async () => {
    const middleware = await load()
    expect(rewrite(middleware(req('/courses/js-track/core-fundamentals/closures')))).toBe(
      'https://www.memoized.io/public/courses/js-track/core-fundamentals/closures',
    )
  })

  it('also routes crawlers that bypass the rate limit', async () => {
    const middleware = await load()
    expect(rewrite(middleware(req('/courses/a/b/c', { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)' })))).toContain('/public/courses/a/b/c')
  })

  it.each([
    ['a session cookie', { cookie: 'next-auth.session-token=abc' }],
    ['a secure session cookie', { cookie: '__Secure-next-auth.session-token=abc' }],
    ['a chunked session cookie', { cookie: '__Secure-next-auth.session-token.0=abc' }],
  ])('keeps the session-aware route for %s', async (_label, init) => {
    const middleware = await load()
    expect(rewrite(middleware(req('/courses/a/b/c', init)))).toBeNull()
  })

  it.each(['/courses/a/b/c?path=typescript-first-pass', '/courses/a/b/c?step=2', '/courses/a/b', '/courses/a', '/problems'])(
    'does not rewrite %s', async (url) => {
      const middleware = await load()
      expect(rewrite(middleware(req(url)))).toBeNull()
    },
  )

  it('ignores unrelated cookies', async () => {
    const middleware = await load()
    expect(rewrite(middleware(req('/courses/a/b/c', { cookie: 'theme=dark; next-auth.csrf-token=x' })))).toContain('/public/courses/a/b/c')
  })

  it('redirects direct requests for the internal tree to the canonical URL', async () => {
    const middleware = await load()
    const response = middleware(req('/public/courses/a/b/c?x=1'))
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe('https://www.memoized.io/courses/a/b/c?x=1')
  })
})
