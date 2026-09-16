import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPublicCatalogStats } from '@/services/catalog-stats'
import { catalogStatsUnavailable } from '@/types/catalog-stats'
import { reportErrorSafely } from '@/lib/sentry'
import { GET, dynamic } from './route'

vi.mock('@/services/catalog-stats', () => ({ getPublicCatalogStats: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn() }))

const baseline = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
}

describe('GET /api/catalog-stats', () => {
  beforeEach(() => vi.resetAllMocks())

  it.each([506, 507])(
    'returns an uncached public snapshot for %i committed problems',
    async (problems) => {
      const stats = { ...baseline, problems }
      vi.mocked(getPublicCatalogStats).mockResolvedValue(stats)
      const response = await GET()
      expect(dynamic).toBe('force-dynamic')
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ status: 'available', stats })
    },
  )

  it('projects only public counts, never source bodies, IDs, progress or answers', async () => {
    vi.mocked(getPublicCatalogStats).mockResolvedValue({
      ...baseline,
      id: 'private',
      user: { id: 'private' },
      body: 'paid',
      answer: 'private',
      progress: [{ completed: true }],
    } as any)
    expect(await (await GET()).json()).toEqual({
      status: 'available',
      stats: baseline,
    })
  })

  it('returns sanitized 503 unavailable, not a successful zero/baseline result', async () => {
    vi.mocked(getPublicCatalogStats).mockRejectedValue(
      new Error('private database connection details'),
    )
    const response = await GET()
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(catalogStatsUnavailable)
    expect(reportErrorSafely).toHaveBeenCalledWith(
      expect.any(Error), { feature: 'catalog', action: 'public-counts' },
    )
  })

  it.each([undefined, null, {}, { ...baseline, problems: -1 }])(
    'fails closed on an invalid result',
    async (value) => {
      vi.mocked(getPublicCatalogStats).mockResolvedValue(value as any)
      const response = await GET()
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual(catalogStatsUnavailable)
    },
  )
})
