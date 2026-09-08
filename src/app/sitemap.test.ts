import { afterEach, describe, expect, it, vi } from 'vitest'
import sitemap from './sitemap'
import { getSearchCatalog } from '@/services/search'
vi.mock('@/services/search', async (original) => ({
  ...(await original<typeof import('@/services/search')>()),
  getSearchCatalog: vi.fn(),
}))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://www.memoized.io' }))
afterEach(() => vi.unstubAllEnvs())

describe('Main sitemap', () => {
  it('emits canonical inventory without fabricated update timestamps', async () => {
    vi.mocked(getSearchCatalog).mockResolvedValue({
      courses: [],
      resources: [],
      posts: [],
    })
    const entries = await sitemap()
    expect(entries.some((entry) => entry.url.endsWith('/problems'))).toBe(true)
    expect(entries.every((entry) => !('lastModified' in entry))).toBe(true)
  })
  it('does not advertise preview deployments', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(await sitemap()).toEqual([])
  })
})
