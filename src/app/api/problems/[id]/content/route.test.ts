import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProblemContent } from '@/services/problem'
import { reportErrorSafely } from '@/lib/sentry'
import { GET } from './route'

vi.mock('@/services/problem', () => ({ getProblemContent: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn() }))

const id = '0f8fad5b-d9cb-469f-a165-70867728950e'
const call = (value: string) => GET(new Request('http://test.local'), { params: { id: value } })

describe('GET /api/problems/[id]/content', () => {
  beforeEach(() => vi.resetAllMocks())

  it('returns only the free question and answer fields with a short shared cache', async () => {
    const body = { id, question: 'Q', serializedQuestion: null, serializedAnswer: { compiledSource: 'A' } }
    vi.mocked(getProblemContent).mockResolvedValue(body)
    const response = await call(id)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=60, stale-while-revalidate=60')
    expect(await response.json()).toEqual(body)
    expect(getProblemContent).toHaveBeenCalledWith(id)
  })

  it('accepts non-UUID ids such as the CI reader-layout seed fixtures', async () => {
    vi.mocked(getProblemContent).mockResolvedValue({ id: 'fixture-problem-2', question: 'Q', serializedQuestion: null, serializedAnswer: null })
    const response = await call('fixture-problem-2')
    expect(response.status).toBe(200)
    expect(getProblemContent).toHaveBeenCalledWith('fixture-problem-2')
  })

  it('rejects malformed ids without touching the database', async () => {
    const response = await call('../../lessons')
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(getProblemContent).not.toHaveBeenCalled()
  })

  it('returns an uncached 404 for an unknown problem', async () => {
    vi.mocked(getProblemContent).mockResolvedValue(null)
    const response = await call(id)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('reports failures and returns an uncached 503', async () => {
    vi.mocked(getProblemContent).mockRejectedValue(new Error('db down'))
    const response = await call(id)
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(reportErrorSafely).toHaveBeenCalled()
  })
})
