import { describe, it, expect, vi, beforeEach } from 'vitest'

const imageResponseMock = vi.hoisted(() =>
  vi.fn(function (element: unknown, options: unknown) {
    return { element, options, __isImageResponse: true }
  }),
)

vi.mock('next/og', () => ({
  ImageResponse: imageResponseMock,
}))

vi.mock('@/services/blog', () => ({
  getBlogPostBySlug: vi.fn(),
}))

import Image, { alt, size, contentType, runtime } from './opengraph-image'
import { getBlogPostBySlug } from '@/services/blog'

const mockGetPost = getBlogPostBySlug as ReturnType<typeof vi.fn>

describe('Blog post OpenGraph image', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exports the metadata Next.js expects for an OG image route', () => {
    expect(size).toEqual({ width: 1200, height: 630 })
    expect(contentType).toBe('image/png')
    expect(alt).toBe('Blog post')
    // Prisma requires the Node.js runtime for the DB lookup.
    expect(runtime).toBe('nodejs')
  })

  it('renders an ImageResponse at 1200x630 for an existing post', async () => {
    mockGetPost.mockResolvedValue({
      title: 'Hello World',
      description: 'A first post',
      author: 'Mario Siric',
      tags: ['react', 'typescript'],
      readingTime: 5,
    })

    const result: any = await Image({ params: Promise.resolve({ slug: 'hello-world' }) })

    expect(mockGetPost).toHaveBeenCalledWith('hello-world')
    expect(imageResponseMock).toHaveBeenCalledTimes(1)
    expect(result.__isImageResponse).toBe(true)
    expect(result.options).toMatchObject({ width: 1200, height: 630 })
  })

  it('still renders a fallback ImageResponse when the post is missing', async () => {
    mockGetPost.mockResolvedValue(null)

    const result: any = await Image({ params: Promise.resolve({ slug: 'missing' }) })

    expect(imageResponseMock).toHaveBeenCalledTimes(1)
    expect(result.__isImageResponse).toBe(true)
  })
})
