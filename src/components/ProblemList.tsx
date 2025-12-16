'use client'

import { markProblem } from '@/actions/markProblem'
import { PROBLEM_CARD } from '@/constants/designTokens'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { ProblemFilter, EnrichedProblem, ProblemStatus } from '@/types'
import { CustomError, handleError } from '@/lib/error-tracking'
import { filterAndSortProblems } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { Lesson, ProblemDifficulty, ProblemType } from '@prisma/client'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { enqueueSnackbar } from 'notistack'
import { ChangeEvent, memo, useCallback, useEffect, useState } from 'react'
import { FaSort, FaSortDown, FaSortUp } from 'react-icons/fa6'
import {
  HiCheck,
  HiCodeBracket,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2'
import { SlideOverPanel } from './SlideOverPanel'
import { PreserializedMdxRenderer } from './PreserializedMdxRenderer'
import { Select } from './Select'
import { SearchIcon } from './icons'
import {
  TypeBadge,
  DifficultyBadge,
  LessonBadge,
  ThinkingPrompt,
} from './ProblemCard/shared'

const TABLE_COLUMNS = [
  { key: 'title', title: 'Title', sortable: true },
  { key: 'difficulty', title: 'Difficulty', sortable: true },
  { key: 'lesson', title: 'Lesson', sortable: true },
  { key: 'type', title: 'Type', sortable: true },
  { key: 'completed', title: 'Completed', sortable: false },
]

type ProblemRowProps = {
  problem: EnrichedProblem
  handleShowAnswer: (problem: EnrichedProblem) => void
  handleCheckboxChange: (
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) => Promise<void>
}

const ProblemRow = memo(
  ({ problem, handleShowAnswer, handleCheckboxChange }: ProblemRowProps) => {
    const isTheory = problem.type === ProblemType.THEORY
    return (
      <tr
        key={problem.id}
        className="border-b border-zinc-200 bg-white last:border-b-0 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/50"
      >
        <td className="max-w-[300px] whitespace-nowrap px-6 py-4 font-medium text-zinc-900 dark:text-white">
          <button
            onClick={() => handleShowAnswer(problem)}
            className={clsx(
              'whitespace-pre-wrap text-left transition-colors',
              isTheory
                ? 'text-lime-600 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-300'
                : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300',
            )}
          >
            {problem.title}
          </button>
        </td>
        <td className="px-6 py-4 text-center">
          <DifficultyBadge difficulty={problem.difficulty} />
        </td>
        <td className="px-6 py-4 text-center">
          <LessonBadge title={problem.lesson.title} href={problem.lesson.href} />
        </td>
        <td className="px-6 py-4 text-center">
          <TypeBadge type={problem.type} />
        </td>
        <td className="px-6 py-4 text-center">
          <input
            type="checkbox"
            checked={problem.problemProgress.some(
              (progress) => progress.completed,
            )}
            onChange={(event) => handleCheckboxChange(event, problem.id)}
            className="form-checkbox h-4 w-4 cursor-pointer accent-lime-500"
          />
        </td>
      </tr>
    )
  },
)

ProblemRow.displayName = 'ProblemRow'

type RevealStage = 'question' | 'answer'

type ProblemSlideOverContentProps = {
  problem: EnrichedProblem
  onCheckboxChange: (
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) => Promise<void>
}

const ProblemSlideOverContent = ({
  problem,
  onCheckboxChange,
}: ProblemSlideOverContentProps) => {
  const [stage, setStage] = useState<RevealStage>('question')
  const completedProblems = useContentStore((state) => state.completedProblems)

  const isTheory = problem.type === 'THEORY'
  const isCompleted = completedProblems.has(problem.id)

  const handleRevealAnswer = useCallback(() => {
    setStage('answer')
  }, [])

  // Reset stage when problem changes
  useEffect(() => {
    setStage('question')
  }, [problem.id])

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header with badges */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <TypeBadge type={problem.type} />
        <DifficultyBadge difficulty={problem.difficulty} />
        <LessonBadge title={problem.lesson.title} href={problem.lesson.href} />
      </div>

      {/* Title */}
      {isTheory ? (
        <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white">
          {problem.title}
        </h2>
      ) : (
        <a
          href={problem.href}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 text-base sm:text-lg font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {problem.title}
          <HiArrowTopRightOnSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-50 transition-opacity group-hover:opacity-100" />
        </a>
      )}

      {/* Completed checkbox */}
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <div className="relative">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => onCheckboxChange(e, problem.id)}
              className="peer sr-only"
            />
            <div
              className={clsx(
                'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200',
                isCompleted
                  ? 'border-lime-500 bg-lime-500 dark:border-lime-500 dark:bg-lime-500'
                  : 'border-zinc-300 bg-transparent hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500',
              )}
            >
              {isCompleted && <HiCheck className="h-3 w-3 text-white dark:text-zinc-900" />}
            </div>
          </div>
          <span className={clsx(isCompleted ? 'text-lime-600 dark:text-lime-400' : 'text-zinc-500 dark:text-zinc-400')}>
            {isCompleted ? 'Completed' : 'Mark complete'}
          </span>
        </label>
      </div>

      {/* Question */}
      {problem.question && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <span className={clsx(PROBLEM_CARD.sectionLabel, PROBLEM_CARD.questionLabel)}>
            Question
          </span>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 sm:p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {problem.question}
            </p>
          </div>
        </motion.div>
      )}

      {/* Stage-specific content */}
      <AnimatePresence mode="wait">
        {stage === 'question' && (
          <ThinkingPrompt key="thinking" onReveal={handleRevealAnswer} isTheory={isTheory} />
        )}

        {stage === 'answer' && (
          <motion.div
            key="answer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Answer content */}
            {problem.serializedAnswer && (
              <div className="space-y-2">
                <span className={clsx(
                  PROBLEM_CARD.sectionLabel,
                  isTheory ? PROBLEM_CARD.answerLabelTheory : PROBLEM_CARD.answerLabelCoding
                )}>
                  Answer
                </span>
                <div className="rounded-lg bg-white p-3 sm:p-4 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                  <PreserializedMdxRenderer
                    serializedContent={problem.serializedAnswer}
                    withPadding={false}
                    showFooter={false}
                    showNextPage={false}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* External link for coding problems */}
      {!isTheory && problem.href && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="border-t border-zinc-200 pt-4 dark:border-zinc-700"
        >
          <a
            href={problem.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 sm:gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
          >
            <HiCodeBracket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Practice on LeetCode
            <HiArrowTopRightOnSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </a>
        </motion.div>
      )}
    </div>
  )
}

type ProblemListProps = {
  allProblems: EnrichedProblem[]
  filteredProblems: EnrichedProblem[]
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

  const [selectedProblem, setSelectedProblem] =
    useState<EnrichedProblem | null>(null)
  const [selectedProblemIndex, setSelectedProblemIndex] = useState<number>(-1)
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)

  const [problems, setProblems] = useState<EnrichedProblem[]>(filteredProblems)
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
  const [type, setType] = useState<string | null>(
    searchParams?.get('type')?.toLowerCase() || '',
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
      type: type as ProblemType,
      sortColumn: sortColumn as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    }

    const newProblems = filterAndSortProblems(allProblems, filter)
    setProblems(newProblems)
  }, [
    allProblems,
    search,
    difficulty,
    status,
    lesson,
    type,
    sortColumn,
    sortOrder,
  ])

  useEffect(() => {
    filterAndSortProblemsClient()
  }, [
    search,
    difficulty,
    status,
    lesson,
    type,
    sortColumn,
    sortOrder,
    filterAndSortProblemsClient,
  ])

  useEffect(() => {
    setSearch(searchParams?.get('search') || '')
    setDifficulty(searchParams?.get('difficulty') || '')
    setStatus(searchParams?.get('status') || '')
    setLesson(searchParams?.get('lesson') || '')
    setType(searchParams?.get('type') || '')
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

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setType(event.target.value || null)
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
    setType(null)
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

  const handleShowAnswer = (problem: EnrichedProblem) => {
    const index = problems.findIndex((p) => p.id === problem.id)
    setSelectedProblem(problem)
    setSelectedProblemIndex(index)
    setIsAnswerModalOpen(true)
  }

  const handleNavigateNext = () => {
    if (selectedProblemIndex < problems.length - 1) {
      const nextIndex = selectedProblemIndex + 1
      setSelectedProblemIndex(nextIndex)
      setSelectedProblem(problems[nextIndex])
    }
  }

  const handleNavigatePrevious = () => {
    if (selectedProblemIndex > 0) {
      const prevIndex = selectedProblemIndex - 1
      setSelectedProblemIndex(prevIndex)
      setSelectedProblem(problems[prevIndex])
    }
  }

  const handleCloseSlideOver = () => {
    setIsAnswerModalOpen(false)
    setSelectedProblem(null)
    setSelectedProblemIndex(-1)
  }

  useEffect(() => {
    const query = new URLSearchParams()

    const params = {
      search,
      difficulty,
      status,
      lesson,
      type,
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
    type,
    sortColumn,
    sortOrder,
    router,
    pathname,
  ])

  return (
    <>
      {/* Page Header - using prose for consistent typography styling */}
      <article className="pt-10 md:pt-16">
        <div className="prose mx-auto mb-8 max-w-[1024px] dark:prose-invert">
          <h1>Welcome to the Problems Page: Master Every Challenge</h1>
          <p className="lead">
            Browse and filter through 450+ JavaScript interview problems. Track your progress, reveal solutions and master each topic systematically.
          </p>
        </div>
      </article>

      <div className="mb-10">
        <div className="mx-auto mb-4 flex max-w-[1024px] flex-wrap justify-between lg:flex-nowrap lg:gap-2">
          <div className="relative w-full p-1 sm:w-2/4 lg:p-0">
            <div className="rtl:inset-r-0 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <SearchIcon className="h-4 w-4 text-zinc-900 dark:text-white" aria-hidden="true" />
            </div>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              className="focus:ring-0.5 block w-full appearance-none truncate rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 ps-10 pr-3 text-sm text-zinc-900 placeholder-zinc-500 focus:border-lime-500 focus:outline-none focus:ring-lime-500 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-400 dark:focus:border-lime-500 dark:focus:ring-lime-500"
              placeholder="Search problems..."
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
                { value: 'incomplete', label: 'Incomplete' },
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
          <div className="w-full p-1 sm:w-2/4 lg:p-0">
            <Select
              value={type || ''}
              onChange={handleTypeChange}
              variant="primary"
              size="medium"
              className="w-full"
              options={[
                { value: '', label: 'All Types' },
                { value: 'coding', label: 'Coding' },
                { value: 'theory', label: 'Theory' },
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
                  <ProblemRow
                    key={problem.id}
                    problem={problem}
                    handleShowAnswer={handleShowAnswer}
                    handleCheckboxChange={onCheckboxChange}
                  />
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
      <SlideOverPanel
        isOpen={isAnswerModalOpen}
        onClose={handleCloseSlideOver}
        title={selectedProblem?.title || 'Problem'}
        onNext={handleNavigateNext}
        onPrevious={handleNavigatePrevious}
        hasNext={selectedProblemIndex < problems.length - 1}
        hasPrevious={selectedProblemIndex > 0}
        currentIndex={selectedProblemIndex}
        totalCount={problems.length}
        problemType={selectedProblem?.type as 'THEORY' | 'CODING'}
      >
        {selectedProblem && (
          <ProblemSlideOverContent
            key={selectedProblem.id}
            problem={selectedProblem}
            onCheckboxChange={onCheckboxChange}
          />
        )}
      </SlideOverPanel>
    </>
  )
}
