import { render, screen, cleanup } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import BlogPostPage, { generateMetadata, generateStaticParams } from './page'
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  getRelatedPosts,
  getAdjacentPosts,
} from '@/services/blog'

vi.mock('@/services/blog')

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'https://test.memoized.io',
}))

// Heavy / client components are irrelevant to this page's logic — stub them.
vi.mock('@/components/BlogMdxRenderer', () => ({
  BlogMdxRenderer: () => <div>Mocked MDX</div>,
}))
vi.mock('@/components/Giscus', () => ({ Giscus: () => <div>Comments</div> }))
vi.mock('@/components/ShareButtons', () => ({ ShareButtons: () => <div>Share</div> }))
vi.mock('@/components/NewsletterCTA', () => ({ NewsletterCTA: () => <div>Newsletter</div> }))
vi.mock('@/components/MemoizedCTA', () => ({ MemoizedCTA: () => <div>Memoized CTA</div> }))
vi.mock('@/components/AuthorCard', () => ({ AuthorCard: () => <div>Author</div> }))
vi.mock('next/image', () => ({ default: (props: any) => <img alt={props.alt} /> }))

const notFoundMock = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

const basePost = {
  id: 'post1',
  slug: 'hello-world',
  title: 'Hello World',
  description: 'A first post',
  body: 'Plain body text',
  serializedBody: null,
  coverImage: null,
  author: 'Mario Siric',
  tags: ['react'],
  readingTime: 5,
  published: true,
  publishedAt: new Date('2024-06-01T10:00:00Z'),
  createdAt: new Date('2024-05-01T10:00:00Z'),
  updatedAt: new Date('2024-06-02T10:00:00Z'),
}

describe('Blog post page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getRelatedPosts).mockResolvedValue([])
    vi.mocked(getAdjacentPosts).mockResolvedValue({ previousPost: null, nextPost: null })
  })

  afterEach(() => cleanup())

  it('renders the post title, description and body', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(basePost as any)

    render(await BlogPostPage({ params: Promise.resolve({ slug: 'hello-world' }) }))

    expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument()
    expect(screen.getByText('A first post')).toBeInTheDocument()
    expect(screen.getByText('Plain body text')).toBeInTheDocument()
  })

  it('renders serialized MDX when the post has a serialized body', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue({
      ...basePost,
      serializedBody: { compiledSource: 'x' },
    } as any)

    render(await BlogPostPage({ params: Promise.resolve({ slug: 'hello-world' }) }))

    expect(screen.getByText('Mocked MDX')).toBeInTheDocument()
  })

  it('emits Article JSON-LD structured data', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(basePost as any)

    const { container } = render(
      await BlogPostPage({ params: Promise.resolve({ slug: 'hello-world' }) }),
    )

    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    const jsonLd = JSON.parse(script!.innerHTML)
    expect(jsonLd['@type']).toBe('Article')
    expect(jsonLd.headline).toBe('Hello World')
    expect(jsonLd.mainEntityOfPage['@id']).toBe('https://test.memoized.io/blog/hello-world')
  })

  it('renders related articles when they exist', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(basePost as any)
    vi.mocked(getRelatedPosts).mockResolvedValue([
      { slug: 'related-1', title: 'Related One', description: 'd', coverImage: null, readingTime: 3, publishedAt: new Date() },
    ] as any)

    render(await BlogPostPage({ params: Promise.resolve({ slug: 'hello-world' }) }))

    expect(screen.getByText('Related Articles')).toBeInTheDocument()
    expect(screen.getByText('Related One')).toBeInTheDocument()
  })

  it('calls notFound() when the post does not exist', async () => {
    vi.mocked(getBlogPostBySlug).mockResolvedValue(null)

    await BlogPostPage({ params: Promise.resolve({ slug: 'missing' }) }).catch(() => {})

    expect(notFoundMock).toHaveBeenCalled()
  })

  describe('generateMetadata', () => {
    it('builds metadata from the post', async () => {
      vi.mocked(getBlogPostBySlug).mockResolvedValue(basePost as any)

      const meta = await generateMetadata({ params: Promise.resolve({ slug: 'hello-world' }) })

      expect(meta.title).toBe('Hello World | Memoized Blog')
      expect(meta.description).toBe('A first post')
      expect(meta.alternates?.canonical).toBe('https://test.memoized.io/blog/hello-world')
      expect((meta.openGraph as { type?: string })?.type).toBe('article')
    })

    it('returns a "Post Not Found" title for a missing post', async () => {
      vi.mocked(getBlogPostBySlug).mockResolvedValue(null)

      const meta = await generateMetadata({ params: Promise.resolve({ slug: 'missing' }) })

      expect(meta.title).toBe('Post Not Found')
    })
  })

  describe('generateStaticParams', () => {
    it('maps every published slug to a params object', async () => {
      vi.mocked(getBlogPostSlugs).mockResolvedValue(['a', 'b', 'c'])

      const params = await generateStaticParams()

      expect(params).toEqual([{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }])
    })
  })
})
