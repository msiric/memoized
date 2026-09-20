export function isNativeCodingProblem(problem: { type: string; href?: string | null }): boolean {
  return problem.type === 'CODING' && !problem.href?.trim()
}

export const PRACTICE_COMPLETION_NOTE =
  'Completion marks record your own progress, not an automatically checked result.'
export const NATIVE_PRACTICE_NOTE =
  'Implement and check your solution in the stated environment before revealing the answer.'

const PRACTICE_GROUPS = [
  { type: 'THEORY', title: 'Theory questions' },
  { type: 'CODING', title: 'Coding practice' },
] as const

export function groupPracticeProblems<T extends { type: string }>(problems: readonly T[]) {
  const groups = PRACTICE_GROUPS.map(group => ({
    ...group,
    problems: problems.filter(problem => problem.type === group.type),
  }))
  if (groups.reduce((total, group) => total + group.problems.length, 0) !== problems.length) {
    throw new Error('Unsupported practice problem type')
  }
  return groups.filter(group => group.problems.length > 0)
}
