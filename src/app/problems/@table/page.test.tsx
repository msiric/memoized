import { getProblemBankSnapshot } from '@/lib/catalog-request'
import { filterAndSortProblems } from '@/utils/helpers'
import { ProblemStatus } from '@/types'
import { ProblemDifficulty, ProblemType } from '@prisma/client'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProblemsPage from './page'

// Mock the imported modules and components
vi.mock('@/lib/catalog-request', () => ({ getProblemBankSnapshot: vi.fn() }))
vi.mock('@/utils/helpers', () => ({ filterAndSortProblems: vi.fn() }))
vi.mock('@/components/ProblemList', () => ({
  ProblemList: ({ allProblems, filteredProblems, initialLessons }: any) => (
    <div data-testid="problem-list">
      Mocked ProblemList (All Problems: {allProblems.length}, Filtered Problems:{' '}
      {filteredProblems.length}, Lessons: {initialLessons.length})
    </div>
  ),
}))

describe('ProblemsPage component', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders ProblemList with correct props', async () => {
    const mockProblems = {
      allProblems: [{ id: '1' }, { id: '2' }],
      filteredProblems: [{ id: '1' }],
      lessons: ['Lesson 1', 'Lesson 2'],
    }

    vi.mocked(getProblemBankSnapshot).mockResolvedValue(mockProblems as any)
    vi.mocked(filterAndSortProblems).mockReturnValue(mockProblems.filteredProblems as any)

    const searchParams = {
      search: 'test',
      difficulty: ProblemDifficulty.EASY,
      status: 'COMPLETED' as ProblemStatus,
      lesson: 'Lesson 1',
      type: ProblemType.THEORY,
      sortColumn: 'title',
      sortOrder: 'asc' as const,
    }

    render(await ProblemsPage({ searchParams }))

    const problemList = screen.getByTestId('problem-list')
    expect(problemList).toBeDefined()
    expect(problemList.textContent).toContain('All Problems: 2')
    expect(problemList.textContent).toContain('Filtered Problems: 1')
    expect(problemList.textContent).toContain('Lessons: 2')
  })

  it('applies filters to the shared unfiltered snapshot without a second catalog read', async () => {
    const mockProblems = {
      allProblems: [],
      filteredProblems: [],
      lessons: [],
    }

    vi.mocked(getProblemBankSnapshot).mockResolvedValue(mockProblems)

    const searchParams = {
      search: 'test',
      difficulty: ProblemDifficulty.MEDIUM,
      status: 'INCOMPLETE' as ProblemStatus,
      lesson: 'Lesson 2',
      type: ProblemType.CODING,
      sortColumn: 'difficulty',
      sortOrder: 'desc' as const,
    }

    await ProblemsPage({ searchParams })

    expect(getProblemBankSnapshot).toHaveBeenCalledWith()
    expect(filterAndSortProblems).toHaveBeenCalledWith(mockProblems.allProblems, {
      search: 'test',
      difficulty: ProblemDifficulty.MEDIUM,
      status: 'INCOMPLETE' as ProblemStatus,
      lesson: 'Lesson 2',
      type: ProblemType.CODING,
      sortColumn: 'difficulty',
      sortOrder: 'desc',
    })
  })

  it('handles missing search params', async () => {
    const mockProblems = {
      allProblems: [],
      filteredProblems: [],
      lessons: [],
    }

    vi.mocked(getProblemBankSnapshot).mockResolvedValue(mockProblems)

    const searchParams = {} as any

    await ProblemsPage({ searchParams })

    expect(getProblemBankSnapshot).toHaveBeenCalledWith()
    expect(filterAndSortProblems).toHaveBeenCalledWith(mockProblems.allProblems, {
      difficulty: undefined,
      status: undefined,
      lesson: undefined,
      search: undefined,
      sortColumn: undefined,
      sortOrder: undefined,
      type: undefined,
    })
  })
})
