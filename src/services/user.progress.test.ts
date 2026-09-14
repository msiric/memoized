import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@prisma/client'
import {
  getUserProgressSnapshot,
  getUserProgressWithCurriculum,
  getUserWithSubscriptionDetails,
} from './user'
import { ServiceError } from '@/lib/sentry'

const mocks = vi.hoisted(() => ({ read: vi.fn(), lessons: vi.fn(), report: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ default: { user: { findUnique: mocks.read } } }))
vi.mock('./lesson', () => ({
  getLessonsAndProblems: mocks.lessons,
  getLessonsWithResourcesAndProblems: vi.fn(),
  getLessonsWithProblems: vi.fn(),
}))
vi.mock('@/lib/sentry', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/sentry')>(),
  reportErrorSafely: mocks.report,
}))

const user = {
  id: 'a', email: 'unit@example.invalid', name: 'Unit', image: null,
  customer: { subscriptions: [] },
  lessonProgress: [{ lessonId: 'lesson', completed: true }, { lessonId: 'other-lesson', completed: true }],
  problemProgress: ['p1', 'p5', 'unrelated'].map((problemId) => ({ problemId, completed: true })),
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.read.mockResolvedValue(user)
  mocks.lessons.mockResolvedValue({ allLessons: [], allProblems: [] })
})

describe('Explicit progress availability', () => {
  it('reads full-user completed=true row IDs without entitlement or core-ID filters', async () => {
    expect(await getUserProgressSnapshot('a')).toEqual({
      status: 'ready', userId: 'a', completedLessons: ['lesson', 'other-lesson'],
      completedProblems: ['p1', 'p5', 'unrelated'],
    })
    expect(mocks.read).toHaveBeenCalledWith({
      where: { id: 'a' },
      select: {
        id: true,
        lessonProgress: { where: { completed: true }, select: { lessonId: true } },
        problemProgress: { where: { completed: true }, select: { problemId: true } },
      },
    })
    expect(mocks.lessons).not.toHaveBeenCalled()
  })

  it('returns a genuinely empty successful snapshot only for a found user with no marks', async () => {
    mocks.read.mockResolvedValue({ ...user, lessonProgress: [], problemProgress: [] })
    expect(await getUserProgressSnapshot('a')).toEqual({
      status: 'ready', userId: 'a', completedLessons: [], completedProblems: [],
    })
  })

  it('does not classify an authenticated missing user as anonymous', async () => {
    mocks.read.mockResolvedValue(null)
    expect(await getUserProgressSnapshot('a')).toMatchObject({ status: 'unavailable', userId: 'a' })
    expect(mocks.report).toHaveBeenCalled()
  })

  it.each([
    new ServiceError('Known service failure'),
    new Prisma.PrismaClientKnownRequestError('Query unavailable', { code: 'P2024', clientVersion: 'unit' }),
    new Prisma.PrismaClientInitializationError('Database unavailable', 'unit'),
  ])('reports known read failures and keeps curriculum usable: %s', async (error) => {
    mocks.read.mockRejectedValue(error)
    const result = await getUserProgressWithCurriculum('a')
    expect(result.user).toBeNull()
    expect(result.progress).toMatchObject({ status: 'unavailable', userId: 'a' })
    expect(result.curriculum).toEqual([])
    expect(mocks.report).toHaveBeenCalledWith(error, expect.objectContaining({ userId: 'a', feature: 'progress' }))
  })

  it('returns anonymous progress only when no authenticated user was requested', async () => {
    const result = await getUserProgressWithCurriculum()
    expect(result.progress).toEqual({ status: 'anonymous', userId: null, completedLessons: [], completedProblems: [] })
    expect(mocks.read).not.toHaveBeenCalled()
  })

  it('provides an explicit full snapshot alongside the normal header data', async () => {
    const result = await getUserProgressWithCurriculum('a')
    expect(result.progress).toMatchObject({ status: 'ready', userId: 'a', completedProblems: ['p1', 'p5', 'unrelated'] })
  })

  it('preserves curriculum errors rather than hiding them as progress unavailability', async () => {
    const failure = new ServiceError('Curriculum failed')
    mocks.lessons.mockRejectedValue(failure)
    await expect(getUserProgressWithCurriculum('a')).rejects.toBe(failure)
  })

  it('propagates unexpected read exceptions', async () => {
    const failure = new TypeError('Unexpected failure')
    mocks.read.mockRejectedValue(failure)
    await expect(getUserProgressSnapshot('a')).rejects.toBe(failure)
    await expect(getUserProgressWithCurriculum('a')).rejects.toBe(failure)
  })

  it('leaves the strict normal user/body entitlement lookup unchanged', async () => {
    const failure = new ServiceError('Entitlement lookup failed')
    mocks.read.mockRejectedValueOnce(failure)
    await expect(getUserWithSubscriptionDetails('a')).rejects.toBe(failure)
    mocks.read.mockResolvedValueOnce(null)
    expect(await getUserWithSubscriptionDetails('a')).toBeNull()
  })
})
