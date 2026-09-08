import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { ProblemCard, type PracticeProblem } from './index'

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  session: vi.fn(),
  mark: vi.fn(),
  openModal: vi.fn(),
  toggle: vi.fn(),
}))
vi.mock('@/lib/analytics', () => ({ trackLearningEvent: mocks.track }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
vi.mock('@/contexts/auth', () => ({
  useAuthStore: (
    select: (state: { openModal: typeof mocks.openModal }) => unknown,
  ) => select({ openModal: mocks.openModal }),
}))
vi.mock('@/contexts/progress', () => ({
  useContentStore: (
    select: (state: {
      completedProblems: Set<string>
      toggleCompletedProblem: typeof mocks.toggle
    }) => unknown,
  ) =>
    select({
      completedProblems: new Set<string>(),
      toggleCompletedProblem: mocks.toggle,
    }),
}))
vi.mock('@/utils/response', () => ({ handleResponse: vi.fn() }))
vi.mock('@/lib/sentry', () => ({ handleError: vi.fn() }))
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Free answer body</div>,
}))

const problem: PracticeProblem = {
  id: 'catalog-example',
  title: 'Example question',
  type: 'THEORY',
  difficulty: 'EASY',
  href: '',
  question: 'Explain this example.',
  serializedQuestion: null,
  serializedAnswer: { compiledSource: 'free answer' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.session.mockReturnValue({ data: null })
})
afterEach(cleanup)

describe('Explicit practice actions', () => {
  it('keeps existing answer reveals without adding unfinished attempt controls', () => {
    render(<ProblemCard problem={problem} defaultExpanded />)
    expect(screen.getByText(problem.question)).toBeInTheDocument()
    expect(mocks.track).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /Start an attempt|Attempt started/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(mocks.track).toHaveBeenCalledWith(
      'practice_answer_revealed',
      expect.objectContaining({ content_id: problem.id }),
    )
  })
  it('does not report completion for an anonymous click or a failed save', async () => {
    const { rerender } = render(<ProblemCard problem={problem} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(mocks.openModal).toHaveBeenCalled()
    expect(mocks.mark).not.toHaveBeenCalled()
    mocks.session.mockReturnValue({ data: { userId: 'test-user' } })
    mocks.mark.mockResolvedValue({ success: false })
    rerender(<ProblemCard problem={problem} />)
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(mocks.mark).toHaveBeenCalled())
    expect(mocks.track).not.toHaveBeenCalledWith(
      'problem_marked_complete',
      expect.anything(),
    )
  })
  it('reports self-marked completion only after a successful save', async () => {
    mocks.session.mockReturnValue({ data: { userId: 'test-user' } })
    mocks.mark.mockResolvedValue({ success: true })
    render(<ProblemCard problem={problem} />)
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() =>
      expect(mocks.track).toHaveBeenCalledWith('problem_marked_complete', {
        content_id: problem.id,
        content_type: 'THEORY',
        source: 'practice',
      }),
    )
  })
})
