'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { ProblemRow, ProblemStatus } from '@/types'
import {
  ProblemFilter,
  capitalizeFirstLetter,
  filterAndSortProblems,
} from '@/utils/helpers'
import { Lesson, ProblemDifficulty } from '@prisma/client'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6'
import { Select } from './Select'

const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'difficulty', title: 'Difficulty', sortable: true },
  { key: 'lesson', title: 'Lesson', sortable: true },
  { key: 'completed', title: 'Completed', sortable: false },
]

type ProblemListProps = {
  allProblems: ProblemRow[]
  filteredProblems: ProblemRow[]
  initialLessons: Partial<Lesson>[]
}

export const ProblemList = ({
  allProblems,
  filteredProblems,
  initialLessons,
}: ProblemListProps) => {
  const { data: session } = useSession()
  const toggleCompletedProblem = useContentStore(
    (state) => state.toggleCompletedProblem,
  )
  const openModal = useAuthStore((state) => state.openModal)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [problems, setProblems] = useState<ProblemRow[]>(filteredProblems)
  const [lessons] = useState<Partial<Lesson>[]>(initialLessons)
  const [search, setSearch] = useState(
    searchParams?.get('search')?.toLowerCase() || '',
  )
  const [difficulty, setDifficulty] = useState<string | null>(
    searchParams?.get('difficulty')?.toLowerCase() || '',
  )
  const [status, setStatus] = useState<string | null>(
    searchParams?.get('status')?.toLowerCase() || '',
  )
  const [lesson, setLesson] = useState<string | null>(
    searchParams?.get('lesson')?.toLowerCase() || '',
  )
  const [sortColumn, setSortColumn] = useState<string | null>(
    searchParams?.get('sortColumn')?.toLowerCase() || null,
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(
    (searchParams?.get('sortOrder')?.toLowerCase() as 'asc' | 'desc' | null) ||
      null,
  )

  const filterAndSortProblemsClient = useCallback(() => {
    const filter: ProblemFilter = {
      search,
      difficulty: difficulty as ProblemDifficulty,
      status: status as ProblemStatus,
      lesson: lesson as string,
      sortColumn: sortColumn as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    }

    const newProblems = filterAndSortProblems(allProblems, filter)
    setProblems(newProblems)
  }, [allProblems, search, difficulty, status, lesson, sortColumn, sortOrder])

  useEffect(() => {
    filterAndSortProblemsClient()
  }, [
    search,
    difficulty,
    status,
    lesson,
    sortColumn,
    sortOrder,
    filterAndSortProblemsClient,
  ])

  useEffect(() => {
    setSearch(searchParams?.get('search') || '')
    setDifficulty(searchParams?.get('difficulty') || '')
    setStatus(searchParams?.get('status') || '')
    setLesson(searchParams?.get('lesson') || '')
    setSortColumn(searchParams?.get('sortColumn') || null)
    setSortOrder(
      (searchParams?.get('sortOrder') as 'asc' | 'desc' | null) || null,
    )
  }, [searchParams])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  const handleDifficultyChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setDifficulty(event.target.value || null)
  }

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(event.target.value || null)
  }

  const handleLessonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setLesson(event.target.value || null)
  }

  const handleSort = (column: string) => {
    let newSortOrder: 'asc' | 'desc' | null = 'asc'

    if (sortColumn === column) {
      if (sortOrder === 'asc') {
        newSortOrder = 'desc'
      } else if (sortOrder === 'desc') {
        newSortOrder = null
        setSortColumn(null)
      } else {
        newSortOrder = 'asc'
      }
    } else {
      setSortColumn(column)
      newSortOrder = 'asc'
    }

    setSortOrder(newSortOrder)
  }

  const handleResetFilters = () => {
    setSearch('')
    setDifficulty(null)
    setStatus(null)
    setLesson(null)
    setSortColumn(null)
    setSortOrder(null)

    const query = new URLSearchParams()
    window.history.replaceState(
      {
        ...window.history.state,
        as: `${pathname}?${query.toString()}`,
        url: `${pathname}?${query.toString()}`,
      },
      '',
      `${pathname}?${query.toString()}`,
    )
  }

  const toggleCompletion = async (problemId: string) => {
    const updatedProblems = problems.map((problem) =>
      problem.id === problemId
        ? {
            ...problem,
            problemProgress:
              problem.problemProgress.length === 0
                ? [{ completed: true }]
                : problem.problemProgress.map((progress) => ({
                    ...progress,
                    completed: !progress.completed,
                  })),
          }
        : problem,
    )
    setProblems(updatedProblems)
  }

  async function onCheckboxChange(
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) {
    if (!session) {
      return openModal()
    }
    const currentlyCompleted = event.currentTarget.checked

    try {
      await markProblem({ problemId, completed: currentlyCompleted })
      toggleCompletedProblem(problemId)
      toggleCompletion(problemId)
      console.log(
        `Problem ${problemId} marked as ${
          currentlyCompleted ? 'completed' : 'not completed'
        }`,
      )
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    const query = new URLSearchParams()

    const params = {
      search,
      difficulty,
      status,
      lesson,
      sortColumn,
      sortOrder,
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value.toLowerCase())
      else query.delete(key)
    })

    window.history.replaceState(
      {
        ...window.history.state,
        as: `${pathname}?${query.toString()}`,
        url: `${pathname}?${query.toString()}`,
      },
      '',
      `${pathname}?${query.toString()}`,
    )
  }, [
    search,
    difficulty,
    status,
    lesson,
    sortColumn,
    sortOrder,
    router,
    pathname,
  ])

  return (
    <div className="relative mx-auto my-10 max-w-[1024px] overflow-x-auto shadow-md">
      <div className="mb-4 flex space-x-4">
        <div className="relative">
          <div className="rtl:inset-r-0 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            <svg
              className="h-4 w-4 text-white"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            className="focus:ring-0.5 block w-full max-w-80 appearance-none rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 ps-10 text-sm text-zinc-900 placeholder-white focus:border-lime-500 focus:outline-none focus:ring-lime-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-white dark:focus:border-lime-500 dark:focus:ring-lime-500"
            placeholder="Search for items"
          />
        </div>
        <Select
          value={difficulty || ''}
          onChange={handleDifficultyChange}
          variant="primary"
          size="medium"
          options={[
            { value: '', label: 'All Difficulties' },
            { value: 'easy', label: 'Easy' },
            { value: 'medium', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
          ]}
        />
        <Select
          value={status || ''}
          onChange={handleStatusChange}
          variant="primary"
          size="medium"
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'todo', label: 'To Do' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <Select
          value={lesson || ''}
          onChange={handleLessonChange}
          variant="primary"
          size="medium"
          options={[
            { value: '', label: 'All Lessons' },
            ...lessons.map((lesson) => ({
              value: lesson.slug ?? '',
              label: lesson.title ?? '',
            })),
          ]}
        />
        <button
          onClick={handleResetFilters}
          className="rounded text-sm text-white"
        >
          Reset Filters
        </button>
      </div>
      <table className="w-full overflow-hidden rounded-lg text-left text-sm text-zinc-500 rtl:text-right dark:text-zinc-400">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-700 dark:bg-zinc-700 dark:text-zinc-400">
          <tr>
            {TABLE_COLUMNS.map((column, index) => (
              <th key={column.key} scope="col" className={clsx('px-6 py-3')}>
                <div className="flex w-full">
                  <button
                    className={clsx(
                      'flex w-full items-center uppercase',
                      column.sortable ? 'cursor-pointer' : 'cursor-default',
                      index !== 0 && 'justify-center',
                    )}
                    onClick={() =>
                      column.sortable ? handleSort(column.key) : null
                    }
                  >
                    {column.title}
                    {column.sortable ? (
                      sortColumn === column.key ? (
                        sortOrder === 'asc' ? (
                          <FaSortUp className="ms-1.5 h-2.5 w-2.5" />
                        ) : (
                          <FaSortDown className="ms-1.5 h-2.5 w-2.5" />
                        )
                      ) : (
                        <FaSort className="ms-1.5 h-2.5 w-2.5" />
                      )
                    ) : null}
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {problems.length > 0 ? (
            problems.map((problem) => (
              <tr
                key={problem.id}
                className="border-b bg-white last:border-b-0 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-600"
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-white">
                  {problem.title}
                </td>
                <td className="px-6 py-4 text-center">
                  {capitalizeFirstLetter(problem.difficulty)}
                </td>
                <td className="px-6 py-4 text-center">
                  {problem.lesson.title}
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={problem.problemProgress.some(
                      (progress) => progress.completed,
                    )}
                    onChange={(event) => onCheckboxChange(event, problem.id)}
                    className="form-checkbox h-4 w-4 cursor-pointer accent-lime-500 focus:accent-lime-600"
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr className="border-b bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-600">
              <td
                colSpan={TABLE_COLUMNS.length}
                className="whitespace-nowrap px-6 py-4 text-center font-medium text-zinc-900 dark:text-white"
              >
                No problems found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
