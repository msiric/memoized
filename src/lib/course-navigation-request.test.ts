import { describe, expect, it, vi } from 'vitest'

const read = vi.hoisted(() => vi.fn(async (userId?: string) => ({ user: userId ?? null })))
vi.mock('@/services/user', () => ({ getUserProgressWithCurriculum: read }))
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>()
  // Model the RSC request cache: memoize per argument within one "request".
  const cache = <T extends (...args: unknown[]) => unknown>(fn: T) => {
    const seen = new Map<unknown, unknown>()
    return ((...args: unknown[]) => {
      if (!seen.has(args[0])) seen.set(args[0], fn(...args))
      return seen.get(args[0])
    }) as T
  }
  return { ...react, cache }
})

describe('course navigation snapshot', () => {
  it('reads curriculum and progress once when header and navigation both ask', async () => {
    const { getCourseNavigationSnapshot } = await import('./course-navigation-request')
    const [header, navigation] = await Promise.all([
      getCourseNavigationSnapshot('user_1'),
      getCourseNavigationSnapshot('user_1'),
    ])
    expect(header).toBe(navigation)
    expect(read).toHaveBeenCalledTimes(1)
  })
})
