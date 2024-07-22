'use client'

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
    <div className="relative my-6 flex h-8 flex-wrap items-center justify-center gap-2 sm:gap-6 md:justify-start">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Found a bug, typo, or have feedback?
      </p>
      <a
        className="group inline-flex items-center rounded-full bg-zinc-800 px-4 py-1 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        href={`mailto:feedback@memoized.io?subject=Feedback%20for%20Lesson%20${lessonId}`}
      >
        <MdOutlineFeedback className="mr-2 h-5 w-5 text-zinc-200 group-hover:text-white" />
        <span>Let me know</span>
      </a>
    </div>
  )
}
