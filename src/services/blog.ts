import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * Get all published blog posts, ordered by publish date (newest first)
 * Uses lean select to minimize data transfer
 */
export async function getBlogPosts(options?: {
  tag?: string
  limit?: number
  offset?: number
}) {
  const { tag, limit = 20, offset = 0 } = options || {}

  const where: Prisma.BlogPostWhereInput = {
    published: true,
    ...(tag && { tags: { has: tag } }),
  }

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        author: true,
        tags: true,
        readingTime: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.blogPost.count({ where }),
  ])

  return { posts, total }
}

/**
 * Get a single blog post by slug with full content
 */
export async function getBlogPostBySlug(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      body: true,
      serializedBody: true,
      coverImage: true,
      author: true,
      tags: true,
      readingTime: true,
      published: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Only return if published (or in preview mode - can add later)
  if (!post || !post.published) {
    return null
  }

  return post
}

/**
 * Get all published blog post slugs for static generation
 */
export async function getBlogPostSlugs() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  })

  return posts.map((post) => post.slug)
}

/**
 * Get all unique tags from published posts
 */
export async function getAllBlogTags() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    select: { tags: true },
  })

  const tagCounts = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Get related posts based on shared tags
 */
export async function getRelatedPosts(currentSlug: string, tags: string[], limit = 3) {
  if (tags.length === 0) return []

  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
      slug: { not: currentSlug },
      tags: { hasSome: tags },
    },
    select: {
      slug: true,
      title: true,
      description: true,
      coverImage: true,
      readingTime: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  })

  return posts
}

/**
 * Upsert a blog post (used by sync script)
 */
export async function upsertBlogPost(
  slug: string,
  data: {
    title: string
    description: string
    body: string
    serializedBody?: Prisma.InputJsonValue
    coverImage?: string
    author?: string
    tags?: string[]
    readingTime?: number
    published?: boolean
    publishedAt?: Date
  },
) {
  return prisma.blogPost.upsert({
    where: { slug },
    update: {
      title: data.title,
      description: data.description,
      body: data.body,
      ...(data.serializedBody && { serializedBody: data.serializedBody }),
      ...(data.coverImage && { coverImage: data.coverImage }),
      ...(data.author && { author: data.author }),
      ...(data.tags && { tags: data.tags }),
      ...(data.readingTime && { readingTime: data.readingTime }),
      ...(data.published !== undefined && { published: data.published }),
      ...(data.publishedAt && { publishedAt: data.publishedAt }),
    },
    create: {
      slug,
      title: data.title,
      description: data.description,
      body: data.body,
      serializedBody: data.serializedBody,
      coverImage: data.coverImage,
      author: data.author || 'Mario Siric',
      tags: data.tags || [],
      readingTime: data.readingTime || 5,
      published: data.published || false,
      publishedAt: data.publishedAt,
    },
  })
}

/**
 * Get posts for RSS feed (minimal data)
 */
export async function getBlogPostsForFeed() {
  return prisma.blogPost.findMany({
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
}

/**
 * Get posts for sitemap
 */
export async function getBlogPostsForSitemap() {
  return prisma.blogPost.findMany({
    where: { published: true },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: { publishedAt: 'desc' },
  })
}

/**
 * Get adjacent posts (previous and next) for navigation
 * Previous = newer post (later publishedAt)
 * Next = older post (earlier publishedAt)
 */
export async function getAdjacentPosts(currentSlug: string, currentPublishedAt: Date) {
  const [previousPost, nextPost] = await Promise.all([
    // Previous post = the one published right after current (newer)
    prisma.blogPost.findFirst({
      where: {
        published: true,
        slug: { not: currentSlug },
        publishedAt: { gt: currentPublishedAt },
      },
      select: {
        slug: true,
        title: true,
      },
      orderBy: { publishedAt: 'asc' },
    }),
    // Next post = the one published right before current (older)
    prisma.blogPost.findFirst({
      where: {
        published: true,
        slug: { not: currentSlug },
        publishedAt: { lt: currentPublishedAt },
      },
      select: {
        slug: true,
        title: true,
      },
      orderBy: { publishedAt: 'desc' },
    }),
  ])

  return { previousPost, nextPost }
}
