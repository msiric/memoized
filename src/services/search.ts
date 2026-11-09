import prisma from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import {
  coursePath,
  sectionPath,
  lessonPath,
  resourcePath,
  siteUrl,
  NOINDEX_LESSON_PATHS,
} from '@/lib/seo'
import { publishedBlogWhere } from '@/lib/blog-publication'

export const CATALOG_CACHE_TAG = 'catalog'

/** Public catalog metadata only; no lesson bodies, answers or user progress. */
export async function readSearchCatalog() {
  const [courses, resources, posts] = await Promise.all([
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        slug: true,
        title: true,
        description: true,
        sections: {
          orderBy: { order: 'asc' },
          select: {
            slug: true,
            title: true,
            description: true,
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                slug: true,
                title: true,
                description: true,
                access: true,
              },
            },
          },
        },
      },
    }),
    prisma.resource.findMany({
      orderBy: { order: 'asc' },
      select: { slug: true, title: true, description: true, access: true },
    }),
    prisma.blogPost.findMany({
      where: publishedBlogWhere(),
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, title: true },
    }),
  ])
  return { courses, resources, posts }
}

export type SearchCatalog = Awaited<ReturnType<typeof readSearchCatalog>>

// The catalog only changes when content is published, yet every uncached page
// (signed-in lessons, sections, resources, sitemap) read it from the database
// on each request. Cache it across requests; publishing clears the tag through
// /api/revalidate, and an hourly revalidate bounds staleness (e.g. a scheduled
// blog post becomes visible within the hour).
export const getSearchCatalog = unstable_cache(readSearchCatalog, ['search-catalog-v1'], {
  tags: [CATALOG_CACHE_TAG],
  revalidate: 3600,
})

export function searchUrls(catalog: SearchCatalog): string[] {
  const paths = [
    '/',
    '/courses',
    '/problems',
    '/premium',
    '/resources',
    '/privacy',
    '/terms',
  ]
  for (const course of catalog.courses) {
    paths.push(coursePath(course.slug))
    for (const section of course.sections) {
      paths.push(sectionPath(course.slug, section.slug))
      for (const lesson of section.lessons) {
        const path = lessonPath(course.slug, section.slug, lesson.slug)
        if (!NOINDEX_LESSON_PATHS.has(path)) paths.push(path)
      }
    }
  }
  for (const resource of catalog.resources) {
    if (resource.access === 'FREE') paths.push(resourcePath(resource.slug))
  }
  if (catalog.posts.length) paths.push('/blog')
  for (const post of catalog.posts)
    paths.push(`/blog/${encodeURIComponent(post.slug)}`)
  return [...new Set(paths.map(siteUrl))]
}
