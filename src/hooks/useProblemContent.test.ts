import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PROBLEM_CONTENT_SETTLE_MS,
  clearProblemContentCacheForTests,
  prefetchProblemContent,
  useProblemContent,
} from './useProblemContent'

const body = (id: string) => ({ id, question: `Q ${id}`, serializedQuestion: null, serializedAnswer: null })
const fetchMock = vi.fn(async (url: string) => {
  const id = decodeURIComponent(url.split('/')[3])
  return new Response(JSON.stringify(body(id)), { status: 200 })
})
const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(PROBLEM_CONTENT_SETTLE_MS + 1) })

beforeEach(() => {
  vi.useFakeTimers()
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
  clearProblemContentCacheForTests()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useProblemContent', () => {
  it('does not fetch problems that are stepped past before the drawer settles', async () => {
    const { result, rerender } = renderHook(({ id }) => useProblemContent(id), { initialProps: { id: 'a' } })
    for (const id of ['b', 'c', 'd']) {
      await act(async () => { await vi.advanceTimersByTimeAsync(30) })
      rerender({ id })
    }
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/problems/d/content')
    expect(result.current).toMatchObject({ status: 'ready', content: { id: 'd' } })
  })

  it('ignores a late result for a problem the drawer has left', async () => {
    let release: (value: Response) => void = () => {}
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => { release = resolve }))
    const { result, rerender } = renderHook(({ id }) => useProblemContent(id), { initialProps: { id: 'a' } })
    await flush()
    rerender({ id: 'b' })
    await act(async () => { release(new Response(JSON.stringify(body('a')), { status: 200 })) })
    expect(result.current.status).toBe('loading')
    await flush()
    expect(result.current).toMatchObject({ status: 'ready', content: { id: 'b' } })
  })

  it('shares one request between a prefetch and the drawer, then serves from cache', async () => {
    prefetchProblemContent('a')
    const { result } = renderHook(() => useProblemContent('a'))
    await flush()
    expect(result.current.status).toBe('ready')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    renderHook(() => useProblemContent('a'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('reports errors and retries immediately', async () => {
    fetchMock.mockImplementationOnce(async () => new Response('{}', { status: 503 }))
    const { result } = renderHook(() => useProblemContent('a'))
    await flush()
    expect(result.current.status).toBe('error')
    act(() => result.current.retry())
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(result.current.status).toBe('ready')
  })
})
