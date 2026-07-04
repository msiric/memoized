import { describe, expect, it, vi } from 'vitest'
import BlogPage, { metadata } from './page'

vi.mock('@/services/blog')
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://test.memoized.io' }))
vi.mock('@/components/NewsletterCTA', () => ({ NewsletterCTA: () => <div>Newsletter</div> }))
vi.mock('next/image', () => ({ default: (props: any) => <img alt={props.alt} /> }))

describe('Blog index page', () => {
  it('exposes SEO metadata pointing at the canonical url and RSS feed', () => {
    expect(metadata.title).toBe('Blog | Memoized')
    expect(metadata.alternates?.canonical).toBe('https://test.memoized.io/blog')
    expect(metadata.alternates?.types?.['application/rss+xml']).toBe(
      'https://test.memoized.io/blog/rss.xml',
    )
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
