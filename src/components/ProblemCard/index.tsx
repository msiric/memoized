'use client'

import { markProblem } from '@/actions/markProblem'
import { PROBLEM_CARD } from '@/constants/designTokens'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { CustomError, handleError } from '@/lib/error-tracking'
import { CustomResponse, handleResponse } from '@/utils/response'
import { Problem, ProblemType } from '@prisma/client'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { enqueueSnackbar } from 'notistack'
import { ChangeEvent, useCallback, useEffect, useState } from 'react'
import {
  HiCheck,
  HiChevronDown,
  HiCodeBracket,
  HiArrowTopRightOnSquare,
} from 'react-icons/hi2'
import slugify from 'slugify'
import { SLUGIFY_OPTIONS } from '../../constants'
import { PreserializedMdxRenderer } from '../PreserializedMdxRenderer'
import { TypeBadge, DifficultyBadge, ThinkingPrompt } from './shared'

export type RevealStage = 'collapsed' | 'question' | 'answer'

export type ProblemCardProps = {
  problem: Problem
  defaultExpanded?: boolean
  showLesson?: boolean
  lessonTitle?: string
}

export const ProblemCard = ({
  problem,
  defaultExpanded = false,
  showLesson = false,
  lessonTitle,
}: ProblemCardProps) => {
  const { data: session } = useSession()
  const openModal = useAuthStore((state) => state.openModal)
  const completedProblems = useContentStore((state) => state.completedProblems)
  const toggleCompletedProblem = useContentStore(
    (state) => state.toggleCompletedProblem,
  )

  const [stage, setStage] = useState<RevealStage>(
    defaultExpanded ? 'question' : 'collapsed',
  )
  const [thinkStartTime, setThinkStartTime] = useState<number | null>(null)

  const problemSlug = slugify(problem.title, SLUGIFY_OPTIONS)
  const isTheory = problem.type === ProblemType.THEORY

  // Handle URL hash navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const slug = `#${problemSlug}`
      if (window.location.hash === slug) {
        setStage('question')
        setTimeout(() => {
          const el = document.querySelector(slug)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            el.classList.add('animate-borderFlash')
            setTimeout(() => el.classList.remove('animate-borderFlash'), 2000)
          }
        }, 100)
      }
    }
  }, [problemSlug])

  // Track thinking time
  useEffect(() => {
    if (stage === 'question' && !thinkStartTime) {
      setThinkStartTime(Date.now())
    }
  }, [stage, thinkStartTime])

  const handleToggle = useCallback(() => {
    if (stage === 'collapsed') {
      setStage('question')
    } else {
      setStage('collapsed')
      setThinkStartTime(null)
    }
  }, [stage])

  const handleRevealAnswer = useCallback(() => {
    setStage('answer')
  }, [])

  const handleCheckboxChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!session) return openModal()
    const currentlyCompleted = event.currentTarget.checked

    try {
      const response = await markProblem({
        problemId: problem.id,
        completed: currentlyCompleted,
      })
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)
      toggleCompletedProblem(problem.id)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    }
  }

  const isExpanded = stage !== 'collapsed'

  return (
    <motion.div
      id={problemSlug}
      className={clsx(
        PROBLEM_CARD.base,
        isTheory ? PROBLEM_CARD.theory : PROBLEM_CARD.coding,
        PROBLEM_CARD.hover,
        isExpanded && PROBLEM_CARD.expanded,
        'scroll-mt-28',
      )}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left side: Title, badges, lesson */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={problem.type} />
            <DifficultyBadge difficulty={problem.difficulty} />
            {showLesson && lessonTitle && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {lessonTitle}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {isTheory ? (
              problem.title
            ) : (
              <a
                href={problem.href}
                target="_blank"
                rel="noopener noreferrer"
                className="not-prose group inline-flex items-center gap-1.5 text-zinc-900 hover:text-zinc-700 dark:text-white dark:hover:text-zinc-300"
              >
                {problem.title}
                <HiArrowTopRightOnSquare className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
              </a>
            )}
          </h3>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-3">
          {/* Completed checkbox */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="relative">
              <input
                type="checkbox"
                checked={completedProblems.has(problem.id)}
                onChange={handleCheckboxChange}
                className="peer sr-only"
              />
              <div
                className={clsx(
                  'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all duration-200',
                  completedProblems.has(problem.id)
                    ? 'border-lime-500 bg-lime-500 dark:border-lime-500 dark:bg-lime-500'
                    : 'border-zinc-300 bg-transparent hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500',
                )}
              >
                {completedProblems.has(problem.id) && <HiCheck className="h-3 w-3 text-white dark:text-zinc-900" />}
              </div>
            </div>
            <span className={clsx(completedProblems.has(problem.id) ? 'text-lime-600 dark:text-lime-400' : 'text-zinc-500 dark:text-zinc-400')}>
              {completedProblems.has(problem.id) ? 'Completed' : 'Mark complete'}
            </span>
          </label>

          {/* Expand/collapse button */}
          {problem.serializedAnswer && (
            <button
              onClick={handleToggle}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
            >
              <motion.span
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <HiChevronDown className="h-4 w-4" />
              </motion.span>
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 }
              }
            }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              {/* Question */}
              {problem.question && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-4 space-y-2"
                >
                  <span className={clsx(PROBLEM_CARD.sectionLabel, PROBLEM_CARD.questionLabel)}>
                    Question
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
                    {problem.question}
                  </p>
                </motion.div>
              )}

              {/* Stage-specific content */}
              <AnimatePresence mode="wait">
                {stage === 'question' && (
                  <ThinkingPrompt
                    key="thinking"
                    onReveal={handleRevealAnswer}
                    isTheory={isTheory}
                  />
                )}

                {stage === 'answer' && (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {/* Answer content */}
                    {problem.serializedAnswer && (
                      <div className="mb-4 space-y-2">
                        <span className={clsx(
                          PROBLEM_CARD.sectionLabel,
                          isTheory ? PROBLEM_CARD.answerLabelTheory : PROBLEM_CARD.answerLabelCoding
                        )}>
                          Answer
                        </span>
                        <div>
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
                  className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700"
                >
                  <a
                    href={problem.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="not-prose inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                  >
                    <HiCodeBracket className="h-4 w-4" />
                    Practice on LeetCode
                    <HiArrowTopRightOnSquare className="h-3.5 w-3.5" />
                  </a>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ProblemCard
