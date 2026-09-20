import { groupPracticeProblems, PRACTICE_COMPLETION_NOTE } from '@/lib/problem-presentation'
import { ProblemCard, type PracticeProblem } from './ProblemCard'

export function PracticeProblemGroups({
  problems,
  defaultExpanded = false,
  grouped = false,
}: {
  problems: readonly PracticeProblem[]
  defaultExpanded?: boolean
  grouped?: boolean
}) {
  const groups = groupPracticeProblems(problems)
  if (groups.length === 0) return null
  if (!grouped) return (
    <div className="space-y-3">
      {problems.map(problem => (
        <ProblemCard key={problem.id} problem={problem} defaultExpanded={defaultExpanded} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {PRACTICE_COMPLETION_NOTE} The task type does not determine whether it is optional.
      </p>
      {groups.map(group => (
        <section key={group.type} aria-label={group.title}>
          <p className="!mb-3 !mt-0 text-base font-semibold text-zinc-900 dark:text-zinc-100" aria-hidden="true">
            {group.title}
          </p>
          <div className="space-y-3">
            {group.problems.map(problem => (
              <ProblemCard key={problem.id} problem={problem} defaultExpanded={defaultExpanded} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
