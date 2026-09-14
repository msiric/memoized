export const TS_FIRST_PASS_ID = 'typescript-first-pass'
export const TS_BASICS_CONTENT_ID = '/js-track/typescript-introduction/ts-basics'
export const TS_BASICS_HREF = `/courses${TS_BASICS_CONTENT_ID}`

export const TS_FIRST_PASS_STEPS = [
  {
    id: 'typescript-vs-javascript',
    title: 'TypeScript vs JavaScript',
    difficulty: 'EASY',
    questionSha256: '238de1d8ef6d51b6ae83f5a4f922d4c7ea2ac8cbc2ae8eb0accf101bc3da52b4',
  },
  {
    id: 'why-typescript-the-value-proposition',
    title: 'Why TypeScript: The Value Proposition',
    difficulty: 'EASY',
    questionSha256: 'e160630727b94c450c99066e5995fbb2a73461d079afd11958abde8938fa67ec',
  },
  {
    id: 'type-erasure-ts-types-disappear-at-runtime',
    title: 'Type Erasure: TS Types Disappear at Runtime',
    difficulty: 'EASY',
    questionSha256: 'c3e615b423c1824de20d57ced6236feb83dacb707823264d2efbd5a98c291313',
  },
  {
    id: 'structural-type-system-types-compare-by-shape',
    title: 'Structural Type System: Types Compare by Shape',
    difficulty: 'MEDIUM',
    questionSha256: 'b30245f8d03ff3cf71c03784cc932ee52e8f0af569773d1de1a09bade5e3bb45',
  },
] as const

export const TS_FIRST_PASS_OPTIONAL = {
  id: 'typescripts-intentional-unsoundness',
  title: "TypeScript's Intentional Unsoundness",
  difficulty: 'HARD',
  questionSha256: '26b7b885db4388e160c835c8c199e7ef4b7f6087e9e6542879d78457670a42c1',
} as const

export type FirstPassStepId = (typeof TS_FIRST_PASS_STEPS)[number]['id']
export type PathQueryValue = string | string[] | undefined

export function isFirstPassStep(value: unknown): value is FirstPassStepId {
  return typeof value === 'string' && TS_FIRST_PASS_STEPS.some(step => step.id === value)
}

export function firstPassHref(step?: FirstPassStepId) {
  const query = new URLSearchParams({ path: TS_FIRST_PASS_ID })
  if (step) query.set('step', step)
  return `${TS_BASICS_HREF}?${query}${step ? `#${step}` : ''}`
}

export function isTsBasicsRoute(params: {
  courseSlug: string
  sectionSlug: string
  lessonSlug?: string
}) {
  return params.courseSlug === 'js-track' &&
    params.sectionSlug === 'typescript-introduction' &&
    (params.lessonSlug === undefined || params.lessonSlug === 'ts-basics')
}

export function resolveFirstPassSelection(
  step: PathQueryValue,
  fragment: string,
  defaultStep: FirstPassStepId,
): { step: FirstPassStepId; notice: string | null } {
  const hash = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (step !== undefined) {
    if (!isFirstPassStep(step)) {
      return { step: defaultStep, notice: 'That step is not in this first pass. We opened an available core question.' }
    }
    return {
      step,
      notice: hash && hash !== step
        ? 'The question link and step did not match. We opened the selected step.'
        : null,
    }
  }
  if (isFirstPassStep(hash)) return { step: hash, notice: null }
  return {
    step: defaultStep,
    notice: hash ? 'That section is not a core question. The full lesson is still available.' : null,
  }
}

export function firstUnmarkedStep(
  questions: ReadonlyArray<{ id: string; stepId: FirstPassStepId }>,
  completed: ReadonlySet<string>,
) {
  return questions.find(question => !completed.has(question.id))?.stepId ?? null
}
