import type { Metadata } from 'next'
import { getSiteUrl } from '@/config/env'
import { APP_NAME } from '@/constants'

export const coursePath = (course: string) =>
  `/courses/${encodeURIComponent(course)}`
export const sectionPath = (course: string, section: string) =>
  `${coursePath(course)}/${encodeURIComponent(section)}`
export const lessonPath = (course: string, section: string, lesson: string) =>
  `${sectionPath(course, section)}/${encodeURIComponent(lesson)}`
export const resourcePath = (slug: string) =>
  slug === 'intro' ? '/resources' : `/resources/${encodeURIComponent(slug)}`
export const siteUrl = (path: string) => new URL(path, getSiteUrl()).toString()
export const isPreviewDeployment = () => process.env.VERCEL_ENV === 'preview'

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string
  description: string
  path: string
  index?: boolean
}): Metadata {
  const url = siteUrl(path)
  return {
    title: { absolute: `${title} | ${APP_NAME}` },
    description,
    alternates: { canonical: url },
    robots: { index: index && !isPreviewDeployment(), follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_NAME,
      type: 'website',
      images: [
        {
          url: '/og-image.png',
          width: 1200,
          height: 630,
          alt: `${APP_NAME} — JavaScript and TypeScript interview preparation`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/twitter-image.png'],
    },
  }
}

// Editorial search headlines stay separate from curriculum titles: changing a
// curriculum title can change its synced URL slug.
const lessonSearchCopy: Partial<
  Record<string, { title: string; description: string }>
> = {
  '/courses/dsa-track/built-in-data-structures/maps': {
    title: 'JavaScript Map vs Object: Examples & Interview Practice',
    description:
      'Learn JavaScript Map keys, iteration and Map-versus-Object trade-offs with worked examples and free interview practice.',
  },
  '/courses/js-track/core-fundamentals/type-coercion': {
    title: 'JavaScript Type Coercion: Rules, Examples & Questions',
    description:
      'Explain JavaScript type coercion, truthiness and equality. Work through conversion examples, then try free interview questions.',
  },
  '/courses/js-track/core-fundamentals/this-and-binding': {
    title: 'JavaScript this Binding: Rules & Interview Questions',
    description:
      'Work out JavaScript this with binding rules, strict-mode and module examples, and free interview practice.',
  },
  '/courses/js-track/core-fundamentals/closures': {
    title: 'JavaScript Closures: Examples & Interview Questions',
    description:
      'Understand lexical scope and JavaScript closures through examples, common pitfalls and free interview questions.',
  },
  '/courses/js-track/core-fundamentals/event-loop': {
    title: 'JavaScript Event Loop: Tasks, Microtasks & Questions',
    description:
      'Trace JavaScript execution through the call stack, Promise microtasks and timers, with worked examples and free interview practice.',
  },
}

export function lessonMetadata(
  path: string,
  title: string,
  description: string | null,
) {
  return pageMetadata({
    title: `${title} — JavaScript Interview Practice`,
    description:
      description ||
      `Explore ${title} and related JavaScript and TypeScript interview practice.`,
    ...lessonSearchCopy[path],
    path,
  })
}
