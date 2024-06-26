'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useDebounce } from '@/hooks/useDebounce'
import { ProblemRow } from '@/types'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChangeEvent, useEffect, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6'

const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'difficulty', title: 'Difficulty', sortable: true },
  { key: 'tags', title: 'Tags', sortable: true },
  { key: 'status', title: 'Status', sortable: false },
  { key: 'completed', title: 'Completed', sortable: false },
]

type ProblemListProps = {
  initialProblems: ProblemRow[]
}

export const ProblemList = ({ initialProblems }: ProblemListProps) => {
  const { data: session } = useSession()
  const toggleCompletedProblem = useContentStore(
    (state) => state.toggleCompletedProblem,
  )
  const openModal = useAuthStore((state) => state.openModal)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [problems, setProblems] = useState<ProblemRow[]>(initialProblems)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [difficulty, setDifficulty] = useState<string | null>(
    searchParams.get('difficulty') || '',
  )
  const [status, setStatus] = useState<string | null>(
    searchParams.get('status') || '',
  )
  const [tags, setTags] = useState<string[]>(
    searchParams.get('tags')
      ? (searchParams.get('tags') as string).split(',')
      : [],
  )
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null)

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    const fetchProblems = async () => {
      const params = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch as string }),
        ...(difficulty && { difficulty: difficulty as string }),
        ...(status && { status: status as string }),
        ...(tags.length && { tags: tags.join(',') }),
        ...(sortColumn && { sortColumn }),
        ...(sortOrder && { sortOrder }),
      })

      const response = await fetch(`/api/problems?${params}`)
      const data = await response.json()
      setProblems(data.problems)
    }

    fetchProblems()
  }, [debouncedSearch, difficulty, status, tags, sortColumn, sortOrder])

  useEffect(() => {
    const query = new URLSearchParams(searchParams.toString())

    const params = {
      search,
      difficulty,
      status,
      tags: tags.length ? tags.join(',') : '',
      sortColumn,
      sortOrder,
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value)
      else query.delete(key)
    })

    router.push(`${pathname}?${query.toString()}`)
  }, [
    difficulty,
    pathname,
    router,
    search,
    searchParams,
    status,
    tags,
    sortColumn,
    sortOrder,
  ])

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

  const handleTagsChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(
      event.target.selectedOptions,
      (option) => option.value,
    )
    setTags(value)
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
    setTags([])
    setSortColumn(null)
    setSortOrder(null)

    const query = new URLSearchParams()
    router.push(`${pathname}?${query.toString()}`)
  }

  const toggleCompletion = async (problemId: string) => {
    const updatedProblems = problems.map((problem) =>
      problem.id === problemId
        ? {
            ...problem,
            problemProgress: problem.problemProgress.map((progress) => ({
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
          multiple
          value={tags}
          onChange={handleTagsChange}
          className="rounded border p-2"
        >
          {/* Replace with dynamic tag options */}
          <option value="linked-lists">Linked Lists</option>
          <option value="trees">Trees</option>
          <option value="graphs">Graphs</option>
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
          {problems.map((problem) => (
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
                {problem.problemProgress.some((progress) => progress.completed)
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
