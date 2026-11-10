import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  coursePath,
  lessonMetadata,
  lessonPath,
  NOINDEX_LESSON_PATHS,
  pageMetadata,
  resourcePath,
  lessonSearchCopy,
  sectionMetadata,
  sectionSearchCopy,
} from './seo'
import { completeCurriculum } from '@/constants/curriculum'

vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://www.memoized.io' }))
afterEach(() => vi.unstubAllEnvs())

describe('Search metadata contract', () => {
  it('gives distinct resources their own canonical and explicit visibility', () => {
    const meta = pageMetadata({
      title: 'Promises',
      description: 'Reference overview',
      path: resourcePath('promise-internals'),
      index: false,
    })
    expect(meta.title).toEqual({ absolute: 'Promises | Memoized' })
    expect(meta.alternates?.canonical).toBe(
      'https://www.memoized.io/resources/promise-internals',
    )
    expect(meta.robots).toEqual({ index: false, follow: true })
    expect(resourcePath('intro')).toBe('/resources')
  })
  it('does not index preview deployments even for otherwise public content', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(
      pageMetadata({ title: 'Public', description: 'Public', path: '/courses' })
        .robots,
    ).toEqual({ index: false, follow: true })
  })
  it('keeps editorial titles separate from stable URL segments', () => {
    const path = lessonPath('dsa-track', 'built-in-data-structures', 'maps')
    expect(lessonMetadata(path, 'Maps', null).title).toEqual({
      absolute:
        'JavaScript Map vs Object: Examples & Interview Practice | Memoized',
    })
    expect(lessonMetadata(path, 'Maps', null).alternates?.canonical).toBe(
      `https://www.memoized.io${path}`,
    )
    expect(coursePath('a&b')).toBe('/courses/a%26b')
  })
  it.each([
    ['js-track', 'core-fundamentals', 'JavaScript Interview Practice'],
    ['js-track', 'typescript-introduction', 'TypeScript Interview Practice'],
    ['dsa-track', 'common-techniques', 'DSA in JavaScript'],
  ])('names the track of %s/%s lessons in the title', (course, section, suffix) => {
    const meta = lessonMetadata(lessonPath(course, section, 'example'), 'Example', 'Desc')
    expect(meta.title).toEqual({ absolute: `Example — ${suffix} | Memoized` })
  })
  it('noindexes (but still follows) the reviewed thin previews only', () => {
    expect(NOINDEX_LESSON_PATHS.size).toBe(5)
    for (const path of NOINDEX_LESSON_PATHS)
      expect(lessonMetadata(path, 'Thin', null).robots).toEqual({ index: false, follow: true })
    expect(
      lessonMetadata(lessonPath('dsa-track', 'advanced-topics', 'tries'), 'Tries', null).robots,
    ).toEqual({ index: true, follow: true })
  })
  it.each([
    ['dsa-track', 'common-techniques'],
    ['js-track', 'typescript-introduction'],
    ['js-track', 'core-fundamentals'],
  ])('uses the lesson\'s own description on %s/%s when it has one', (course, section) => {
    const meta = lessonMetadata(lessonPath(course, section, 'x'), 'X', 'Own description.')
    expect(meta.description).toBe('Own description.')
    expect(meta.openGraph?.description).toBe('Own description.')
  })
  it('keeps fallback descriptions on the lesson track', () => {
    expect(lessonMetadata(lessonPath('dsa-track', 'common-techniques', 'x'), 'Heaps', null).description)
      .toBe('Learn Heaps in JavaScript with worked examples and data-structure interview practice.')
    expect(lessonMetadata(lessonPath('js-track', 'typescript-introduction', 'x'), 'Enums', null).description)
      .toBe('Explore Enums and related TypeScript interview practice.')
  })
})

describe('Hand-written search copy (R2)', () => {
  const entries = [
    ...Object.entries(lessonSearchCopy),
    ...Object.entries(sectionSearchCopy),
  ]

  it.each(entries)('%s fits search result limits', (_path, copy) => {
    // "<title> | Memoized" stays within ~70 characters before truncation.
    expect(`${copy!.title} | Memoized`.length).toBeLessThanOrEqual(70)
    expect(copy!.description.length).toBeGreaterThanOrEqual(100)
    expect(copy!.description.length).toBeLessThanOrEqual(160)
  })

  it('only targets sections that exist in the curriculum', () => {
    const sections = new Set(
      completeCurriculum.flatMap((course) => course.sections.map((s) => s.href)),
    )
    for (const path of Object.keys(sectionSearchCopy)) {
      expect(sections, path).toContain(path)
    }
  })

  it('uses the hand-written copy for a section hub', () => {
    const meta = sectionMetadata(
      '/courses/js-track/advanced-concepts',
      'Advanced Concepts - JS Track',
      'fallback',
    )
    expect(meta.title).toEqual({
      absolute: 'Advanced JavaScript Concepts: Async, Generators & Patterns | Memoized',
    })
    expect(meta.alternates?.canonical).toBe(
      'https://www.memoized.io/courses/js-track/advanced-concepts',
    )
  })

  it('keeps the curriculum title for sections without hand-written copy', () => {
    const meta = sectionMetadata('/courses/x/y', 'Y - X', 'Y description')
    expect(meta.title).toEqual({ absolute: 'Y - X | Memoized' })
    expect(meta.description).toBe('Y description')
  })
})
