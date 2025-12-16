'use client'

import { markLesson } from '@/actions/markLesson'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { useIsCourseRoute } from '@/hooks/useIsCourseRoute'
import { usePages } from '@/hooks/usePages'
import { CustomError, handleError } from '@/lib/error-tracking'
import { CustomResponse, handleResponse } from '@/utils/response'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { enqueueSnackbar } from 'notistack'

export enum LessonCompleted {
  'YES' = 'YES',
  'NO' = 'NO',
}

type MarkButtonProps = {
  checked: boolean
  onClick: () => void
  children: React.ReactNode
  variant?: 'positive' | 'neutral'
}

const MarkButton = ({ checked, onClick, children, variant = 'neutral' }: MarkButtonProps) => {
  const checkedStyles = variant === 'positive'
    ? 'bg-lime-500 text-white dark:bg-lime-500 dark:text-zinc-900'
    : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200'

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 text-sm font-medium transition-all duration-200',
        checked
          ? checkedStyles
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200',
      )}
    >
      {children}
    </button>
  )
}

export type LessonStatusProps = {
  lessonId: string
}

export function LessonStatus({ lessonId }: LessonStatusProps) {
  const { data: session } = useSession()
  const { isStartOfSection, isIntroduction } = usePages()
  const isCourse = useIsCourseRoute()

  const openModal = useAuthStore((state) => state.openModal)
  const completedLessons = useContentStore((state) => state.completedLessons)
  const toggleCompletedLesson = useContentStore(
    (state) => state.toggleCompletedLesson,
  )
  const isCompleted = completedLessons.has(lessonId)

  const handleToggle = async (completed: boolean) => {
    if (!session) {
      return openModal()
    }

    if (isCompleted === completed){
      return
    }
 
    try {
      const response = await markLesson({ lessonId, completed })
      if (!response.success) return handleError(response, enqueueSnackbar)
      handleResponse(response as CustomResponse, enqueueSnackbar)
      toggleCompletedLesson(lessonId)
    } catch (error) {
      handleError(error as CustomError, enqueueSnackbar)
    }
  }

  if (isStartOfSection || isIntroduction || !isCourse) return null

  return (
    <div className="relative flex items-center justify-center gap-2 sm:gap-6 md:justify-start">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Lesson completed?
      </p>
      <div className="group grid h-8 grid-cols-[1fr,1px,1fr] overflow-hidden rounded-full border border-zinc-200 dark:border-white/10">
        <MarkButton checked={isCompleted} onClick={() => handleToggle(true)} variant="positive">
          Yes
        </MarkButton>
        <div className="bg-zinc-900/10 dark:bg-white/10" />
        <MarkButton checked={!isCompleted} onClick={() => handleToggle(false)} variant="neutral">
          No
        </MarkButton>
      </div>
    </div>
  )
}
