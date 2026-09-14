import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProblemCompletion, useProgressInitialization } from './useProblemCompletion'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import type { ProgressSnapshotResult } from '@/types/progress'

const mocks = vi.hoisted(() => ({
  session: vi.fn(), mark: vi.fn(), error: vi.fn(), notify: vi.fn(), response: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
vi.mock('@/lib/sentry', () => ({ handleError: mocks.error }))
vi.mock('@/utils/response', () => ({ handleResponse: mocks.response }))
vi.mock('notistack', () => ({ enqueueSnackbar: mocks.notify }))

const store = () => useContentStore.getState()
const ready = (userId = 'a', completedProblems: string[] = []): ProgressSnapshotResult => ({
  status: 'ready', userId, completedProblems, completedLessons: ['other-lesson'],
})
const confirmation = (completed: boolean, problemId = 'p1', userId = 'a') => ({
  success: true, userId, problemId, completed, message: 'Saved', showSnackbar: true,
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
function session(userId: string | null | undefined) {
  mocks.session.mockReturnValue({
    data: userId ? { userId } : null,
    status: userId === undefined ? 'loading' : userId === null ? 'unauthenticated' : 'authenticated',
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  useContentStore.setState(useContentStore.getInitialState(), true)
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  session('a')
  store().hydrateProgressSnapshot({ userId: 'a', completedProblems: [], completedLessons: [] })
})
afterEach(cleanup)

describe('useProblemCompletion', () => {
  it('shares a lock across two controls and commits the desired value only once', async () => {
    const save = deferred<ReturnType<typeof confirmation>>()
    mocks.mark.mockReturnValue(save.promise)
    const { result } = renderHook(() => [useProblemCompletion('p1'), useProblemCompletion('p1')])
    let request!: Promise<boolean>
    act(() => { request = result.current[0].setCompleted(true) })
    expect(result.current.every((item) => item.isPending && item.isDisabled && !item.isCompleted)).toBe(true)
    await act(async () => { expect(await result.current[1].setCompleted(true)).toBe(false) })
    expect(mocks.mark).toHaveBeenCalledTimes(1)
    await act(async () => { save.resolve(confirmation(true)); expect(await request).toBe(true) })
    expect(result.current.every((item) => item.isCompleted && !item.isPending)).toBe(true)
    expect(mocks.mark).toHaveBeenCalledWith({ problemId: 'p1', completed: true, expectedUserId: 'a' })
  })

  it('handles repeated explicit marks and unmarks without a blind toggle', async () => {
    mocks.mark.mockImplementation(async ({ completed }) => confirmation(completed))
    const { result } = renderHook(() => useProblemCompletion('p1'))
    for (const completed of [true, true, false, false]) {
      await act(async () => { expect(await result.current.setCompleted(completed)).toBe(true) })
      expect(result.current.isCompleted).toBe(completed)
    }
  })

  it.each(['response', 'exception'])('keeps confirmed marks and exposes a retryable %s failure', async (kind) => {
    store().hydrateProgressSnapshot({ userId: 'a', completedLessons: [], completedProblems: ['p1'] })
    if (kind === 'response') mocks.mark.mockResolvedValueOnce({ success: false, message: 'Please retry' })
    else mocks.mark.mockRejectedValueOnce(new Error('network failure'))
    const { result } = renderHook(() => useProblemCompletion('p1'))
    await act(async () => { expect(await result.current.setCompleted(false)).toBe(false) })
    expect(result.current).toMatchObject({ isCompleted: true, isPending: false, isDisabled: false })
    expect(result.current.error).toBeTruthy()
    expect(mocks.error).toHaveBeenCalled()
    mocks.mark.mockResolvedValueOnce(confirmation(false))
    await act(async () => { await result.current.setCompleted(false) })
    expect(result.current).toMatchObject({ isCompleted: false, error: null })
  })

  it('prompts anonymous visitors while loading and unavailable users cannot write', async () => {
    session(null)
    const { result, rerender } = renderHook(() => useProblemCompletion('p1'))
    await act(async () => { await result.current.setCompleted(true) })
    expect(useAuthStore.getState().isModalOpen).toBe(true)
    session(undefined)
    rerender()
    expect(result.current.isDisabled).toBe(true)
    session('a')
    rerender()
    act(() => store().setProgressUnavailable('a'))
    await act(async () => { await result.current.setCompleted(true) })
    expect(result.current.isDisabled).toBe(true)
    expect(mocks.mark).not.toHaveBeenCalled()
  })

  it('does not apply a response to a different user, even after switching back', async () => {
    const save = deferred<ReturnType<typeof confirmation>>()
    mocks.mark.mockReturnValue(save.promise)
    const { result, rerender } = renderHook(() => useProblemCompletion('p1'))
    let request!: Promise<boolean>
    act(() => { request = result.current.setCompleted(true) })
    session('b')
    rerender()
    expect(store().completedProblems.size).toBe(0)
    session('a')
    rerender()
    act(() => store().hydrateProgressSnapshot({ userId: 'a', completedLessons: [], completedProblems: [] }))
    await act(async () => { save.resolve(confirmation(true)); expect(await request).toBe(false) })
    expect(result.current.isCompleted).toBe(false)
    expect(mocks.response).not.toHaveBeenCalled()
  })

  it('ignores late failures from a previous account', async () => {
    const save = deferred<ReturnType<typeof confirmation>>()
    mocks.mark.mockReturnValue(save.promise)
    const { result, rerender } = renderHook(() => useProblemCompletion('p1'))
    let request!: Promise<boolean>
    act(() => { request = result.current.setCompleted(true) })
    session('b')
    rerender()
    await act(async () => { save.reject(new Error('old request')); await request })
    expect(result.current.error).toBeNull()
    expect(mocks.notify).not.toHaveBeenCalled()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('rejects mismatched save confirmations rather than assigning another account', async () => {
    mocks.mark.mockResolvedValue(confirmation(true, 'p1', 'b'))
    const { result } = renderHook(() => useProblemCompletion('p1'))
    await act(async () => { expect(await result.current.setCompleted(true)).toBe(false) })
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.error).toBeTruthy()
  })

  it('finishes separate problem saves out of order and retains unrelated marks', async () => {
    const first = deferred<ReturnType<typeof confirmation>>()
    const second = deferred<ReturnType<typeof confirmation>>()
    store().hydrateProgressSnapshot({ userId: 'a', completedLessons: ['lesson'], completedProblems: ['optional'] })
    mocks.mark.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => [useProblemCompletion('p1'), useProblemCompletion('p2')])
    let requests!: Promise<boolean>[]
    act(() => { requests = result.current.map((item) => item.setCompleted(true)) })
    await act(async () => { second.resolve(confirmation(true, 'p2')); await requests[1] })
    await act(async () => { first.resolve(confirmation(true)); await requests[0] })
    expect(store().completedProblems).toEqual(new Set(['optional', 'p1', 'p2']))
    expect(store().completedLessons).toEqual(new Set(['lesson']))
  })
})

describe('full-user header initialization', () => {
  it('waits for known session ownership and ignores a stale other-user RSC payload', () => {
    session(undefined)
    useContentStore.setState(useContentStore.getInitialState(), true)
    const { rerender } = renderHook(({ progress }) => useProgressInitialization(progress, null), {
      initialProps: { progress: ready('a', ['p1', 'optional', 'unrelated']) },
    })
    expect(store().progressStatus).toBe('loading')
    session('a')
    rerender({ progress: ready('a', ['p1', 'optional', 'unrelated']) })
    expect(store().completedProblems.size).toBe(3)
    session('b')
    rerender({ progress: ready('a', ['old-user-mark']) })
    expect(store().progressStatus).toBe('loading')
    expect(store().completedProblems.size).toBe(0)
    rerender({ progress: ready('b', ['b-mark']) })
    expect(store().completedProblems).toEqual(new Set(['b-mark']))
  })

  it('treats explicit read failure as unavailable, not empty successful history', () => {
    const { rerender } = renderHook(({ progress }) => useProgressInitialization(progress, null), {
      initialProps: { progress: { status: 'unavailable', userId: 'a', message: 'Unavailable' } as ProgressSnapshotResult },
    })
    expect(store().progressStatus).toBe('unavailable')
    rerender({ progress: ready() })
    expect(store().progressStatus).toBe('ready')
    session(null)
    rerender({ progress: { status: 'anonymous', userId: null, completedLessons: [], completedProblems: [] } })
    expect(store().progressStatus).toBe('anonymous')
    expect(store().completedLessons.size).toBe(0)
  })
})
