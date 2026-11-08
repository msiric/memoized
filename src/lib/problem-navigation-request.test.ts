import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserProgressWithProblems } from '@/services/user'
import { getProblemNavigationSnapshot } from './problem-navigation-request'

const request = vi.hoisted(() => ({ values: new Map<unknown, Map<unknown, unknown>>() }))

vi.mock('react', async (importOriginal) => {
  const react = await importOriginal<typeof import('react')>()
  return {
    ...react,
    cache: (fn: (arg?: unknown) => unknown) => (arg?: unknown) => {
      const entries = request.values.get(fn) ?? new Map()
      if (!entries.has(arg)) entries.set(arg, fn(arg))
      request.values.set(fn, entries)
      return entries.get(arg)
    },
  }
})
vi.mock('@/services/user', () => ({ getUserProgressWithProblems: vi.fn() }))


const lesson = {
  id: 'lesson-1',
  slug: 'closures',
  title: 'Closures',
  href: '/courses/js/closures',
  description: 'A long lesson description that the sidebar never renders',
  access: 'FREE',
  order: 1,
  section: { order: 1 },
  problems: [
    { id: 'p-1', slug: 'counter', title: 'Counter', href: '/problems/counter', link: 'https://example.test/counter', difficulty: 'EASY' },
  ],
}

describe('getProblemNavigationSnapshot', () => {
  beforeEach(() => {
    request.values.clear()
    vi.mocked(getUserProgressWithProblems).mockReset().mockResolvedValue({
      user: null,
      progress: { status: 'anonymous' },
      problemList: [lesson],
      lessons: [lesson],
      problems: [{ id: 'p-1', title: 'Counter', href: '/problems/counter', difficulty: 'EASY' }],
    } as any)
  })

  it('sends only rendered navigation fields and id-only progress totals', async () => {
    const data = await getProblemNavigationSnapshot('user-1')
    expect(data.navigation?.sections).toEqual([
      {
        id: 'lesson-1',
        slug: 'closures',
        title: 'Closures',
        href: '/courses/js/closures',
        description: null,
        order: 1,
        access: 'FREE',
        links: [{ id: 'p-1', title: 'Counter', href: 'https://example.test/counter', order: 1 }],
      },
    ])
    expect(data.lessonIds).toEqual([{ id: 'lesson-1' }])
    expect(data.problemIds).toEqual([{ id: 'p-1' }])
    expect(JSON.stringify(data)).not.toContain('never renders')
  })

  it('shares one catalog read between the header and sidebar slots in a request', async () => {
    const [header, sidebar] = await Promise.all([
      getProblemNavigationSnapshot('user-1'),
      getProblemNavigationSnapshot('user-1'),
    ])
    expect(header).toBe(sidebar)
    expect(getUserProgressWithProblems).toHaveBeenCalledTimes(1)
  })
})
