import { beforeEach, describe, expect, it, vi } from 'vitest'
import prisma from '@/lib/prisma'
import { getPublicCatalogStats } from './catalog-stats'

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: vi.fn(),
    course: { count: vi.fn() },
    section: { count: vi.fn() },
    lesson: { count: vi.fn() },
    problem: { count: vi.fn() },
    resource: { count: vi.fn() },
  },
}))

const baseline = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
}

describe('getPublicCatalogStats', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(prisma.course.count).mockResolvedValue(2)
    vi.mocked(prisma.section.count).mockResolvedValue(8)
    vi.mocked(prisma.lesson.count).mockResolvedValue(120)
    vi.mocked(prisma.problem.count).mockResolvedValue(506)
    vi.mocked(prisma.resource.count).mockResolvedValue(33)
    vi.mocked(prisma.$transaction).mockImplementation(((
      queries: Promise<number>[],
    ) => Promise.all(queries)) as any)
  })

  it('reads only active catalog scalar counts in one RepeatableRead snapshot, including intro', async () => {
    expect(await getPublicCatalogStats()).toEqual(baseline)
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
      isolationLevel: 'RepeatableRead',
    })
    expect(prisma.course.count).toHaveBeenCalledWith({
      where: { isActive: true },
    })
    expect(prisma.section.count).toHaveBeenCalledWith({
      where: { course: { isActive: true } },
    })
    expect(prisma.lesson.count).toHaveBeenCalledWith({
      where: { section: { course: { isActive: true } } },
    })
    expect(prisma.problem.count).toHaveBeenCalledWith({
      where: { lesson: { section: { course: { isActive: true } } } },
    })
    expect(prisma.resource.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { lessonId: null },
          { lesson: { section: { course: { isActive: true } } } },
        ],
      },
    })
  })

  it('does not infer activation from source: old, committed, and retained-task snapshots', async () => {
    expect((await getPublicCatalogStats()).problems).toBe(506)
    vi.mocked(prisma.problem.count).mockResolvedValue(507)
    expect((await getPublicCatalogStats()).problems).toBe(507)
    expect((await getPublicCatalogStats()).problems).toBe(507)
  })

  it('propagates a failed transaction rather than returning zero or baseline counts', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Error('Database unavailable'),
    )
    await expect(getPublicCatalogStats()).rejects.toThrow(
      'Database unavailable',
    )
  })

  it('rejects an incomplete or invalid scalar snapshot', async () => {
    vi.mocked(prisma.problem.count).mockResolvedValue(NaN)
    await expect(getPublicCatalogStats()).rejects.toThrow(
      'Invalid catalog count snapshot',
    )
  })
})
