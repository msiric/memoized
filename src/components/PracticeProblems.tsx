'use client'

import { markProblem } from '@/actions/markProblem'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { capitalizeFirstLetter } from '@/utils/helpers'
import { Problem } from '@prisma/client'
import { useSession } from 'next-auth/react'
import { ChangeEvent } from 'react'

export type PracticeProblemsProps = {
  userId?: string
  problems?: Problem[]
}

export const PracticeProblems = ({
  userId,
  problems,
}: PracticeProblemsProps) => {
  const { data: session } = useSession()

  const openModal = useAuthStore((state) => state.openModal)

  const completedProblems = useContentStore((state) => state.completedProblems)
  const toggleCompletedProblem = useContentStore(
    (state) => state.toggleCompletedProblem,
  )

  async function onCheckboxChange(
    event: ChangeEvent<HTMLInputElement>,
    problemId: string,
  ) {
    if (!session) {
      return openModal()
    }
    const currentlyCompleted = event.currentTarget.checked

    try {
      await markProblem({ userId, problemId, completed: currentlyCompleted })
      toggleCompletedProblem(problemId)
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
    <>
      <h2
        className="!mt-16 scroll-mt-24 text-2xl font-bold"
        id="practice-problems"
      >
        <a
          className="group text-inherit no-underline hover:text-inherit"
          href="#practice-problems"
        >
          <div className="absolute ml-[calc(-1*var(--width))] mt-1 hidden w-[var(--width)] opacity-0 transition [--width:calc(2.625rem+0.5px+50%-min(50%,calc(theme(maxWidth.lg)+theme(spacing.8))))] group-hover:opacity-100 group-focus:opacity-100 md:block lg:z-50 2xl:[--width:theme(spacing.10)]">
            <div className="group/anchor block h-5 w-5 rounded-lg bg-zinc-50 ring-1 ring-inset ring-zinc-300 transition hover:ring-zinc-500 dark:bg-zinc-800 dark:ring-zinc-700 dark:hover:bg-zinc-700 dark:hover:ring-zinc-600">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                strokeLinecap="round"
                aria-hidden="true"
                className="h-5 w-5 stroke-zinc-500 transition dark:stroke-zinc-400 dark:group-hover/anchor:stroke-white"
              >
                <path d="m6.5 11.5-.964-.964a3.535 3.535 0 1 1 5-5l.964.964m2 2 .964.964a3.536 3.536 0 0 1-5 5L8.5 13.5m0-5 3 3"></path>
              </svg>
            </div>
          </div>
          <strong>Practice Problems</strong>
        </a>
      </h2>
      <ol className="space-y-4">
        {problems?.map((problem) => (
          <li key={problem.href}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start justify-center">
                <a
                  href={problem.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-500 hover:underline"
                >
                  {problem.title}
                </a>
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  Difficulty:{' '}
                  <span className="font-bold">
                    {capitalizeFirstLetter(problem.difficulty)}
                  </span>
                </span>
              </div>
              <label className="flex cursor-pointer items-center space-x-2 text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={completedProblems.has(problem.id)}
                  className="form-checkbox h-4 w-4 cursor-pointer accent-lime-500 focus:accent-lime-600"
                  onChange={(event) => onCheckboxChange(event, problem.id)}
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  Completed
                </span>
              </label>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
