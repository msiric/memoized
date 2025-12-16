'use client'

import { FEEDBACK_EMAIL } from '@/constants'
import { useIsCourseRoute } from '@/hooks/useIsCourseRoute'
import { usePages } from '@/hooks/usePages'
import { MdOutlineFeedback } from 'react-icons/md'

export type LessonFeedbackProps = {
  lessonId: string
}

export function LessonFeedback({ lessonId }: LessonFeedbackProps) {
  const { isStartOfSection, isIntroduction } = usePages()
  const isCourse = useIsCourseRoute()

  if (isStartOfSection || isIntroduction || !isCourse) return null

  return (
    <div className="relative my-6 flex flex-wrap items-center justify-center gap-2 sm:gap-6 md:justify-start">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Found a bug, typo, or have feedback?
      </p>
      <a
        className="group inline-flex items-center rounded-full bg-amber-600/20 px-4 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-500/30 transition-all duration-200 hover:scale-105 hover:bg-amber-600/30 hover:text-amber-600 hover:shadow-md hover:shadow-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20 dark:hover:bg-amber-500/20 dark:hover:text-amber-200 dark:hover:shadow-amber-500/10"
        href={`mailto:${FEEDBACK_EMAIL}?subject=Feedback%20for%20lesson%20${lessonId}`}
      >
        <MdOutlineFeedback className="mr-2 h-5 w-5 text-amber-600 group-hover:text-amber-500 dark:text-amber-400 dark:group-hover:text-amber-300" />
        <span>Let me know</span>
      </a>
    </div>
  )
}
