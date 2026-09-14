import type { getLessonBySlug } from '@/services/lesson'
import { TS_BASICS_CONTENT_ID, TS_FIRST_PASS_OPTIONAL, TS_FIRST_PASS_STEPS } from '@/lib/typescript-first-pass'

const questions = [
  'What is TypeScript, and what does it add to JavaScript? Show equivalent code in each.',
  "What does TypeScript give you that JavaScript doesn't? When is it NOT worth the cost?",
  'What does it mean that TypeScript "erases" types? Show what compiled output looks like and the practical consequences.',
  'What does it mean that TypeScript uses a *structural* type system? Contrast with nominal typing (Java, C#) and show the practical consequences.',
  'Is TypeScript a sound type system? What does that mean, and where does TS deliberately accept unsoundness for ergonomic reasons?',
]

export function createFirstPassLessonFixture(): NonNullable<Awaited<ReturnType<typeof getLessonBySlug>>> {
  const lessonId = 'fixture-ts-basics'
  return {
    id: lessonId,
    contentId: TS_BASICS_CONTENT_ID,
    title: 'TS Basics',
    description: 'Learn TypeScript fundamentals and setup.',
    access: 'PREMIUM',
    serializedBody: { compiledSource: 'PRIVATE_LESSON_BODY_MUST_NOT_BE_PROJECTED' },
    section: { slug: 'typescript-introduction', course: { slug: 'js-track' } },
    problems: [...TS_FIRST_PASS_STEPS, TS_FIRST_PASS_OPTIONAL].map((step, index) => ({
      id: `fixture-problem-${index + 1}`,
      contentId: `${TS_BASICS_CONTENT_ID}/${step.id}`,
      lessonId,
      slug: step.id,
      title: step.title,
      difficulty: step.difficulty,
      type: 'THEORY',
      href: '',
      link: `/courses${TS_BASICS_CONTENT_ID}#${step.id}`,
      question: questions[index],
      serializedQuestion: { compiledSource: `question-${index}` },
      serializedAnswer: { compiledSource: `answer-${index}` },
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
  }
}
