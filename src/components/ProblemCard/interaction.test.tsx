import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react'
import { ProblemCard, type PracticeProblem } from './index'
import { useContentStore } from '@/contexts/progress'
import { useAuthStore } from '@/contexts/auth'
import { G3B_TASK } from '@/lib/g3b-task'
import { NATIVE_PRACTICE_NOTE } from '@/lib/problem-presentation'

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  session: vi.fn(),
  mark: vi.fn(),
}))
vi.mock('@/lib/analytics', () => ({ trackLearningEvent: mocks.track }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
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
  useContentStore.setState(useContentStore.getInitialState(), true)
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  mocks.session.mockReturnValue({ data: null, status: 'unauthenticated' })
})
afterEach(cleanup)

function signIn() {
  mocks.session.mockReturnValue({ data: { userId: 'test-user' }, status: 'authenticated' })
  useContentStore.getState().hydrateProgressSnapshot({
    userId: 'test-user', completedLessons: ['other-lesson'], completedProblems: ['optional'],
  })
}
function confirmation(completed: boolean) {
  return { success: true, userId: 'test-user', problemId: problem.id, completed, message: 'Saved' }
}

describe('Explicit practice actions', () => {
  it('makes scoped local setup available before the new task answer is revealed', async () => {
    render(<ProblemCard problem={{ ...problem, ...G3B_TASK }} defaultExpanded />)
    expect(screen.getByText('Starter and local commands')).toBeInTheDocument()
    expect(screen.queryByText('Free answer body')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    await screen.findByText('Free answer body')
    expect(screen.getByText('Starter and local commands')).toBeInTheDocument()
  })

  it('presents native coding as local practice with the existing free reveal and completion controls', async () => {
    const native: PracticeProblem = { ...problem, type: 'CODING', href: '' }
    render(<ProblemCard problem={native} defaultExpanded />)
    expect(screen.getByRole('heading', { name: native.title })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: native.title })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Practice on LeetCode/ })).not.toBeInTheDocument()
    expect(screen.getByText(NATIVE_PRACTICE_NOTE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Run|Submit)$/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    await screen.findByText('Free answer body')
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useAuthStore.getState().isModalOpen).toBe(true)
    expect(mocks.mark).not.toHaveBeenCalled()
  })

  it('retains external coding titles and their existing provider action', () => {
    const external: PracticeProblem = { ...problem, type: 'CODING', href: 'https://leetcode.com/problems/longest-common-prefix/' }
    render(<ProblemCard problem={external} defaultExpanded />)
    expect(screen.getByRole('link', { name: external.title })).toHaveAttribute('href', external.href)
    expect(screen.getByRole('link', { name: /Practice on LeetCode/ })).toHaveAttribute('href', external.href)
    expect(screen.queryByText(NATIVE_PRACTICE_NOTE)).not.toBeInTheDocument()
  })

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
    expect(useAuthStore.getState().isModalOpen).toBe(true)
    expect(mocks.mark).not.toHaveBeenCalled()
    act(signIn)
    mocks.mark.mockResolvedValue({ success: false, message: 'Save failed' })
    rerender(<ProblemCard problem={problem} />)
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(mocks.mark).toHaveBeenCalled())
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(mocks.track).not.toHaveBeenCalledWith(
      'problem_marked_complete',
      expect.anything(),
    )
  })
  it('reports self-marked completion only after a successful save', async () => {
    signIn()
    mocks.mark.mockResolvedValue(confirmation(true))
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

  it('retains the revealed answer, focus, and last confirmed mark during duplicate clicks and saves', async () => {
    signIn()
    let resolve!: (value: ReturnType<typeof confirmation>) => void
    mocks.mark.mockReturnValue(new Promise((done) => { resolve = done }))
    render(<ProblemCard problem={problem} defaultExpanded headingLevel={2} headingId="active-question" />)
    const heading = screen.getByRole('heading', { level: 2, name: problem.title })
    expect(heading).toHaveAttribute('tabindex', '-1')
    expect(heading).toHaveAttribute('id', 'active-question')
    expect(heading).toHaveClass('scroll-mt-28')
    heading.focus()
    expect(heading).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    await screen.findByText('Free answer body')
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)
    expect(mocks.mark).toHaveBeenCalledTimes(1)
    expect(checkbox).toBeDisabled()
    expect(checkbox).not.toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('Saving')
    await act(async () => { resolve(confirmation(true)) })
    expect(checkbox).toBeChecked()
    expect(checkbox).not.toBeDisabled()
    expect(screen.getByText('Free answer body')).toBeInTheDocument()
    expect(heading).toHaveFocus()
    expect(useContentStore.getState().completedProblems).toEqual(new Set(['optional', problem.id]))
    expect(useContentStore.getState().completedLessons).toEqual(new Set(['other-lesson']))
  })

  it('keeps the ordinary h3 title non-focusable by default', () => {
    render(<ProblemCard problem={problem} />)
    const heading = screen.getByRole('heading', { level: 3, name: problem.title })
    expect(heading).not.toHaveAttribute('tabindex')
    expect(heading).not.toHaveAttribute('id')
    expect(heading).not.toHaveClass('scroll-mt-28')
  })

  it.each([
    { title: '3Sum', fragment: '3sum', canonical: '3sum', existingBody: false },
    { title: 'Pub/Sub', fragment: 'pub-sub', canonical: 'pub-sub', existingBody: false },
    { title: 'Pub/Sub', fragment: 'pubsub', canonical: 'pub-sub', existingBody: false },
    { title: 'Pub/Sub', fragment: 'pubsub', canonical: 'pub-sub', existingBody: true },
  ])('preserves canonical and unambiguous legacy fragment behavior: %j', ({ title, fragment, canonical, existingBody }) => {
    vi.useFakeTimers()
    const originalUrl = window.location.href
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
    const scroll = vi.fn()
    const scrollWindow = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scroll })
    try {
      window.history.replaceState(null, '', '#' + fragment)
      render(<>
        {existingBody && <h2 id={fragment}>Existing body section</h2>}
        <ProblemCard problem={{ ...problem, id: 'fragment-task', title, type: 'CODING' }} />
      </>)
      act(() => vi.advanceTimersByTime(100))
      if (existingBody) {
        expect(scroll).not.toHaveBeenCalled()
        expect(document.getElementById(fragment)?.tagName).toBe('H2')
        expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument()
      } else {
        expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
        expect(document.getElementById(canonical)).toHaveClass('animate-borderFlash')
        expect(screen.getByRole('button', { name: 'Reveal answer' })).toBeInTheDocument()
      }
      expect(window.location.hash).toBe('#' + fragment)
    } finally {
      cleanup()
      vi.useRealTimers()
      scrollWindow.mockRestore()
      window.history.replaceState(null, '', originalUrl)
      if (descriptor) Object.defineProperty(Element.prototype, 'scrollIntoView', descriptor)
      else Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    }
  })

  it('unmarks explicitly even if an old header returns a completed snapshot', async () => {
    signIn()
    useContentStore.getState().toggleCompletedProblem(problem.id)
    mocks.mark.mockResolvedValue(confirmation(false))
    render(<ProblemCard problem={problem} />)
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.getByRole('checkbox')).not.toBeChecked())
    act(() => useContentStore.getState().hydrateProgressFromHeader({
      status: 'ready', userId: 'test-user', completedLessons: [], completedProblems: [problem.id],
    }))
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(mocks.mark).toHaveBeenCalledWith({
      problemId: problem.id, completed: false, expectedUserId: 'test-user',
    })
  })
})
