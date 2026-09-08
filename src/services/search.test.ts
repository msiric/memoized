import { describe, expect, it, vi } from 'vitest'
import { getSearchCatalog, searchUrls, type SearchCatalog } from './search'
import prisma from '@/lib/prisma'
vi.mock('@/lib/prisma', () => ({
  default: {
    course: { findMany: vi.fn() },
    resource: { findMany: vi.fn() },
    blogPost: { findMany: vi.fn() },
  },
}))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://www.memoized.io' }))

const catalog: SearchCatalog = {
  courses: [
    {
      slug: 'js-track',
      title: 'JavaScript',
      description: 'JS',
      sections: [
        {
          slug: 'advanced-concepts',
          title: 'Advanced',
          description: 'Advanced JS',
          lessons: [
            {
              slug: 'browser-security',
              title: 'Browser Security',
              description: 'Security',
              access: 'PREMIUM',
            },
          ],
        },
      ],
    },
  ],
  resources: [
    { slug: 'intro', title: 'Resources', description: 'Hub', access: 'FREE' },
    {
      slug: 'free-reference',
      title: 'Free reference',
      description: 'Reference',
      access: 'FREE',
    },
    {
      slug: 'paid-reference',
      title: 'Paid reference',
      description: 'Reference',
      access: 'PREMIUM',
    },
  ],
  posts: [{ slug: 'a&b', title: 'Published post' }],
}

describe('Search inventory', () => {
  it('publishes current URLs and excludes paid reference stubs and aliases', () => {
    const urls = searchUrls(catalog)
    expect(urls).toContain(
      'https://www.memoized.io/courses/js-track/advanced-concepts/browser-security',
    )
    expect(urls).toContain('https://www.memoized.io/resources/free-reference')
    expect(urls).toContain('https://www.memoized.io/blog/a%26b')
    expect(urls).not.toContain(
      'https://www.memoized.io/resources/paid-reference',
    )
    expect(urls).not.toContain('https://www.memoized.io/resources/intro')
    expect(urls).not.toContain(
      'https://www.memoized.io/courses/js-track/advanced-concepts/security',
    )
    expect(new Set(urls).size).toBe(urls.length)
  })
  it('does not promote an empty blog', () => {
    expect(searchUrls({ ...catalog, posts: [] })).not.toContain(
      'https://www.memoized.io/blog',
    )
  })
  it('selects active public catalog metadata and excludes scheduled blog posts', async () => {
    vi.mocked(prisma.course.findMany).mockResolvedValue([])
    vi.mocked(prisma.resource.findMany).mockResolvedValue([])
    vi.mocked(prisma.blogPost.findMany).mockResolvedValue([])
    await getSearchCatalog()
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    )
    expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          published: true,
          OR: [
            { publishedAt: null },
            { publishedAt: { lte: expect.any(Date) } },
          ],
        },
      }),
    )
    expect(
      JSON.stringify(vi.mocked(prisma.course.findMany).mock.calls),
    ).not.toContain('serializedBody')
  })
})
