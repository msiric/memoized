import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProblemList } from './ProblemList'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import type { EnrichedProblem } from '@/types'

const mocks = vi.hoisted(() => ({
  mark: vi.fn(), session: vi.fn(), track: vi.fn(), router: {},
  searchParams: null as URLSearchParams | null,
}))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => '/problems',
  useSearchParams: () => mocks.searchParams,
}))
vi.mock('@/lib/analytics', () => ({ trackLearningEvent: mocks.track }))
vi.mock('@/lib/sentry', () => ({ handleError: vi.fn() }))
vi.mock('@/utils/response', () => ({ handleResponse: vi.fn() }))
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Free bank answer</div>,
}))

const problem: EnrichedProblem = {
  id: 'p1', title: 'Bank question', type: 'THEORY', difficulty: 'EASY',
  href: '', question: 'Explain bank question.',
  lesson: { title: 'Lesson', slug: 'lesson', href: '/lesson' },
  problemProgress: [],
  serializedAnswer: { compiledSource: 'answer' },
}
const props = { allProblems: [problem], filteredProblems: [problem], initialLessons: [] }
const confirmation = (completed: boolean, problemId = 'p1') => ({
  success: true, userId: 'a', problemId, completed, message: 'Saved',
})
const questions = Array.from({ length: 3 }, (_, index): EnrichedProblem => ({
  ...problem,
  id: `p${index + 1}`,
  title: `Question ${index + 1}`,
  question: `Explain question ${index + 1}.`,
}))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.searchParams = null
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
  it('keeps the router filter URL when a confirmed action reapplies its canonical URL', async () => {
    const nativeReplace = window.history.replaceState.bind(window.history)
    nativeReplace({ __NA: true }, '', '/problems')
    let canonicalUrl = '/problems'
    const replace = vi.spyOn(window.history, 'replaceState').mockImplementation((data: unknown, title, url) => {
      const internal = data !== null && typeof data === 'object' &&
        (('__NA' in data && data.__NA) || ('_N' in data && data._N))
      if (!internal && url) canonicalUrl = String(url)
      nativeReplace({ __NA: true }, title, url)
    })
    try {
      mocks.mark.mockImplementation(async ({ completed }) => {
        nativeReplace({ __NA: true }, '', canonicalUrl)
        return confirmation(completed)
      })
      render(<ProblemList {...props} />)
      fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'incomplete' } })
      expect(canonicalUrl).toBe('/problems?status=incomplete')
      fireEvent.click(screen.getByRole('checkbox', { name: 'Mark "Bank question" complete' }))
      await waitFor(() => expect(within(screen.getByRole('table')).queryByRole('button', { name: problem.title })).not.toBeInTheDocument())
      expect(window.location.search).toBe('?status=incomplete')
      fireEvent.click(screen.getByRole('button', { name: 'Reset Filters' }))
      expect(canonicalUrl).toBe('/problems')
      expect(replace).toHaveBeenLastCalledWith(null, '', '/problems')
    } finally { replace.mockRestore() }
  })

  it('does not rewrite an already-matching URL during filter initialization', () => {
    mocks.searchParams = new URLSearchParams('status=incomplete')
    window.history.replaceState({ __NA: true }, '', '/problems?status=incomplete')
    const replace = vi.spyOn(window.history, 'replaceState')
    try {
      render(<ProblemList {...props} />)
      expect(replace).not.toHaveBeenCalled()
    } finally { replace.mockRestore() }
  })

  it.each([2, 3])('keeps all %i incomplete questions reachable as saves remove their table rows', async (count) => {
    const sequence = questions.slice(0, count)
    mocks.mark.mockImplementation(async ({ problemId, completed }) => confirmation(completed, problemId))
    render(<ProblemList allProblems={sequence} filteredProblems={sequence} initialLessons={[]} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'incomplete' } })
    const table = screen.getByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: sequence[0].title }))
    const dialog = screen.getByRole('dialog')

    for (const [index, question] of sequence.entries()) {
      expect(dialog).toHaveAccessibleName(question.title)
      expect(within(dialog).getByText(question.question)).toBeInTheDocument()
      expect(within(dialog).queryByText('Free bank answer')).not.toBeInTheDocument()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Reveal answer' }))
      await within(dialog).findByText('Free bank answer')
      fireEvent.click(within(dialog).getByRole('checkbox'))
      await waitFor(() => expect(within(table).queryByRole('button', { name: question.title })).not.toBeInTheDocument())

      expect(dialog).toHaveAccessibleName(question.title)
      expect(within(dialog).getByText('Free bank answer')).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox')).toBeChecked()
      expect(within(dialog).getByText(`${index + 1}/${count}`)).toBeInTheDocument()
      const next = within(dialog).getByRole('button', { name: 'Next problem (→)' })
      if (index < count - 1) {
        expect(next).toBeEnabled()
        fireEvent.click(next)
      } else {
        expect(next).toBeDisabled()
      }
    }

    expect(within(table).getByText('No problems found.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Previous problem (←)' }))
    expect(dialog).toHaveAccessibleName(sequence[count - 2].title)
    expect(within(dialog).getByRole('checkbox')).toBeChecked()
    expect(mocks.mark).toHaveBeenCalledTimes(count)
  })

  it('preserves both neighbors when the middle question leaves the incomplete table', async () => {
    mocks.mark.mockResolvedValue(confirmation(true, 'p2'))
    render(<ProblemList allProblems={questions} filteredProblems={questions} initialLessons={[]} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'incomplete' } })
    fireEvent.click(screen.getByRole('button', { name: questions[1].title }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    await waitFor(() => expect(within(screen.getByRole('table')).queryByRole('button', { name: questions[1].title })).not.toBeInTheDocument())

    expect(within(dialog).getByText('2/3')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(dialog).toHaveAccessibleName(questions[2].title)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(dialog).toHaveAccessibleName(questions[1].title)
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(dialog).toHaveAccessibleName(questions[0].title)
    expect(within(dialog).getByRole('button', { name: 'Previous problem (←)' })).toBeDisabled()
  })

  it('keeps an open sequence stable through sort/filter changes and captures the new order on reopen', async () => {
    render(<ProblemList allProblems={questions} filteredProblems={questions} initialLessons={[]} />)
    const table = screen.getByRole('table')
    fireEvent.click(within(table).getByRole('button', { name: 'Title' }))
    fireEvent.click(within(table).getByRole('button', { name: 'Title' }))
    fireEvent.click(within(table).getByRole('button', { name: questions[2].title }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reveal answer' }))
    await within(dialog).findByText('Free bank answer')

    fireEvent.click(within(table).getByRole('button', { name: 'Title' }))
    fireEvent.change(screen.getByPlaceholderText('Search problems...'), { target: { value: questions[0].title } })
    expect(within(table).queryByRole('button', { name: questions[2].title })).not.toBeInTheDocument()
    expect(dialog).toHaveAccessibleName(questions[2].title)
    expect(within(dialog).getByText('Free bank answer')).toBeInTheDocument()
    expect(within(dialog).getByText('1/3')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next problem (→)' }))
    expect(dialog).toHaveAccessibleName(questions[1].title)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next problem (→)' }))
    expect(dialog).toHaveAccessibleName(questions[0].title)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close (Esc)' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(within(table).getByRole('button', { name: questions[0].title }))
    const reopened = screen.getByRole('dialog')
    expect(within(reopened).getByText('1/1')).toBeInTheDocument()
    expect(within(reopened).getByRole('button', { name: 'Next problem (→)' })).toBeDisabled()
    expect(within(reopened).getByRole('button', { name: 'Previous problem (←)' })).toBeDisabled()
    expect(within(reopened).queryByText('Free bank answer')).not.toBeInTheDocument()
  })

  it('keeps the next completed question reachable after unmarking the active question', async () => {
    const sequence = questions.slice(0, 2)
    useContentStore.getState().hydrateProgressSnapshot({
      userId: 'a', completedLessons: [], completedProblems: sequence.map(({ id }) => id),
    })
    mocks.mark.mockResolvedValue(confirmation(false))
    render(<ProblemList allProblems={sequence} filteredProblems={sequence} initialLessons={[]} />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), { target: { value: 'completed' } })
    fireEvent.click(screen.getByRole('button', { name: sequence[0].title }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('checkbox'))
    await waitFor(() => expect(within(screen.getByRole('table')).queryByRole('button', { name: sequence[0].title })).not.toBeInTheDocument())
    expect(dialog).toHaveAccessibleName(sequence[0].title)
    expect(within(dialog).getByRole('checkbox')).not.toBeChecked()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next problem (→)' }))
    expect(dialog).toHaveAccessibleName(sequence[1].title)
    expect(within(dialog).getByRole('checkbox')).toBeChecked()
  })

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
