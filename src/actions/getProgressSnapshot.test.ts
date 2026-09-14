import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProgressSnapshot } from './getProgressSnapshot'

const mocks = vi.hoisted(() => ({ session: vi.fn(), snapshot: vi.fn(), report: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('@/services/user', () => ({ getUserProgressSnapshot: mocks.snapshot }))
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: mocks.report }))

beforeEach(() => vi.resetAllMocks())

describe('getProgressSnapshot', () => {
  it('uses only the current authenticated session for a full-user snapshot', async () => {
    mocks.session.mockResolvedValue({ userId: 'session-user' })
    const snapshot = {
      status: 'ready', userId: 'session-user',
      completedLessons: ['lesson'], completedProblems: ['p1', 'p5', 'unrelated'],
    }
    mocks.snapshot.mockResolvedValue(snapshot)
    expect(await getProgressSnapshot()).toEqual(snapshot)
    expect(mocks.snapshot).toHaveBeenCalledWith('session-user')
  })

  it('returns the explicit anonymous discriminant with no database lookup', async () => {
    mocks.session.mockResolvedValue(null)
    expect(await getProgressSnapshot()).toEqual({
      status: 'anonymous', userId: null, completedLessons: [], completedProblems: [],
    })
    expect(mocks.snapshot).not.toHaveBeenCalled()
  })

  it('does not turn a malformed authenticated session into anonymous history', async () => {
    mocks.session.mockResolvedValue({ user: { name: 'Present' } })
    expect(await getProgressSnapshot()).toMatchObject({ status: 'unavailable', userId: null })
    expect(mocks.snapshot).not.toHaveBeenCalled()
    expect(mocks.report).toHaveBeenCalled()
  })

  it('preserves known unavailable results rather than inventing empty marks', async () => {
    mocks.session.mockResolvedValue({ userId: 'session-user' })
    mocks.snapshot.mockResolvedValue({ status: 'unavailable', userId: 'session-user', message: 'Retry' })
    expect(await getProgressSnapshot()).toEqual({ status: 'unavailable', userId: 'session-user', message: 'Retry' })
  })

  it('propagates unexpected session and progress exceptions', async () => {
    const error = new Error('Unexpected')
    mocks.session.mockRejectedValueOnce(error)
    await expect(getProgressSnapshot()).rejects.toBe(error)
    mocks.session.mockResolvedValue({ userId: 'session-user' })
    mocks.snapshot.mockRejectedValueOnce(error)
    await expect(getProgressSnapshot()).rejects.toBe(error)
  })
})
