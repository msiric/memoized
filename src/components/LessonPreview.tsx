import { type PracticeProblem } from './ProblemCard'
import { PracticeProblemGroups } from './PracticeProblemGroups'
import { PremiumCTA } from './PremiumCTA'
import { CONTENT_COLUMN_CLASSES } from '@/constants/content-layout'
import { PRACTICE_PROBLEMS_PREFIX } from '@/constants'
import { ReactNode } from 'react'

export function LessonPreview({
  title,
  description,
  topics,
  problems,
  header,
  actions,
  groupPractice = false,
}: {
  title: string
  description: string | null
  topics: string[]
  problems: PracticeProblem[]
  header?: ReactNode
  actions?: ReactNode
  groupPractice?: boolean
}) {
  return (
    <article className={`${CONTENT_COLUMN_CLASSES} pb-10 pt-8`}>
      {header}
      <p className="mb-3 text-xs font-medium text-lime-700 dark:text-lime-300">
        Lesson overview · Free interview practice
      </p>
      <h1 className="mb-5 break-words text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h1>
      {actions && <div className="mb-5">{actions}</div>}
      {description && (
        <p className="mb-6 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
          {description}
        </p>
      )}
      {topics.length > 0 && (
        <details className="mb-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-700">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Topics in the full lesson
          </summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {topics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </details>
      )}
      {problems.length > 0 && (
        <section aria-label="Free interview practice">
          <h2 id={PRACTICE_PROBLEMS_PREFIX.slice(1)} className="mb-3 scroll-mt-24 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Practice Problems
          </h2>
          <p className="mb-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Work through a question before revealing its explanation. These
            questions and answers are free; Premium adds the full lesson
            walkthrough, examples and implementation detail.
          </p>
          <PracticeProblemGroups problems={problems} defaultExpanded grouped={groupPractice} />
        </section>
      )}
      <div className="premium-content">
        <PremiumCTA heading={title} />
      </div>
    </article>
  )
}
