export const G3C_LESSON_UID = 'js-track/frontend-development/frontend-interviews'
export const G3C_LESSON_CONTENT_ID = `/${G3C_LESSON_UID}`
export const G3C_LESSON_HREF = `/courses/${G3C_LESSON_UID}`
export const G3C_TASK = {
  id: 'build-a-local-autocomplete',
  slug: 'build-a-local-autocomplete',
  contentId: `${G3C_LESSON_CONTENT_ID}/build-a-local-autocomplete`,
  title: 'Build a Local Autocomplete',
  type: 'CODING',
  difficulty: 'HARD',
  href: '',
  link: `${G3C_LESSON_HREF}#build-a-local-autocomplete`,
} as const

export const G3C_OLD_TASK_IDS = [
  'the-five-frontend-interview-formats',
  'frontend-system-design-the-6-step-framework',
  'javascript-implementation-challenges-catalog',
  'live-coding-a-react-component-what-interviewers-watch-for',
  'frontend-behavioral-questions-the-three-story-types',
] as const

const expectedIds = new Set<string>([
  ...G3C_OLD_TASK_IDS.map(id => `${G3C_LESSON_CONTENT_ID}/${id}`),
  G3C_TASK.contentId,
])

export function hasG3cPractice(lessonContentId: string | null, problems: { contentId: string | null }[]) {
  return lessonContentId === G3C_LESSON_CONTENT_ID && problems.length === expectedIds.size &&
    new Set(problems.map(problem => problem.contentId)).size === expectedIds.size &&
    problems.every(problem => problem.contentId !== null && expectedIds.has(problem.contentId))
}

export function orderG3cPractice<T extends { contentId: string | null }>(
  lessonContentId: string | null,
  problems: T[],
): T[] {
  if (!hasG3cPractice(lessonContentId, problems)) return problems
  return [
    ...problems.filter(problem => problem.contentId !== G3C_TASK.contentId),
    ...problems.filter(problem => problem.contentId === G3C_TASK.contentId),
  ]
}

export const G3C_HEADINGS = {
  'introduction-to-coding-interviews': 'Frontend interview formats',
  'understanding-algorithmic-problems': 'Clarify the requested behavior',
  'problem-solving-strategies': 'Turn requirements into state and checks',
  'common-algorithmic-concepts': 'Choose the preparation you need',
  'big-o-notation-and-time-complexity': "Reason about the local list's work",
  'whiteboard-coding-tips': 'Communicate and debug during the attempt',
  'practicing-coding-problems': 'Prepare the local UI rehearsal',
  'best-practices-for-coding-interviews': 'Evaluate behavior and explain choices',
  exercises: 'Practice checkpoints',
} as const

export const G3C_BODY_TITLE = 'Frontend Interview Preparation'
export const G3C_BODY_DESCRIPTION = 'Prepare for frontend interviews by clarifying the requested work, practicing a local React autocomplete, and explaining design and communication choices.'
