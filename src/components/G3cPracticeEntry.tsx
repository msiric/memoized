import { G3C_TASK, hasG3cPractice } from '@/lib/g3c-task'

export function G3cPracticeEntry({ lessonContentId, problems }: {
  lessonContentId: string | null
  problems: { contentId: string | null }[]
}) {
  if (!hasG3cPractice(lessonContentId, problems)) return null

  return (
    <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
      For a local UI attempt, open{' '}
      <a href={`#${G3C_TASK.id}`} className="font-medium text-lime-700 underline underline-offset-4 dark:text-lime-300">
        {G3C_TASK.title}
      </a>. Its preparation, starter and feedback are free. The other questions
      provide format, design, utility and communication references.
    </p>
  )
}
