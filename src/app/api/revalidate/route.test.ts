import { afterEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath, revalidateTag } from 'next/cache'
import { POST } from './route'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('@/services/search', () => ({ CATALOG_CACHE_TAG: 'catalog' }))
const SECRET = 'x'.repeat(48)
const call = (auth?: string) =>
  POST(new Request('https://www.memoized.io/api/revalidate', { method: 'POST', headers: auth ? { authorization: auth } : {} }))

describe('POST /api/revalidate', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('refreshes the cached signed-out lessons with the right secret', async () => {
    vi.stubEnv('REVALIDATE_SECRET', SECRET)
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/public', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/')
    expect(revalidateTag).toHaveBeenCalledWith('catalog')
  })

  it.each([undefined, 'Bearer wrong', `Basic ${SECRET}`, `Bearer ${SECRET}x`])('refuses %s', async (auth) => {
    vi.stubEnv('REVALIDATE_SECRET', SECRET)
    expect((await call(auth)).status).toBe(401)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('stays closed when the secret is missing or too short', async () => {
    vi.stubEnv('REVALIDATE_SECRET', 'short')
    expect((await call('Bearer short')).status).toBe(503)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
