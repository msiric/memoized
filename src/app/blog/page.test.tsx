import { describe, expect, it, vi } from 'vitest'
import BlogPage, { generateMetadata } from './page'
import { getBlogPosts } from '@/services/blog'

vi.mock('@/services/blog')
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://test.memoized.io' }))
vi.mock('@/components/NewsletterCTA', () => ({ NewsletterCTA: () => <div>Newsletter</div> }))
vi.mock('next/image', () => ({ default: ({ alt }: { alt: string }) => <span>{alt}</span> }))

describe('Blog index page', () => {
  it('exposes SEO metadata pointing at the canonical url and RSS feed', async () => {
    vi.mocked(getBlogPosts).mockResolvedValue({ posts: [], total: 1 })
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) })
    expect(metadata.title).toEqual({ absolute: 'JavaScript Interview Articles | Memoized' })
    expect(metadata.alternates?.canonical).toBe('https://test.memoized.io/blog')
    expect(metadata.alternates?.types?.['application/rss+xml']).toBe(
      'https://test.memoized.io/blog/rss.xml',
    )
  })

  it('keeps empty and filtered archives out of Search', async () => {
    vi.mocked(getBlogPosts).mockResolvedValue({ posts: [], total: 0 })
    expect((await generateMetadata({ searchParams: Promise.resolve({}) })).robots).toEqual({ index: false, follow: true })
    vi.mocked(getBlogPosts).mockResolvedValue({ posts: [], total: 25 })
    const metadata = await generateMetadata({ searchParams: Promise.resolve({ tag: 'react', page: '2' }) })
    expect(metadata.alternates.canonical).toBe('https://test.memoized.io/blog?tag=react&page=2')
    expect(metadata.robots).toEqual({ index: false, follow: true })
  })

  // The post list + tag filter are async server components rendered inside
  // <Suspense>; the client test renderer can't execute those, so we assert the
  // page composes (awaits searchParams, builds its element tree) without
  // throwing. Rendering behaviour is covered by the service + [slug] tests.
  it('composes the page element for the given search params', async () => {
    const element = await BlogPage({ searchParams: Promise.resolve({ tag: 'react' }) })

    expect(element).toBeTruthy()
    expect((element as any).type).toBe('div')
  })
})
