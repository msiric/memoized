import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TypescriptFirstPass } from './TypescriptFirstPass'
import { Wrapper as CourseHeader } from '@/app/courses/[courseSlug]/@header/wrapper'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import { useProblemCompletion } from '@/hooks/useProblemCompletion'
import { createFirstPassLessonFixture } from '@/test-fixtures/typescript-first-pass'
import { resolveTypescriptFirstPass } from '@/services/typescript-first-pass'
import { firstPassHref } from '@/lib/typescript-first-pass'
import type { ProgressSnapshotResult } from '@/types/progress'

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn(),
  session: { data: { userId: 'a' }, status: 'authenticated' },
}))
vi.mock('@/actions/getProgressSnapshot', () => ({ getProgressSnapshot: mocks.snapshot }))
vi.mock('@/actions/markProblem', () => ({ markProblem: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: () => mocks.session }))
vi.mock('next/navigation', () => {
  const router = { refresh: vi.fn() }
  return { useRouter: () => router, useSearchParams: () => new URLSearchParams(window.location.search) }
})
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: vi.fn(), handleError: vi.fn() }))
vi.mock('@/components/Header', () => ({ Header: () => <header>Header</header> }))
vi.mock('./ProblemCard', () => ({
  ProblemCard: ({ problem }: { problem: { id: string; title: string } }) => {
    const { isDisabled } = useProblemCompletion(problem.id)
    return <section><h2>{problem.title}</h2><button disabled={isDisabled}>Save question</button></section>
  },
}))

const resolution = resolveTypescriptFirstPass(createFirstPassLessonFixture())
if (resolution.status !== 'ready') throw new Error('Invalid test fixture')
const path = resolution.path
const ready = (userId: string, completedProblems: string[] = []): ProgressSnapshotResult => ({
  status: 'ready', userId, completedProblems, completedLessons: ['unrelated-lesson'],
})
const initial = ready('a')
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => { resolve = res })
  return { promise, resolve }
}
function view(progress: ProgressSnapshotResult = initial) {
  return <>
    <CourseHeader courseSlug="js-track" progressData={progress} />
    <TypescriptFirstPass path={path} initialProgress={progress} requestedStep={undefined} header={<nav>Breadcrumb</nav>} />
  </>
}
beforeEach(() => {
  vi.clearAllMocks()
  useContentStore.setState(useContentStore.getInitialState(), true)
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  mocks.session.data = { userId: 'a' }
  mocks.session.status = 'authenticated'
  window.history.replaceState(null, '', firstPassHref())
  HTMLElement.prototype.scrollIntoView = vi.fn()
})
afterEach(cleanup)

describe('guided progress with mounted shared headers', () => {
  it('refetches A after A-B-A without showing its original bootstrap as confirmed', async () => {
    const b = deferred<ProgressSnapshotResult>()
    const a = deferred<ProgressSnapshotResult>()
    mocks.snapshot.mockReturnValueOnce(b.promise).mockReturnValueOnce(a.promise)
    const { rerender } = render(view())
    expect(screen.getByText('0/4 marked complete')).toBeDefined()
    mocks.session.data = { userId: 'b' }
    rerender(view())
    await act(async () => { b.resolve(ready('b', [path.questions[1].id])) })
    expect(screen.getByText('1/4 marked complete')).toBeDefined()
    mocks.session.data = { userId: 'a' }
    rerender(view())
    expect(screen.getByText('Loading saved marks...')).toBeDefined()
    expect(screen.queryByText('0/4 marked complete')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save question' }).hasAttribute('disabled')).toBe(true)
    await act(async () => { a.resolve(ready('a', path.questions.map(question => question.id))) })
    expect(screen.getByText('4/4 marked complete')).toBeDefined()
    expect(mocks.snapshot).toHaveBeenCalledTimes(2)
    expect(useContentStore.getState().completedLessons).toEqual(new Set(['unrelated-lesson']))
  })

  it('can recover an unavailable initial snapshot under StrictMode effect replay', async () => {
    mocks.snapshot.mockResolvedValue(ready('a', [path.questions[2].id]))
    render(<StrictMode>{view({ status: 'unavailable', userId: 'a', message: 'Unavailable' })}</StrictMode>)
    await waitFor(() => {
      expect(screen.getByText('1/4 marked complete')).toBeDefined()
      expect(screen.queryByText('Refreshing saved marks...')).toBeNull()
    })
  })
})
