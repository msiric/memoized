'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { ProblemRow, ProblemStatus } from '@/types'
import { CustomError, handleError } from '@/utils/error'
import {
  ProblemFilter,
  capitalizeFirstLetter,
  filterAndSortProblems,
} from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { Lesson, ProblemDifficulty } from '@prisma/client'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6'
import { AnswerModal } from './AnswerModal'
import { Select } from './Select'

const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'difficulty', title: 'Difficulty', sortable: true },
  { key: 'lesson', title: 'Lesson', sortable: true },
  { key: 'answer', title: 'Answer', sortable: false },
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

  const [selectedProblem, setSelectedProblem] = useState<ProblemRow | null>(
    null,
  )
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)

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

    window.history.replaceState(
      {
        ...window.history.state,
        as: pathname,
        url: pathname,
      },
      '',
      pathname,
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

  const onCheckboxChange = async (
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) => {
    if (!session) {
      return openModal()
    }
    const currentlyCompleted = event.currentTarget.checked

    try {
      const response = await markProblem({
        problemId,
        completed: currentlyCompleted,
      })
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)
      toggleCompletedProblem(problemId)
      toggleCompletion(problemId)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    }
  }

  const handleShowAnswer = (problem: ProblemRow) => {
    setSelectedProblem(problem)
    setIsAnswerModalOpen(true)
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

    const queryString = query.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname

    window.history.replaceState(
      {
        ...window.history.state,
        as: newUrl,
        url: newUrl,
      },
      '',
      newUrl,
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
    <>
      <div className="my-10">
        <div className="mx-auto mb-4 flex max-w-[1024px] flex-wrap justify-between lg:flex-nowrap lg:gap-2">
          <div className="relative w-full p-1 sm:w-2/4 lg:p-0">
            <div className="rtl:inset-r-0 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <svg
                className="h-4 w-4 text-zinc-900 dark:text-white"
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
              className="focus:ring-0.5 block w-full appearance-none rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 ps-10 text-sm text-zinc-900 placeholder-zinc-900 focus:border-lime-500 focus:outline-none focus:ring-lime-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-white dark:placeholder-white dark:focus:border-lime-500 dark:focus:ring-lime-500"
              placeholder="Search for items"
            />
          </div>
          <div className="w-full p-1 sm:w-2/4 lg:p-0">
            <Select
              value={difficulty || ''}
              onChange={handleDifficultyChange}
              variant="primary"
              size="medium"
              className="w-full"
              options={[
                { value: '', label: 'All Difficulties' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
          </div>
          <div className="w-full p-1 sm:w-2/4 lg:p-0">
            <Select
              value={status || ''}
              onChange={handleStatusChange}
              variant="primary"
              size="medium"
              className="w-full"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'todo', label: 'To Do' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
          <div className="w-full p-1 sm:w-2/4 lg:p-0">
            <Select
              value={lesson || ''}
              onChange={handleLessonChange}
              variant="primary"
              size="medium"
              className="w-full"
              options={[
                { value: '', label: 'All Lessons' },
                ...lessons.map((lesson) => ({
                  value: lesson.slug ?? '',
                  label: lesson.title ?? '',
                })),
              ]}
            />
          </div>
          <button
            onClick={handleResetFilters}
            className="mt-2 w-full min-w-[100px] rounded text-sm text-zinc-900 lg:mt-0 lg:w-auto dark:text-white"
          >
            Reset Filters
          </button>
        </div>
        <div className="relative mx-auto max-w-[1024px] overflow-x-auto rounded-lg border border-zinc-300 shadow-lg dark:border-zinc-600">
          <table className="w-full overflow-hidden rounded-lg text-left text-sm text-zinc-500 rtl:text-right dark:text-zinc-400">
            <thead className="border-b border-zinc-300 bg-zinc-50 text-xs uppercase text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
              <tr>
                {TABLE_COLUMNS.map((column, index) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={clsx('px-6 py-3')}
                  >
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
                    className="border-b border-zinc-300 bg-white last:border-b-0 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-600"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-white">
                      <a
                        href={problem.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lime-500 hover:underline"
                      >
                        {problem.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {capitalizeFirstLetter(problem.difficulty)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {problem.lesson.title}
                    </td>
                    <td className="cursor-pointer px-6 py-4 text-center font-bold">
                      <span
                        className="hover:text-zinc-800 dark:hover:text-zinc-100"
                        onClick={() => handleShowAnswer(problem)}
                      >
                        Reveal
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={problem.problemProgress.some(
                          (progress) => progress.completed,
                        )}
                        onChange={(event) =>
                          onCheckboxChange(event, problem.id)
                        }
                        className="form-checkbox h-4 w-4 cursor-pointer accent-lime-500"
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
      </div>
      <AnswerModal
        isOpen={isAnswerModalOpen}
        onClose={() => {
          setIsAnswerModalOpen(false)
          setSelectedProblem(null)
        }}
        problem={selectedProblem}
      />
    </>
  )
}
