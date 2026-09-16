import { G3B_TASK, hasG3bPractice } from '@/lib/g3b-task'

export function G3bPracticeEntry({ lessonContentId, problems }: {
  lessonContentId: string | null
  problems: { contentId: string | null }[]
}) {
  if (!hasG3bPractice(lessonContentId, problems)) return null

  return (
    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
      Start with{' '}
      <a href={`#${G3B_TASK.id}`} className="font-medium text-lime-700 underline underline-offset-4 dark:text-lime-300">
        {G3B_TASK.title}
      </a>{' '}
      for substring practice. Prefix, subsequence and edit distance are optional comparisons.
    </p>
  )
}
