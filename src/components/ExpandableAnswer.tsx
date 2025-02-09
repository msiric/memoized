'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { CustomError, handleError } from '@/utils/error'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { CustomResponse, handleResponse } from '@/utils/response'
import { Problem, ProblemType } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { enqueueSnackbar } from 'notistack'
import { ChangeEvent, useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import { MdxRenderer } from './MdxRenderer'

export type ExpandableAnswerProps = {
  problem?: Problem
}

export const ExpandableAnswer = ({ problem }: ExpandableAnswerProps) => {
  const { data: session } = useSession()
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set())
  const openModal = useAuthStore((state) => state.openModal)
  const completedProblems = useContentStore((state) => state.completedProblems)
  const toggleCompletedProblem = useContentStore(
    (state) => state.toggleCompletedProblem,
  )

  const toggleAnswer = (problemId: string) => {
    setExpandedAnswers((prev) => {
      const next = new Set(prev)
      if (next.has(problemId)) {
        next.delete(problemId)
      } else {
        next.add(problemId)
      }
      return next
    })
  }

  const onCheckboxChange = async (
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) => {
    if (!session) return openModal()
    const currentlyCompleted = event.currentTarget.checked

    try {
      const response = await markProblem({
        problemId,
        completed: currentlyCompleted,
      })
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)
      toggleCompletedProblem(problemId)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    }
  }

  if (!problem) return null

  return (
    <div
      key={problem.href}
      className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col items-start justify-center">
          {problem.type === ProblemType.THEORY ? (
            <span className="font-bold text-lime-500">{problem.title}</span>
          ) : (
            <a
              href={problem.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lime-500 hover:underline"
            >
              {problem.title}
            </a>
          )}
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            Difficulty:{' '}
            <span className="font-bold">
              {capitalizeFirstLetter(problem.difficulty)}
            </span>
          </span>
        </div>
        <div className="flex flex-col items-end">
          <label className="flex cursor-pointer items-center space-x-2 text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={completedProblems.has(problem.id)}
              className="form-checkbox h-4 w-4 cursor-pointer accent-lime-500"
              onChange={(event) => onCheckboxChange(event, problem.id)}
            />
            <span className="text-sm">Completed</span>
          </label>
          {problem.answer && (
            <button
              onClick={() => toggleAnswer(problem.id)}
              className="flex items-center gap-1 text-sm font-bold text-zinc-600 hover:text-zinc-800 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              <div
                className={`transform transition-transform duration-200 ${
                  expandedAnswers.has(problem.id) ? 'rotate-180' : ''
                }`}
              >
                <BiChevronDown className="h-5 w-5" />
              </div>
              Expand
            </button>
          )}
        </div>
      </div>
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          expandedAnswers.has(problem.id)
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          {problem.question && (
            <p className="color-white m-0 mt-5 font-bold">{problem.question}</p>
          )}
          {problem.answer && <MdxRenderer content={problem.answer} />}
        </div>
      </div>
    </div>
  )
}
