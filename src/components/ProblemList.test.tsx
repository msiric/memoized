import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProblemList } from './ProblemList'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import type { EnrichedProblem } from '@/types'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  mark: vi.fn(), session: vi.fn(), track: vi.fn(), router: {},
}))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => '/problems',
  useSearchParams: () => null,
}))
vi.mock('@/lib/analytics', () => ({ trackLearningEvent: mocks.track }))
vi.mock('@/lib/sentry', () => ({ handleError: vi.fn() }))
vi.mock('@/utils/response', () => ({ handleResponse: vi.fn() }))
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Free bank answer</div>,
}))
vi.mock('@/components/SlideOverPanel', () => ({
  SlideOverPanel: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <section role="dialog" aria-label="Problem details">{children}</section> : null,
}))

const problem: EnrichedProblem = {
  id: 'p1', title: 'Bank question', type: 'THEORY', difficulty: 'EASY',
  href: '', question: 'Explain bank question.',
  lesson: { title: 'Lesson', slug: 'lesson', href: '/lesson' },
  problemProgress: [],
  serializedAnswer: { compiledSource: 'answer' },
}
const props = { allProblems: [problem], filteredProblems: [problem], initialLessons: [] }
const confirmation = (completed: boolean) => ({
  success: true, userId: 'a', problemId: 'p1', completed, message: 'Saved',
})
beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/problems')
  useContentStore.setState(useContentStore.getInitialState(), true)
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  mocks.session.mockReturnValue({ data: { userId: 'a' }, status: 'authenticated' })
  useContentStore.getState().hydrateProgressSnapshot({
    userId: 'a', completedLessons: ['lesson'], completedProblems: ['optional', 'unrelated'],
  })
})
afterEach(cleanup)

describe('Problem bank confirmed controls', () => {
  it('shares pending state between row and drawer, preserves disclosure, and saves just once', async () => {
    let resolve!: (value: ReturnType<typeof confirmation>) => void
    mocks.mark.mockReturnValue(new Promise((done) => { resolve = done }))
    render(<ProblemList {...props} />)
    fireEvent.click(screen.getByRole('button', { name: problem.title }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reveal answer' }))
    await within(dialog).findByText('Free bank answer')
    const row = within(screen.getByRole('table')).getByRole('checkbox')
    const drawer = within(dialog).getByRole('checkbox')
    fireEvent.click(row)
    fireEvent.click(drawer)
    fireEvent.click(row)
    expect(row).toBeDisabled()
    expect(drawer).toBeDisabled()
    expect(row).not.toBeChecked()
    expect(drawer).not.toBeChecked()
    expect(mocks.mark).toHaveBeenCalledTimes(1)
    await act(async () => { resolve(confirmation(true)) })
    expect(row).toBeChecked()
    expect(drawer).toBeChecked()
    expect(within(dialog).getByText('Free bank answer')).toBeInTheDocument()
    expect(useContentStore.getState().completedProblems).toEqual(new Set(['optional', 'unrelated', 'p1']))
    expect(useContentStore.getState().completedLessons).toEqual(new Set(['lesson']))
  })

  it('uses confirmed shared values over stale server props and updates status filtering', async () => {
    useContentStore.getState().toggleCompletedProblem('p1')
    mocks.mark.mockResolvedValue(confirmation(false))
    const { rerender } = render(<ProblemList {...props} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'completed' } })
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    await screen.findByText('No problems found.')
    expect(mocks.mark).toHaveBeenCalledWith({ problemId: 'p1', completed: false, expectedUserId: 'a' })
    rerender(<ProblemList {...props} allProblems={[{ ...problem, problemProgress: [{ completed: true }] }]} />)
    expect(screen.getByText('No problems found.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: '' } })
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked())
  })

  it('retains confirmed values after failed unmarking and displays the error', async () => {
    useContentStore.getState().toggleCompletedProblem('p1')
    mocks.mark.mockResolvedValue({ success: false, message: 'Could not save' })
    render(<ProblemList {...props} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByRole('checkbox')).not.toBeDisabled()
    expect(mocks.track).not.toHaveBeenCalledWith('problem_marked_complete', expect.anything())
  })

  it('keeps free answers usable while anonymous persistence prompts for sign-in', async () => {
    mocks.session.mockReturnValue({ data: null, status: 'unauthenticated' })
    render(<ProblemList {...props} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useAuthStore.getState().isModalOpen).toBe(true)
    expect(mocks.mark).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: problem.title }))
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(await screen.findByText('Free bank answer')).toBeInTheDocument()
  })

  it('ignores a previous account save without undoing a different account snapshot', async () => {
    let resolve!: (value: ReturnType<typeof confirmation>) => void
    mocks.mark.mockReturnValue(new Promise((done) => { resolve = done }))
    const { rerender } = render(<ProblemList {...props} />)
    fireEvent.click(screen.getByRole('checkbox'))
    mocks.session.mockReturnValue({ data: { userId: 'b' }, status: 'authenticated' })
    rerender(<ProblemList {...props} />)
    act(() => useContentStore.getState().hydrateProgressSnapshot({
      userId: 'b', completedLessons: [], completedProblems: ['b-only'],
    }))
    await act(async () => { resolve(confirmation(true)) })
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(useContentStore.getState().completedProblems).toEqual(new Set(['b-only']))
  })
})
