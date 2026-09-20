import { g7Digest, g7ValueHash } from './g7-contracts'
import { REVIEWED_PRACTICE_BINDING } from './practice-publication-binding'

export const PRACTICE_CHANGE_CLASS = 'existing-practice-batch-v1'
export const PRACTICE_PROFILE = 'platform-practice-consistency-2026-09'
export const PRACTICE_SOURCE_BASE = '5f46718f80c5340ae0a128e0bb87418c9a6c0619'
export const PRACTICE_PROMISE_DIAGRAM = {
  lesson: 'js-track/advanced-concepts/promise-patterns',
  beforeBodySha256: '2c231d24b29ca727089859064fcc03497149ae0902c05c9aa0f66d4d644ace49',
  beforeUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises/promises.png',
  afterUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/promises.png',
  alt: 'Promise States Diagram',
} as const

export const PRACTICE_CODING_TASKS = {
  'js-track/core-fundamentals/type-coercion': ['implement-deepequal-structural-equality'],
  'js-track/core-fundamentals/this-and-binding': ['polyfill-bind-call-and-apply'],
  'js-track/core-fundamentals/asynchronous-javascript': ['implement-promiseall-from-scratch'],
  'js-track/advanced-concepts/functional-programming': ['currying-and-partial-application', 'function-composition-compose-and-pipe'],
  'js-track/advanced-concepts/higher-order-functions': ['implement-debounce'],
  'js-track/advanced-concepts/promise-patterns': ['timeout-and-retry-with-backoff-patterns', 'implement-a-promise-from-scratch-a-state-machine'],
  'js-track/advanced-concepts/async-await': ['async-iteration-for-awaitof-and-async-generators', 'implement-a-concurrency-limiter-maplimit-promise-pool'],
  'js-track/advanced-concepts/generators': ['infinite-sequences-with-generators'],
  'js-track/advanced-concepts/meta-programming': ['proxy-validator-pattern', 'apply-and-construct-traps'],
  'js-track/advanced-concepts/symbols': ['customizing-with-well-known-symbols-toprimitive-tostringtag-hasinstance'],
  'js-track/advanced-concepts/service-workers': ['offline-fallback-page-image-and-api-strategies'],
  'js-track/advanced-concepts/performance-optimization': ['debounce-vs-throttle', 'implement-memoize'],
  'js-track/advanced-concepts/browser-storage': ['implement-a-small-indexeddb-promise-wrapper'],
  'js-track/advanced-concepts/design-patterns': ['factory-pattern', 'observer-pub-sub-pattern-implement-eventemitter'],
  'js-track/advanced-concepts/reflection': ['class-introspection-and-prototype-chain-walking'],
  'js-track/typescript-introduction/utility-types': ['mapped-types-the-foundation-of-utility-types', 'custom-utility-types-building-your-own'],
  'js-track/typescript-introduction/decorators': ['method-decorators-wrapping-behavior'],
} as const

export type PracticeLessonUid = keyof typeof PRACTICE_CODING_TASKS
export const PRACTICE_LESSONS = Object.keys(PRACTICE_CODING_TASKS) as PracticeLessonUid[]
// Keep these existing fragment ambiguities until an explicit remapping is accepted.
export const PRACTICE_RETAINED_BODY_CARDS: Partial<Record<PracticeLessonUid, {
  beforeBodySha256: string
  ids: readonly string[]
}>> = {
  'js-track/advanced-concepts/functional-programming': {
    beforeBodySha256: '03b368e9386d0d891d975dd975c81e72e5c8f77cb52835ec302561a955191177',
    ids: ['pure-functions'],
  },
  'js-track/advanced-concepts/symbols': {
    beforeBodySha256: '6b5ed8c08a4625c531c551ea1176c35c3a64fdb84730b40ccad380d662c5aba1',
    ids: ['well-known-symbols'],
  },
  'js-track/advanced-concepts/service-workers': {
    beforeBodySha256: '0b9532858c8f5b00530e073fdccf63e92732b0f1494cb46d87eee15a120a4d31',
    ids: ['registering-a-service-worker'],
  },
}
const COERCION_ANSWERS = [
  'truthy-and-falsy-values', 'vs', 'the-operators-dual-nature',
  'false-and-if-output-prediction', 'nan-semantics',
]

export function isPracticeLesson(value: string): value is PracticeLessonUid {
  return Object.hasOwn(PRACTICE_CODING_TASKS, value)
}

export function practiceAssessmentIds(lesson: PracticeLessonUid): readonly string[] {
  return lesson === 'js-track/core-fundamentals/type-coercion'
    ? [...COERCION_ANSWERS, ...PRACTICE_CODING_TASKS[lesson]]
    : PRACTICE_CODING_TASKS[lesson]
}

export function isPracticeAssessment(contentId: string): boolean {
  return PRACTICE_LESSONS.some(lesson =>
    practiceAssessmentIds(lesson).some(id => contentId === `/${lesson}/${id}`))
}

export type PracticeBodyBinding = {
  rawSha256: string
  serializedSha256: string
}
export type PracticeAssessmentBinding = {
  type: 'THEORY' | 'CODING'
  questionSha256: string
  answerSha256: string
  serializedQuestionSha256: string
  serializedAnswerSha256: string
}
export type PracticePublicationBinding = {
  sourceBase: typeof PRACTICE_SOURCE_BASE
  protectedSourceSha256: string
  protectedPreparedSha256: string
  lessons: {
    uid: PracticeLessonUid
    body: { before: PracticeBodyBinding; after: PracticeBodyBinding }
    assessments: {
      id: string
      before: PracticeAssessmentBinding
      after: PracticeAssessmentBinding
    }[]
  }[]
}

export function requirePracticeBinding(): PracticePublicationBinding {
  const binding = REVIEWED_PRACTICE_BINDING
  if (!binding) throw new Error('The complete practice-consistency binding has not been reviewed')
  if (binding.sourceBase !== PRACTICE_SOURCE_BASE ||
      binding.lessons.length !== PRACTICE_LESSONS.length ||
      new Set(binding.lessons.map(lesson => lesson.uid)).size !== PRACTICE_LESSONS.length) {
    throw new Error('Invalid practice-consistency binding scope')
  }
  const checksum = (value: string) => {
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid practice-consistency binding checksum')
  }
  checksum(binding.protectedSourceSha256)
  checksum(binding.protectedPreparedSha256)
  for (const lesson of binding.lessons) {
    if (!isPracticeLesson(lesson.uid)) throw new Error('Unknown bound practice lesson')
    const expected = practiceAssessmentIds(lesson.uid)
    if (lesson.assessments.length !== expected.length ||
        new Set(lesson.assessments.map(item => item.id)).size !== expected.length ||
        lesson.assessments.some(item => !expected.includes(item.id))) {
      throw new Error('Invalid bound practice assessment inventory')
    }
    for (const body of [lesson.body.before, lesson.body.after]) {
      checksum(body.rawSha256)
      checksum(body.serializedSha256)
    }
    for (const item of lesson.assessments) {
      const codingIds: readonly string[] = PRACTICE_CODING_TASKS[lesson.uid]
      if (item.before.type !== 'THEORY' || item.after.type !== (codingIds.includes(item.id) ? 'CODING' : 'THEORY')) {
        throw new Error('Unapproved practice assessment type transition')
      }
      for (const value of [item.before, item.after]) {
        checksum(value.questionSha256)
        checksum(value.answerSha256)
        checksum(value.serializedQuestionSha256)
        checksum(value.serializedAnswerSha256)
      }
    }
  }
  return binding
}

export const practiceRawHash = g7Digest
export const practiceValueHash = g7ValueHash
