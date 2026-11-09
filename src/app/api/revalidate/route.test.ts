import { afterEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { POST } from './route'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const SECRET = 'x'.repeat(48)
const call = (auth?: string) =>
  POST(new Request('https://www.memoized.io/api/revalidate', { method: 'POST', headers: auth ? { authorization: auth } : {} }))

describe('POST /api/revalidate', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

  it('refreshes the cached signed-out lessons with the right secret', async () => {
    vi.stubEnv('REVALIDATE_SECRET', SECRET)
    const response = await call(`Bearer ${SECRET}`)
    expect(response.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith('/public/courses', 'layout')
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
