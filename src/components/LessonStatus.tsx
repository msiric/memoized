'use client'

import { markLesson } from '@/actions/markLesson'
import { useAuthStore } from '@/contexts/auth'
import { useProgressStore } from '@/contexts/progress'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import { FormEvent, forwardRef } from 'react'

export enum LessonCompleted {
  'YES' = 'YES',
  'NO' = 'NO',
}

function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <circle cx="10" cy="10" r="10" strokeWidth="0" />
      <path
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        d="m6.75 10.813 2.438 2.437c1.218-4.469 4.062-6.5 4.062-6.5"
      />
    </svg>
  )
}

function MarkButton(
  props: Omit<
    React.ComponentPropsWithoutRef<'button'>,
    'type' | 'className'
  > & { checked: boolean },
) {
  return (
    <button
      type="submit"
      className={clsx(
        'px-3 text-sm font-medium text-zinc-600 transition hover:bg-zinc-900/2.5 hover:text-zinc-900 dark:hover:bg-white/5 dark:hover:text-white',
        props.checked
          ? 'bg-lime-500 text-white dark:bg-lime-700 dark:text-white'
          : 'dark:text-zinc-400',
      )}
      {...props}
    />
  )
}

const MarkForm = forwardRef<
  React.ElementRef<'form'>,
  Pick<React.ComponentPropsWithoutRef<'form'>, 'onSubmit'> & {
    completed: boolean
  }
>(function MarkForm({ onSubmit, completed }, ref) {
  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className="absolute inset-0 flex items-center justify-center gap-6 md:justify-start"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Lesson completed?
      </p>
      <div className="group grid h-8 grid-cols-[1fr,1px,1fr] overflow-hidden rounded-full border border-zinc-900/10 dark:border-white/10">
        <MarkButton checked={!!completed} data-response={LessonCompleted.YES}>
          Yes
        </MarkButton>
        <div className="bg-zinc-900/10 dark:bg-white/10" />
        <MarkButton checked={!completed} data-response={LessonCompleted.NO}>
          No
        </MarkButton>
      </div>
    </form>
  )
})

export type LessonStatusProps = {
  userId?: string
  lessonId: string
}

export function LessonStatus({ userId, lessonId }: LessonStatusProps) {
  const { data: session } = useSession()

  const openModal = useAuthStore((state) => state.openModal)
  const completedLessons = useProgressStore((state) => state.completedLessons)
  const toggleCompletedLesson = useProgressStore(
    (state) => state.toggleCompletedLesson,
  )
  const isCompleted = Array.from(completedLessons).some(
    (lesson) => lesson === lessonId,
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session) {
      return openModal()
    }
    const button = document.activeElement as HTMLButtonElement
    const response = button.getAttribute('data-response')
    const currentlyCompleted = response === LessonCompleted.YES

    try {
      await markLesson({ userId, lessonId, completed: currentlyCompleted })
      toggleCompletedLesson(lessonId)
      console.log(
        `Lesson marked as ${isCompleted ? 'completed' : 'not completed'}`,
      )
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="relative h-8">
      <MarkForm onSubmit={onSubmit} completed={isCompleted} />
    </div>
  )
}
