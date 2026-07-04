import prisma from '@/lib/prisma'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAllBlogTags,
  getBlogPostBySlug,
  getBlogPosts,
  getBlogPostSlugs,
  getBlogPostsForFeed,
  getBlogPostsForSitemap,
  getRelatedPosts,
  upsertBlogPost,
} from './blog'

vi.mock('@/lib/prisma', () => ({
  default: {
    blogPost: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const mockBlogPost = {
  id: 'post-1',
  slug: 'test-post',
  title: 'Test Post',
  description: 'A test post description',
  body: '# Test Content\n\nThis is the body.',
  serializedBody: { compiledSource: 'compiled-code' },
  coverImage: '/images/test.jpg',
  author: 'Mario Siric',
  tags: ['react', 'typescript'],
  readingTime: 5,
  published: true,
  publishedAt: new Date('2024-01-15'),
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-20'),
}

const mockBlogPostUnpublished = {
  ...mockBlogPost,
  id: 'post-2',
  slug: 'draft-post',
  title: 'Draft Post',
  published: false,
}

describe('Blog service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBlogPosts', () => {
    it('returns paginated posts with total count', async () => {
      const posts = [mockBlogPost]
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(posts)
      ;(prisma.blogPost.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

      const result = await getBlogPosts()

      expect(result).toEqual({ posts, total: 1 })
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true },
          orderBy: { publishedAt: 'desc' },
          take: 20,
          skip: 0,
        }),
      )
    })

    it('filters by tag when provided', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.blogPost.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

      await getBlogPosts({ tag: 'react' })

      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { published: true, tags: { has: 'react' } },
        }),
      )
    })

    it('respects limit and offset parameters', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.blogPost.count as ReturnType<typeof vi.fn>).mockResolvedValue(50)

      const result = await getBlogPosts({ limit: 10, offset: 20 })

      expect(result.total).toBe(50)
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      )
    })

    it('returns empty array when no posts exist', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(prisma.blogPost.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

      const result = await getBlogPosts()

      expect(result).toEqual({ posts: [], total: 0 })
    })
  })

  describe('getBlogPostBySlug', () => {
    it('returns post when found and published', async () => {
      ;(prisma.blogPost.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlogPost)

      const result = await getBlogPostBySlug('test-post')

      expect(result).toEqual(mockBlogPost)
      expect(prisma.blogPost.findUnique).toHaveBeenCalledWith({
        where: { slug: 'test-post' },
        select: expect.objectContaining({
          id: true,
          slug: true,
          title: true,
          body: true,
          serializedBody: true,
        }),
      })
    })

    it('returns null when post not found', async () => {
      ;(prisma.blogPost.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const result = await getBlogPostBySlug('non-existent')

      expect(result).toBeNull()
    })

    it('returns null when post is not published', async () => {
      ;(prisma.blogPost.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBlogPostUnpublished,
      )

      const result = await getBlogPostBySlug('draft-post')

      expect(result).toBeNull()
    })
  })

  describe('getBlogPostSlugs', () => {
    it('returns array of slugs for published posts', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { slug: 'post-1' },
        { slug: 'post-2' },
        { slug: 'post-3' },
      ])

      const result = await getBlogPostSlugs()

      expect(result).toEqual(['post-1', 'post-2', 'post-3'])
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith({
        where: { published: true },
        select: { slug: true },
      })
    })

    it('returns empty array when no published posts', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await getBlogPostSlugs()

      expect(result).toEqual([])
    })
  })

  describe('getAllBlogTags', () => {
    it('returns tags sorted by count descending', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { tags: ['react', 'typescript'] },
        { tags: ['react', 'nextjs'] },
        { tags: ['typescript'] },
      ])

      const result = await getAllBlogTags()

      expect(result).toEqual([
        { tag: 'react', count: 2 },
        { tag: 'typescript', count: 2 },
        { tag: 'nextjs', count: 1 },
      ])
    })

    it('handles posts with empty tags', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { tags: [] },
        { tags: ['react'] },
      ])

      const result = await getAllBlogTags()

      expect(result).toEqual([{ tag: 'react', count: 1 }])
    })

    it('returns empty array when no posts', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await getAllBlogTags()

      expect(result).toEqual([])
    })
  })

  describe('getRelatedPosts', () => {
    it('returns posts with matching tags excluding current post', async () => {
      const relatedPosts = [
        {
          slug: 'related-1',
          title: 'Related Post 1',
          description: 'Description',
          coverImage: '/img.jpg',
          readingTime: 3,
          publishedAt: new Date(),
        },
      ]
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(relatedPosts)

      const result = await getRelatedPosts('test-post', ['react', 'typescript'])

      expect(result).toEqual(relatedPosts)
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith({
        where: {
          published: true,
          slug: { not: 'test-post' },
          tags: { hasSome: ['react', 'typescript'] },
        },
        select: expect.objectContaining({
          slug: true,
          title: true,
        }),
        orderBy: { publishedAt: 'desc' },
        take: 3,
      })
    })

    it('returns empty array when tags array is empty', async () => {
      const result = await getRelatedPosts('test-post', [])

      expect(result).toEqual([])
      expect(prisma.blogPost.findMany).not.toHaveBeenCalled()
    })

    it('respects custom limit parameter', async () => {
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await getRelatedPosts('test-post', ['react'], 5)

      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      )
    })
  })

  describe('upsertBlogPost', () => {
    it('creates new post when slug does not exist', async () => {
      const newPost = { ...mockBlogPost, id: 'new-id' }
      ;(prisma.blogPost.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(newPost)

      const result = await upsertBlogPost('new-post', {
        title: 'New Post',
        description: 'New description',
        body: '# New Content',
      })

      expect(result).toEqual(newPost)
      expect(prisma.blogPost.upsert).toHaveBeenCalledWith({
        where: { slug: 'new-post' },
        update: expect.objectContaining({
          title: 'New Post',
          description: 'New description',
          body: '# New Content',
        }),
        create: expect.objectContaining({
          slug: 'new-post',
          title: 'New Post',
          description: 'New description',
          body: '# New Content',
          author: 'Mario Siric',
          tags: [],
          readingTime: 5,
          published: false,
        }),
      })
    })

    it('updates existing post with provided fields', async () => {
      ;(prisma.blogPost.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlogPost)

      await upsertBlogPost('test-post', {
        title: 'Updated Title',
        description: 'Updated description',
        body: '# Updated Content',
        tags: ['new-tag'],
        published: true,
        publishedAt: new Date('2024-02-01'),
      })

      expect(prisma.blogPost.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            title: 'Updated Title',
            tags: ['new-tag'],
            published: true,
          }),
        }),
      )
    })

    it('includes serializedBody when provided', async () => {
      ;(prisma.blogPost.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockBlogPost)

      await upsertBlogPost('test-post', {
        title: 'Post',
        description: 'Desc',
        body: 'Body',
        serializedBody: { compiledSource: 'code' },
      })

      expect(prisma.blogPost.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            serializedBody: { compiledSource: 'code' },
          }),
        }),
      )
    })
  })

  describe('getBlogPostsForFeed', () => {
    it('returns posts with feed-specific fields', async () => {
      const feedPosts = [
        {
          slug: 'post-1',
          title: 'Post 1',
          description: 'Description',
          author: 'Mario',
          tags: ['react'],
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(feedPosts)

      const result = await getBlogPostsForFeed()

      expect(result).toEqual(feedPosts)
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith({
        where: { published: true },
        select: {
          slug: true,
          title: true,
          description: true,
          author: true,
          tags: true,
          publishedAt: true,
          updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
        take: 50,
      })
    })
  })

  describe('getBlogPostsForSitemap', () => {
    it('returns posts with sitemap-specific fields', async () => {
      const sitemapPosts = [
        { slug: 'post-1', updatedAt: new Date() },
        { slug: 'post-2', updatedAt: new Date() },
      ]
      ;(prisma.blogPost.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(sitemapPosts)

      const result = await getBlogPostsForSitemap()

      expect(result).toEqual(sitemapPosts)
      expect(prisma.blogPost.findMany).toHaveBeenCalledWith({
        where: { published: true },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      })
    })
  })
})
