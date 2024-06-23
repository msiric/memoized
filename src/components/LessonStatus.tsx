'use client'

import { markLesson } from '@/actions/markLesson'
import { useAuthStore } from '@/contexts/auth'
import { useContentStore } from '@/contexts/progress'
import { usePages } from '@/hooks/usePages'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'

export enum LessonCompleted {
  'YES' = 'YES',
  'NO' = 'NO',
}

type MarkButtonProps = {
  checked: boolean
  onClick: () => void
  children: React.ReactNode
}

const MarkButton = ({ checked, onClick, children }: MarkButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'px-3 text-sm font-medium transition',
        checked
          ? 'bg-lime-600 text-white hover:bg-lime-500 dark:bg-lime-600 dark:text-white dark:hover:bg-lime-500'
          : 'text-zinc-600 hover:bg-zinc-900/2.5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export type LessonStatusProps = {
  userId?: string
  lessonId: string
}

export function LessonStatus({ userId, lessonId }: LessonStatusProps) {
  const { data: session } = useSession()
  const { isStartOfSection } = usePages()

  const openModal = useAuthStore((state) => state.openModal)
  const completedLessons = useContentStore((state) => state.completedLessons)
  const toggleCompletedLesson = useContentStore(
    (state) => state.toggleCompletedLesson,
  )
  const isCompleted = completedLessons.has(lessonId)

  async function handleToggle(completed: boolean) {
    if (!session) {
      return openModal()
    }

    try {
      await markLesson({ userId, lessonId, completed })
      toggleCompletedLesson(lessonId)
      console.log(
        `Lesson marked as ${completed ? 'completed' : 'not completed'}`,
      )
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (isStartOfSection) return null

  return (
    <div className="relative flex h-8 items-center justify-center gap-6 md:justify-start">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Lesson completed?
      </p>
      <div className="group grid h-8 grid-cols-[1fr,1px,1fr] overflow-hidden rounded-full border border-zinc-900/10 dark:border-white/10">
        <MarkButton checked={isCompleted} onClick={() => handleToggle(true)}>
          Yes
        </MarkButton>
        <div className="bg-zinc-900/10 dark:bg-white/10" />
        <MarkButton checked={!isCompleted} onClick={() => handleToggle(false)}>
          No
        </MarkButton>
      </div>
    </div>
  )
}
