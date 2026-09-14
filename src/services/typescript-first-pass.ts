import { createHash } from 'node:crypto'
import type { Problem } from '@prisma/client'
import { isCompiledMdx } from '@/lib/mdx-result'
import {
  TS_BASICS_CONTENT_ID,
  TS_BASICS_HREF,
  TS_FIRST_PASS_ID,
  TS_FIRST_PASS_OPTIONAL,
  TS_FIRST_PASS_STEPS,
} from '@/lib/typescript-first-pass'
import type { GuidedQuestion, TypescriptFirstPass } from '@/types/guided-path'

type SourceProblem = Pick<Problem,
  'id' | 'contentId' | 'lessonId' | 'slug' | 'title' | 'type' | 'difficulty' |
  'href' | 'question' | 'serializedQuestion' | 'serializedAnswer'
>
type SourceLesson = {
  id: string
  contentId: string | null
  title: string
  access: string
  problems: SourceProblem[]
}

export type FirstPassResolution =
  | { status: 'ready'; path: TypescriptFirstPass }
  | { status: 'unavailable'; reason: string }

export function resolveTypescriptFirstPass(lesson: SourceLesson): FirstPassResolution {
  if (lesson.contentId !== TS_BASICS_CONTENT_ID || lesson.access !== 'PREMIUM') {
    return { status: 'unavailable', reason: 'Lesson identity or access differs from the accepted definition' }
  }
  const expected = [...TS_FIRST_PASS_STEPS, TS_FIRST_PASS_OPTIONAL]
  const resolved = new Map<string, SourceProblem>()
  for (const step of expected) {
    const matches = lesson.problems.filter(problem => problem.contentId === `${TS_BASICS_CONTENT_ID}/${step.id}`)
    if (matches.length !== 1) {
      return { status: 'unavailable', reason: `Missing or duplicate reference: ${step.id}` }
    }
    const problem = matches[0]
    if (problem.lessonId !== lesson.id || problem.slug !== step.id ||
        problem.title !== step.title || problem.type !== 'THEORY' ||
        problem.difficulty !== step.difficulty ||
        createHash('sha256').update(problem.question).digest('hex') !== step.questionSha256) {
      return { status: 'unavailable', reason: `Question contract differs: ${step.id}` }
    }
    if (!isCompiledMdx(problem.serializedAnswer) || !isCompiledMdx(problem.serializedQuestion)) {
      return { status: 'unavailable', reason: `Question feedback is unavailable: ${step.id}` }
    }
    resolved.set(step.id, problem)
  }
  const questions: GuidedQuestion[] = TS_FIRST_PASS_STEPS.map(step => {
    const problem = resolved.get(step.id)
    if (!problem) throw new Error('Resolved first-pass question was lost')
    return {
      stepId: step.id,
      id: problem.id,
      title: problem.title,
      type: problem.type,
      difficulty: problem.difficulty,
      href: problem.href,
      question: problem.question,
      serializedQuestion: problem.serializedQuestion,
      serializedAnswer: problem.serializedAnswer,
    }
  })
  return {
    status: 'ready',
    path: {
      id: TS_FIRST_PASS_ID,
      version: 1,
      lessonTitle: lesson.title,
      lessonHref: TS_BASICS_HREF,
      questions,
      optionalQuestion: {
        title: TS_FIRST_PASS_OPTIONAL.title,
        href: `${TS_BASICS_HREF}#${TS_FIRST_PASS_OPTIONAL.id}`,
      },
    },
  }
}
