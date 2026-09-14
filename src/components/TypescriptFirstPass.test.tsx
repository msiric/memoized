import { useState, type ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TypescriptFirstPass } from './TypescriptFirstPass'
import { createFirstPassLessonFixture } from '@/test-fixtures/typescript-first-pass'
import { resolveTypescriptFirstPass } from '@/services/typescript-first-pass'
import { firstPassHref, TS_FIRST_PASS_STEPS } from '@/lib/typescript-first-pass'

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn(),
  hydrate: vi.fn(),
  hydrateFromHeader: vi.fn(),
  unavailable: vi.fn(),
  refresh: vi.fn(),
  report: vi.fn(),
  session: { data: { userId: 'user-a' }, status: 'authenticated' },
  store: {
    progressOwnerId: 'user-a',
    progressStatus: 'ready',
    progressRevision: 0,
    completedProblems: new Set<string>(),
  },
}))
vi.mock('@/actions/getProgressSnapshot', () => ({ getProgressSnapshot: mocks.snapshot }))
vi.mock('next-auth/react', () => ({ useSession: () => mocks.session }))
vi.mock('next/navigation', () => {
  const router = { refresh: mocks.refresh }
  return { useRouter: () => router, useSearchParams: () => new URLSearchParams(window.location.search) }
})
vi.mock('@/lib/sentry', () => ({ reportErrorSafely: mocks.report }))
vi.mock('@/contexts/progress', () => ({
  useContentStore: Object.assign(
    (selector: (state: object) => unknown) => selector({
      ...mocks.store, hydrateProgressSnapshot: mocks.hydrate, hydrateProgressFromHeader: mocks.hydrateFromHeader,
      setProgressUnavailable: mocks.unavailable,
    }),
    { getState: () => mocks.store },
  ),
}))
vi.mock('./Button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}))
vi.mock('./ProblemCard', () => ({
  ProblemCard: ({ problem, headingId }: { problem: { title: string; id: string }; headingId: string }) => {
    const [revealed, reveal] = useState(false)
    return <div data-testid="active-card">
      <h2 id={headingId} tabIndex={-1}>{problem.title}</h2>
      <button onClick={() => reveal(true)}>Reveal existing answer</button>
      {revealed && <p>Existing free feedback</p>}
    </div>
  },
}))

const resolution = resolveTypescriptFirstPass(createFirstPassLessonFixture())
if (resolution.status !== 'ready') throw new Error('Invalid test path fixture')
const path = resolution.path
const initialProgress = {
  status: 'ready' as const, userId: 'user-a', completedLessons: ['unrelated-lesson'], completedProblems: [] as string[],
}
const props = { path, initialProgress, header: <nav>Breadcrumb</nav>, requestedStep: undefined }

describe('TypeScript guided view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.data = { userId: 'user-a' }
    mocks.session.status = 'authenticated'
    mocks.store.progressOwnerId = 'user-a'
    mocks.store.progressStatus = 'ready'
    mocks.store.progressRevision = 0
    mocks.store.completedProblems = new Set()
    mocks.snapshot.mockResolvedValue(initialProgress)
    window.history.replaceState(null, '', firstPassHref())
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })
  afterEach(cleanup)

  it('counts only core row IDs, not lesson, optional or unrelated marks', () => {
    mocks.store.completedProblems = new Set([path.questions[0].id, path.questions[2].id, 'fixture-problem-5', 'unrelated'])
    render(<TypescriptFirstPass {...props} />)
    expect(screen.getByText('2/4 marked complete')).toBeDefined()
    expect(screen.getByRole('button', { name: /Continue: Why TypeScript/ })).toBeDefined()
  })

  it('does not replace the active question or its feedback when a mark changes', async () => {
    const { rerender } = render(<TypescriptFirstPass {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal existing answer' }))
    mocks.store.completedProblems = new Set([path.questions[0].id])
    mocks.store.progressRevision++
    rerender(<TypescriptFirstPass {...props} />)
    expect(screen.getByRole('heading', { name: path.questions[0].title })).toBeDefined()
    expect(screen.getByText('Existing free feedback')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /Continue: Why TypeScript/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: path.questions[1].title })).toBeDefined())
    expect(screen.queryByText('Existing free feedback')).toBeNull()
  })

  it('does not display stale personal counts for anonymous or loading sessions', () => {
    mocks.store.completedProblems = new Set(path.questions.map(question => question.id))
    mocks.session.status = 'unauthenticated'
    const { rerender } = render(<TypescriptFirstPass {...props} />)
    expect(screen.getByText('Sign in to save your marks')).toBeDefined()
    expect(screen.queryByText('4/4 marked complete')).toBeNull()
    mocks.session.status = 'loading'
    rerender(<TypescriptFirstPass {...props} />)
    expect(screen.getByText('Loading saved marks...')).toBeDefined()
    expect(screen.queryByText('0/4 marked complete')).toBeNull()
  })

  it('keeps the free question usable while progress is unavailable', () => {
    mocks.store.progressStatus = 'unavailable'
    render(<TypescriptFirstPass {...props} initialProgress={{ status: 'unavailable', userId: 'user-a', message: 'Saved marks could not be loaded.' }} />)
    expect(screen.getByText('Saved marks unavailable')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reveal existing answer' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Retry saved marks' })).toBeDefined()
  })

  it('offers review for historical completion without unmarking anything', () => {
    mocks.store.completedProblems = new Set(path.questions.map(question => question.id))
    render(<TypescriptFirstPass {...props} />)
    expect(screen.getByText('4/4 marked complete')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Review from the first question' }))
    expect(mocks.store.completedProblems.size).toBe(4)
  })

  it('responds to back/forward query selection without exposing an answer', async () => {
    render(<TypescriptFirstPass {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reveal existing answer' }))
    window.history.pushState(null, '', firstPassHref(TS_FIRST_PASS_STEPS[2].id))
    fireEvent.popState(window)
    await waitFor(() => expect(screen.getByRole('heading', { name: path.questions[2].title })).toBeDefined())
    expect(screen.queryByText('Existing free feedback')).toBeNull()
  })

  it('shows an invalid-step explanation and uses a valid core selection', () => {
    window.history.replaceState(null, '', `${firstPassHref()}&step=not-a-step`)
    render(<TypescriptFirstPass {...props} requestedStep="not-a-step" />)
    expect(screen.getByText(/not in this first pass/)).toBeDefined()
    expect(screen.getByRole('heading', { name: path.questions[0].title })).toBeDefined()
  })
})
