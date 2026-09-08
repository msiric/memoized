import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  coursePath,
  lessonMetadata,
  lessonPath,
  pageMetadata,
  resourcePath,
} from './seo'

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
})
