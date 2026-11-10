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
export const lessonSearchCopy: Partial<
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
  '/courses/js-track/core-fundamentals/scope-and-hoisting': {
    title: 'JavaScript Scope & Hoisting: var, let, const and the TDZ',
    description:
      'Understand JavaScript scope and hoisting: var versus let and const, function hoisting and the temporal dead zone, with examples and free interview questions.',
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

// Section hubs, chosen from Search Console queries (R2, 2026-11-10). Titles
// carry the language because searchers type it ("advanced javascript
// concepts"); descriptions name only lessons the section actually contains.
export const sectionSearchCopy: Partial<
  Record<string, { title: string; description: string }>
> = {
  '/courses/js-track/core-fundamentals': {
    title: 'JavaScript Fundamentals: Scope, Closures & the Event Loop',
    description:
      'Core JavaScript for interviews: types and coercion, scope and hoisting, closures, this, prototypes, modules, the call stack and the event loop.',
  },
  '/courses/js-track/advanced-concepts': {
    title: 'Advanced JavaScript Concepts: Async, Generators & Patterns',
    description:
      'Advanced JavaScript concepts for interviews: promise patterns, async/await, generators, metaprogramming, web workers, memory leaks and design patterns.',
  },
  '/courses/js-track/typescript-introduction': {
    title: 'TypeScript Fundamentals: Types, Generics & Type Guards',
    description:
      'Learn TypeScript from basic types to generics, conditional and utility types, type guards, declarations and project configuration, with interview practice.',
  },
  '/courses/js-track/frontend-development': {
    title: 'Frontend Interview Topics: Rendering to Security',
    description:
      'Frontend interview topics: component architecture, state management, the virtual DOM, web APIs, CORS, server-side rendering, performance and accessibility.',
  },
  '/courses/dsa-track/built-in-data-structures': {
    title: 'JavaScript Built-in Data Structures: Arrays, Maps & Sets',
    description:
      'How JavaScript strings, numbers, arrays, objects, sets and maps behave, and when to use each one in coding interviews, with worked examples.',
  },
  '/courses/dsa-track/user-defined-data-structures': {
    title: 'Data Structures in JavaScript: Linked Lists to Tries',
    description:
      'Implement linked lists, stacks, queues, hash tables, trees, graphs, heaps and tries in JavaScript, with worked examples and interview practice.',
  },
  '/courses/dsa-track/common-techniques': {
    title: 'Coding Interview Patterns in JavaScript',
    description:
      'Coding interview patterns in JavaScript: sliding window, two pointers, binary search, tree and graph traversal, heaps, backtracking, greedy and memoization.',
  },
  '/courses/dsa-track/advanced-topics': {
    title: 'Advanced Algorithms in JavaScript: DP, Graphs & More',
    description:
      'Advanced algorithms in JavaScript: dynamic programming, segment trees, shortest paths, minimum spanning trees, network flow and bit manipulation.',
  },
}

export function sectionMetadata(
  path: string,
  title: string,
  description: string,
) {
  return pageMetadata({ title, description, ...sectionSearchCopy[path], path })
}

// Owner decision O2 (2026-11-08): premium previews whose free practice does not
// yet stand on its own. They stay reachable and followed, but are kept out of
// the index and the sitemap until their content wave expands them.
export const NOINDEX_LESSON_PATHS: ReadonlySet<string> = new Set([
  '/courses/dsa-track/advanced-topics/maximum-flow',
  '/courses/dsa-track/advanced-topics/bloom-filters',
  '/courses/dsa-track/advanced-topics/randomized-algorithms',
  '/courses/dsa-track/advanced-topics/union-find',
  '/courses/dsa-track/common-techniques/graph-dfs',
])

export function lessonTitleSuffix(path: string) {
  if (path.startsWith('/courses/js-track/typescript-introduction/'))
    return 'TypeScript Interview Practice'
  if (path.startsWith('/courses/dsa-track/')) return 'DSA in JavaScript'
  return 'JavaScript Interview Practice'
}

function fallbackLessonDescription(path: string, title: string) {
  if (path.startsWith('/courses/dsa-track/'))
    return `Learn ${title} in JavaScript with worked examples and data-structure interview practice.`
  const track = lessonTitleSuffix(path).replace(' Interview Practice', '')
  return `Explore ${title} and related ${track} interview practice.`
}

export function lessonMetadata(
  path: string,
  title: string,
  description: string | null,
) {
  return pageMetadata({
    title: `${title} — ${lessonTitleSuffix(path)}`,
    description: description || fallbackLessonDescription(path, title),
    ...lessonSearchCopy[path],
    path,
    index: !NOINDEX_LESSON_PATHS.has(path),
  })
}
