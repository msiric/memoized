import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/services/blog', () => ({
  getBlogPostsForSitemap: vi.fn(),
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: vi.fn(() => 'https://test.memoized.io'),
}))

import { GET } from './route'
import { getBlogPostsForSitemap } from '@/services/blog'

const mockGetPosts = getBlogPostsForSitemap as ReturnType<typeof vi.fn>

describe('Blog sitemap.xml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const posts = [
    { slug: 'first-post', updatedAt: new Date('2024-06-01T10:00:00Z') },
    { slug: 'second-post', updatedAt: new Date('2024-06-10T10:00:00Z') },
  ]

  it('returns a valid sitemap XML document', async () => {
    mockGetPosts.mockResolvedValue(posts)

    const body = await (await GET()).text()

    expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(body).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(body).toContain('</urlset>')
  })

  it('always includes the blog index url', async () => {
    mockGetPosts.mockResolvedValue([])

    const body = await (await GET()).text()

    expect(body).toContain('<loc>https://test.memoized.io/blog</loc>')
    expect(body).toContain('<changefreq>daily</changefreq>')
  })

  it('includes a <url> entry for every post with its lastmod', async () => {
    mockGetPosts.mockResolvedValue(posts)

    const body = await (await GET()).text()

    expect(body).toContain('<loc>https://test.memoized.io/blog/first-post</loc>')
    expect(body).toContain('<loc>https://test.memoized.io/blog/second-post</loc>')
    expect(body).toContain('<lastmod>2024-06-01T10:00:00.000Z</lastmod>')
    expect(body).toContain('<lastmod>2024-06-10T10:00:00.000Z</lastmod>')
    // Two posts + the blog index = 3 url entries.
    expect((body.match(/<url>/g) || []).length).toBe(3)
  })

  it('emits only the index url when there are no posts', async () => {
    mockGetPosts.mockResolvedValue([])

    const body = await (await GET()).text()

    expect((body.match(/<url>/g) || []).length).toBe(1)
    expect(body).not.toContain('/blog/first-post')
  })

  it('sets the XML content-type and cache-control headers', async () => {
    mockGetPosts.mockResolvedValue(posts)

    const response = await GET()

    expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600')
  })
})
