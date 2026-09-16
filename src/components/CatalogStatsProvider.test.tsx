import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { CatalogStatsProvider, useCatalogStats } from './CatalogStatsProvider'
import { CatalogProblemStat } from './CatalogProblemStat'
import { SolveProblems } from './SolveProblems'
import { FreeOfferingHighlight } from './FreeOfferingHighlight'

vi.mock('next/image', () => ({ default: () => null }))

const baseline = {
  courses: 2,
  sections: 8,
  lessons: 120,
  problems: 506,
  resources: 33,
}
const response = (problems: number): Response =>
  ({
    ok: true,
    json: async () => ({
      status: 'available',
      stats: { ...baseline, problems },
    }),
  }) as Response

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

function StateProbe() {
  const state = useCatalogStats()
  return <output data-testid="state">{JSON.stringify(state)}</output>
}

function HomepageWidgets() {
  return (
    <CatalogStatsProvider>
      <CatalogProblemStat />
      <SolveProblems />
      <FreeOfferingHighlight />
      <StateProbe />
    </CatalogStatsProvider>
  )
}

describe('homepage catalog snapshot', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps the homepage server render count-free and defers the read until mount', () => {
    const html = renderToString(<HomepageWidgets />)
    expect(html).toContain('Loading problem count')
    expect(html).not.toMatch(/\b(?:506|507)\b/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([506, 507])(
    'shares one read across the three widgets for %i problems',
    async (problems) => {
      const pending = deferred<Response>()
      fetchMock.mockReturnValue(pending.promise)
      const { container } = render(<HomepageWidgets />)
      expect(screen.getByText('Loading problem count…')).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/\b(?:0|506|507)\b/)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock).toHaveBeenCalledWith('/api/catalog-stats', {
        cache: 'no-store',
        credentials: 'omit',
        signal: expect.any(AbortSignal),
      })
      await act(async () => pending.resolve(response(problems)))
      expect(screen.getByText(String(problems))).toBeInTheDocument()
      expect(screen.getByText(`${problems} Problems`)).toBeInTheDocument()
      expect(
        screen.getByText(`${problems} JavaScript problems`),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          `${problems} theory and coding questions accessible to everyone`,
        ),
      ).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    },
  )

  it.each(['http', 'network', 'malformed', 'undefined'] as const)(
    'shows unavailable without invented zero or baseline counts after %s failure',
    async (failure) => {
      if (failure === 'network')
        fetchMock.mockRejectedValue(new Error('offline'))
      else
        fetchMock.mockResolvedValue({
          ok: failure !== 'http',
          json: async () =>
            failure === 'undefined'
              ? undefined
              : { status: 'available', stats: {} },
        } as Response)
      const { container } = render(<HomepageWidgets />)
      await screen.findByText('Problem count unavailable')
      expect(screen.getByText('All JavaScript problems')).toBeInTheDocument()
      expect(screen.getByText('Practice Problems')).toBeInTheDocument()
      expect(container.textContent).not.toMatch(/\b(?:0|506|507)\b/)
      expect(screen.getByTestId('state').textContent).toContain(
        '"status":"unavailable"',
      )
    },
  )

  it('refreshes on visibility return and does not keep an old exact count while loading or failed', async () => {
    const next = deferred<Response>()
    fetchMock
      .mockResolvedValueOnce(response(506))
      .mockReturnValueOnce(next.promise)
    render(<HomepageWidgets />)
    await screen.findByText('506 Problems')
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.queryByText('506 Problems')).not.toBeInTheDocument()
    expect(screen.getByText('Loading problem count…')).toBeInTheDocument()
    await act(async () => next.reject(new Error('offline')))
    expect(screen.getByText('Problem count unavailable')).toBeInTheDocument()
    expect(screen.queryByText('506 Problems')).not.toBeInTheDocument()
  })

  it('recovers from unavailable on the next visibility return rather than caching failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response(507))
    render(<HomepageWidgets />)
    await screen.findByText('Problem count unavailable')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await screen.findByText('507 Problems')
    expect(screen.queryByText('Problem count unavailable')).not.toBeInTheDocument()
  })

  it.each(['late-success', 'late-failure'] as const)(
    'aborts and ignores %s from an older revision',
    async (late) => {
      const old = deferred<Response>()
      const current = deferred<Response>()
      fetchMock
        .mockReturnValueOnce(old.promise)
        .mockReturnValueOnce(current.promise)
      render(<HomepageWidgets />)
      const oldSignal = fetchMock.mock.calls[0][1]?.signal
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      expect(oldSignal?.aborted).toBe(true)
      await act(async () => current.resolve(response(507)))
      expect(screen.getByText('507 Problems')).toBeInTheDocument()
      await act(async () => {
        if (late === 'late-success') old.resolve(response(506))
        else old.reject(new Error('late failure'))
      })
      expect(screen.getByText('507 Problems')).toBeInTheDocument()
      expect(screen.queryByText('506 Problems')).not.toBeInTheDocument()
    },
  )

  it('ignores an old body parse even when its HTTP response had already completed', async () => {
    const oldBody = deferred<unknown>()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: () => oldBody.promise,
      } as Response)
      .mockResolvedValueOnce(response(507))
    render(<HomepageWidgets />)
    await act(async () => {})
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await screen.findByText('507 Problems')
    await act(async () =>
      oldBody.resolve({ status: 'available', stats: baseline }),
    )
    expect(screen.getByText('507 Problems')).toBeInTheDocument()
  })

  it('refreshes a persisted browser page and remount, without storing a global snapshot', async () => {
    fetchMock
      .mockResolvedValueOnce(response(506))
      .mockResolvedValue(response(507))
    const first = render(<HomepageWidgets />)
    await screen.findByText('506 Problems')
    const event = new Event('pageshow')
    Object.defineProperty(event, 'persisted', { value: true })
    act(() => window.dispatchEvent(event))
    await screen.findByText('507 Problems')
    first.unmount()
    render(<HomepageWidgets />)
    await screen.findByText('507 Problems')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('aborts on unmount and removes refresh listeners', async () => {
    const pending = deferred<Response>()
    fetchMock.mockReturnValue(pending.promise)
    const { unmount } = render(<HomepageWidgets />)
    const signal = fetchMock.mock.calls[0][1]?.signal
    unmount()
    expect(signal?.aborted).toBe(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await act(async () => pending.resolve(response(507)))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('handles undefined children and widgets outside a provider without a fake fallback or extra read', async () => {
    render(
      <>
        <CatalogProblemStat />
        <SolveProblems />
        <FreeOfferingHighlight />
      </>,
    )
    expect(screen.getByText('Problem count unavailable')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
    fetchMock.mockResolvedValue(response(507))
    const { unmount } = render(<CatalogStatsProvider>{undefined}</CatalogStatsProvider>)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    unmount()
  })
})
