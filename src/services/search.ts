import prisma from '@/lib/prisma'
import {
  coursePath,
  sectionPath,
  lessonPath,
  resourcePath,
  siteUrl,
} from '@/lib/seo'
import { publishedBlogWhere } from '@/lib/blog-publication'

/** Public catalog metadata only; no lesson bodies, answers or user progress. */
export async function getSearchCatalog() {
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

export type SearchCatalog = Awaited<ReturnType<typeof getSearchCatalog>>

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
      for (const lesson of section.lessons)
        paths.push(lessonPath(course.slug, section.slug, lesson.slug))
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
