export function isNativeCodingProblem(problem: { type: string; href?: string | null }): boolean {
  return problem.type === 'CODING' && !problem.href?.trim()
}
