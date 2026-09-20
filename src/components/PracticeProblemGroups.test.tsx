import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Problem, ProblemType } from '@prisma/client'
import { useContentStore } from '@/contexts/progress'
import { PRACTICE_COMPLETION_NOTE } from '@/lib/problem-presentation'
import { LessonPreview } from './LessonPreview'
import { PracticeProblems } from './PracticeProblems'

const mocks = vi.hoisted(() => ({ session: vi.fn(), mark: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: mocks.session }))
vi.mock('@/actions/markProblem', () => ({ markProblem: mocks.mark }))
vi.mock('@/lib/analytics', () => ({ trackLearningEvent: vi.fn() }))
vi.mock('@/components/PreserializedMdxRenderer', () => ({
  PreserializedMdxRenderer: () => <div>Free answer body</div>,
}))

function problem(id: string, type: ProblemType): Problem {
  return {
    id, contentId: `/course/section/lesson/${id}`, lessonId: 'lesson',
    title: id, slug: id, type, difficulty: 'HARD', href: '', link: `#${id}`,
    question: `Attempt ${id}.`, answer: 'Free answer body',
    serializedQuestion: null, serializedAnswer: { compiledSource: 'free answer' },
    createdAt: new Date(0), updatedAt: new Date(0),
  }
}

const mixed = [
  problem('coding-first', 'CODING'), problem('theory-first', 'THEORY'),
  problem('coding-second', 'CODING'), problem('theory-second', 'THEORY'),
]

function reader(kind: 'full' | 'preview', problems: Problem[], groupPractice = true) {
  return kind === 'full'
    ? <PracticeProblems problems={problems} groupPractice={groupPractice} />
    : <LessonPreview title="Lesson" description="Description" topics={[]} problems={problems} groupPractice={groupPractice} />
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  useContentStore.setState(useContentStore.getInitialState(), true)
  mocks.session.mockReturnValue({ data: null, status: 'unauthenticated' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe.each(['full', 'preview'] as const)('%s lesson practice', kind => {
  it('uses the same groups, card hierarchy and original question anchors', () => {
    const { container } = render(reader(kind, mixed))
    const theory = screen.getByRole('region', { name: 'Theory questions' })
    const coding = screen.getByRole('region', { name: 'Coding practice' })
    expect(theory.compareDocumentPosition(coding) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(theory).getAllByRole('heading', { level: 3 }).map(node => node.textContent))
      .toEqual(['theory-first', 'theory-second'])
    expect(within(coding).getAllByRole('heading', { level: 3 }).map(node => node.textContent))
      .toEqual(['coding-first', 'coding-second'])
    expect(within(theory).getByText('Theory questions')).toBeInTheDocument()
    expect(within(coding).getByText('Coding practice')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Practice Problems' })).toHaveAttribute('id', 'practice-problems')
    for (const item of mixed) expect(container.querySelectorAll(`#${item.id}`)).toHaveLength(1)
    expect(screen.getByText(PRACTICE_COMPLETION_NOTE, { exact: false })).toBeInTheDocument()
    expect(screen.getByText(/type does not determine whether it is optional/)).toBeInTheDocument()
  })

  it.each(['THEORY', 'CODING'] as const)('renders only the populated %s group', type => {
    render(reader(kind, [problem('only-question', type)]))
    const present = type === 'THEORY' ? 'Theory questions' : 'Coding practice'
    const absent = type === 'THEORY' ? 'Coding practice' : 'Theory questions'
    expect(screen.getByRole('region', { name: present })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: absent })).not.toBeInTheDocument()
  })

  it('omits the practice area when there are no questions', () => {
    render(reader(kind, []))
    expect(screen.queryByRole('heading', { name: 'Practice Problems' })).not.toBeInTheDocument()
    expect(screen.queryByText(PRACTICE_COMPLETION_NOTE, { exact: false })).not.toBeInTheDocument()
  })

  it('restores the original flat order and usable cards when grouping is disabled', async () => {
    render(reader(kind, mixed, false))
    expect(screen.queryByRole('region', { name: 'Theory questions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Coding practice' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 }).map(node => node.textContent)).toEqual(mixed.map(item => item.title))
    expect(screen.getAllByRole('checkbox')).toHaveLength(mixed.length)
    if (kind === 'full') fireEvent.click(screen.getAllByRole('button', { name: 'Expand' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Reveal answer' })[0])
    expect(await screen.findByText('Free answer body')).toBeInTheDocument()
  })

  it('keeps free answer reveal available without revealing it automatically', async () => {
    render(reader(kind, [problem('question', 'CODING')]))
    expect(screen.queryByText('Free answer body')).not.toBeInTheDocument()
    if (kind === 'full') fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('Attempt question.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
    expect(await screen.findByText('Free answer body')).toBeInTheDocument()
  })
})

it('preserves an existing mark when a question moves between groups without changing lesson history', () => {
  mocks.session.mockReturnValue({ data: { userId: 'reader' }, status: 'authenticated' })
  useContentStore.getState().hydrateProgressSnapshot({
    userId: 'reader', completedLessons: ['lesson'], completedProblems: ['existing-task', 'unrelated'],
  })
  const existing = problem('existing-task', 'THEORY')
  const { rerender } = render(<PracticeProblems problems={[existing]} groupPractice />)
  expect(screen.getByRole('checkbox')).toBeChecked()
  rerender(<PracticeProblems problems={[{ ...existing, type: 'CODING' }]} groupPractice />)
  expect(screen.getByRole('region', { name: 'Coding practice' })).toBeInTheDocument()
  expect(screen.getByRole('checkbox')).toBeChecked()
  expect(useContentStore.getState().completedProblems).toEqual(new Set(['existing-task', 'unrelated']))
  expect(useContentStore.getState().completedLessons).toEqual(new Set(['lesson']))
  expect(mocks.mark).not.toHaveBeenCalled()
})
