'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { ProblemRow } from '@/types'
import { Lesson } from '@prisma/client'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6'

const DIFFICULTY_ORDER = {
  EASY: 1,
  MEDIUM: 2,
  HARD: 3,
}

const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'difficulty', title: 'Difficulty', sortable: true },
  { key: 'lesson', title: 'Lesson', sortable: true },
  { key: 'status', title: 'Status', sortable: false },
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
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [difficulty, setDifficulty] = useState<string | null>(
    searchParams.get('difficulty') || '',
  )
  const [status, setStatus] = useState<string | null>(
    searchParams.get('status') || '',
  )
  const [lesson, setLesson] = useState<string | null>(
    searchParams.get('lesson') || '',
  )
  const [sortColumn, setSortColumn] = useState<string | null>(
    searchParams.get('sortColumn') || null,
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(
    (searchParams.get('sortOrder') as 'asc' | 'desc' | null) || null,
  )

  const filterAndSortProblems = useCallback(() => {
    let filteredProblems = allProblems

    if (search) {
      filteredProblems = filteredProblems.filter((problem) =>
        problem.title.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (difficulty) {
      filteredProblems = filteredProblems.filter(
        (problem) => problem.difficulty === difficulty,
      )
    }

    if (status) {
      filteredProblems = filteredProblems.filter((problem) =>
        status === 'COMPLETED'
          ? problem.problemProgress.some((progress) => progress.completed)
          : problem.problemProgress.every((progress) => !progress.completed),
      )
    }

    if (lesson) {
      filteredProblems = filteredProblems.filter(
        (problem) => lesson === problem.lesson.slug,
      )
    }

    if (sortColumn) {
      filteredProblems.sort((a, b) => {
        if (sortColumn === 'title') {
          return sortOrder === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title)
        }
        if (sortColumn === 'difficulty') {
          return sortOrder === 'asc'
            ? DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
            : DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty]
        }
        if (sortColumn === 'lesson') {
          return sortOrder === 'asc'
            ? a.lesson.title.localeCompare(b.lesson.title)
            : b.lesson.title.localeCompare(a.lesson.title)
        }
        return 0
      })
    }

    setProblems(filteredProblems)
  }, [allProblems, search, difficulty, status, lesson, sortColumn, sortOrder])

  useEffect(() => {
    filterAndSortProblems()
  }, [
    search,
    difficulty,
    status,
    lesson,
    sortColumn,
    sortOrder,
    filterAndSortProblems,
  ])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setDifficulty(searchParams.get('difficulty') || '')
    setStatus(searchParams.get('status') || '')
    setLesson(searchParams.get('lesson') || '')
    setSortColumn(searchParams.get('sortColumn') || null)
    setSortOrder(
      (searchParams.get('sortOrder') as 'asc' | 'desc' | null) || null,
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
    if (sortColumn === column) {
      if (sortOrder === 'asc') {
        setSortOrder('desc')
      } else if (sortOrder === 'desc') {
        setSortOrder(null)
        setSortColumn(null)
      } else {
        setSortOrder('asc')
      }
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
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
      if (value) query.set(key, value)
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
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <div className="bg-white pb-4 dark:bg-gray-900">
        <label htmlFor="table-search" className="sr-only">
          Search
        </label>
        <div className="relative mt-1">
          <div className="rtl:inset-r-0 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
            <svg
              className="h-4 w-4 text-gray-500 dark:text-gray-400"
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
            id="table-search"
            value={search}
            onChange={handleSearch}
            className="block w-80 rounded-lg border border-gray-300 bg-gray-50 ps-10 pt-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
            placeholder="Search for items"
          />
        </div>
        <button
          onClick={handleResetFilters}
          className="rounded bg-red-500 p-2 text-white"
        >
          Reset Filters
        </button>
      </div>
      <div className="mb-4 flex space-x-4">
        <select
          value={difficulty || ''}
          onChange={handleDifficultyChange}
          className="rounded border p-2"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <select
          value={status || ''}
          onChange={handleStatusChange}
          className="rounded border p-2"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select
          value={lesson || ''}
          onChange={handleLessonChange}
          className="rounded border p-2"
        >
          <option value="">All Lessons</option>
          {lessons.map((lesson) => (
            <option key={lesson.slug} value={lesson.slug}>
              {lesson.title}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-left text-sm text-gray-500 rtl:text-right dark:text-gray-400">
        <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {TABLE_COLUMNS.map((column) => (
              <th key={column.key} scope="col" className="px-6 py-3">
                <button
                  className={clsx(
                    'flex items-center uppercase',
                    column.sortable ? 'cursor-pointer' : 'cursor-default',
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
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {problems.length > 0 ? (
            problems.map((problem) => (
              <tr
                key={problem.id}
                className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600"
              >
                <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 dark:text-white">
                  {problem.title}
                </td>
                <td className="px-6 py-4">{problem.difficulty}</td>
                <td className="px-6 py-4">{problem.lesson.title}</td>
                <td className="px-6 py-4">
                  {problem.problemProgress.some(
                    (progress) => progress.completed,
                  )
                    ? 'Completed'
                    : 'To Do'}
                </td>
                <td className="px-6 py-4">
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
            <tr className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600">
              <td
                colSpan={TABLE_COLUMNS.length}
                className="whitespace-nowrap px-6 py-4 text-center font-medium text-gray-900 dark:text-white"
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
