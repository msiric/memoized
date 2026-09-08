import { ProblemCard, type PracticeProblem } from './ProblemCard'
import { PremiumCTA } from './PremiumCTA'

export function LessonPreview({
  title,
  description,
  topics,
  problems,
}: {
  title: string
  description: string | null
  topics: string[]
  problems: PracticeProblem[]
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pb-10">
      <p className="mb-3 text-xs font-medium text-lime-700 dark:text-lime-300">
        Lesson overview · Free interview practice
      </p>
      <h1 className="mb-5 break-words text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h1>
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
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Try the free interview questions
          </h2>
          <p className="mb-5 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            Work through a question before revealing its explanation. These
            questions and answers are free; Premium adds the full lesson
            walkthrough, examples and implementation detail.
          </p>
          <div className="space-y-4">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} defaultExpanded />
            ))}
          </div>
        </section>
      )}
      <div className="premium-content">
        <PremiumCTA heading={title} />
      </div>
    </article>
  )
}
