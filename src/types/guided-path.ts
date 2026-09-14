import type { PracticeProblem } from '@/components/ProblemCard'
import type { FirstPassStepId } from '@/lib/typescript-first-pass'

export type GuidedQuestion = PracticeProblem & {
  stepId: FirstPassStepId
}

export type TypescriptFirstPass = {
  id: 'typescript-first-pass'
  version: 1
  lessonTitle: string
  lessonHref: string
  questions: GuidedQuestion[]
  optionalQuestion: { title: string; href: string }
}
