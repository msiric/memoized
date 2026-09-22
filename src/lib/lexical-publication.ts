import { g7Digest, g7ValueHash } from './g7-contracts'
import { REVIEWED_LEXICAL_BINDING } from './lexical-publication-binding'

export const LEXICAL_CHANGE_CLASS = 'existing-lexical-batch-v1'
export const LEXICAL_PROFILE = 'g7-scope-lookup-closures-2026-09'
export const LEXICAL_SOURCE_BASE = '7edc18d7340a1d9dc6c376181201d6a9b3bdd681'
export const LEXICAL_CONFIG_PATH = 'content/js-track/core-fundamentals/_lessons.json'
export const LEXICAL_ASSESSMENTS = {
  'js-track/core-fundamentals/scope-and-hoisting': [
    'understanding-hoisting', 'temporal-dead-zone-tdz',
    'reassignment-vs-mutation-with-let-and-const', 'hoisting-output-prediction',
  ],
  'js-track/core-fundamentals/scope-chain': [
    'scope-chain-lookup-mechanics', 'lexical-vs-dynamic-scoping', 'variable-shadowing',
    'lexical-capture-output-prediction', 'block-scope-vs-function-scope',
  ],
  'js-track/core-fundamentals/closures': [
    'javascript-closures-explained', 'closures-for-private-variables',
    'common-pitfalls-in-closures', 'the-cost-of-closures',
  ],
} as const
export type LexicalLessonUid = keyof typeof LEXICAL_ASSESSMENTS
export const LEXICAL_LESSONS = Object.keys(LEXICAL_ASSESSMENTS) as LexicalLessonUid[]
export const LEXICAL_BODIES = {
  'js-track/core-fundamentals/scope-and-hoisting': {
    kind: 'lesson', contentId: '/js-track/core-fundamentals/scope-and-hoisting',
    sourcePath: 'content/js-track/core-fundamentals/scope-and-hoisting/page.mdx',
    headings: [
      ['variable-declarations-var-let-and-const', 'Variable Declarations: var, let, and const'],
      ['variable-scope', 'Variable Scope'], ['hoisting', 'Hoisting'],
      ['temporal-dead-zone-tdz', 'Temporal Dead Zone (TDZ)'],
      ['redeclaration-and-reassignment', 'Redeclaration and Reassignment'],
      ['best-practices', 'Best Practices'], ['exercises', 'Exercises'],
    ],
  },
  'js-track/core-fundamentals/scope-chain': {
    kind: 'lesson', contentId: '/js-track/core-fundamentals/scope-chain',
    sourcePath: 'content/js-track/core-fundamentals/scope-chain/page.mdx',
    headings: [
      ['introduction-to-execution-context', 'Introduction to Execution Context'],
      ['variable-environments-and-lexical-environments', 'Variable Environments and Lexical Environments'],
      ['understanding-scope', 'Understanding Scope'], ['scope-chain-lookup', 'Scope Chain Lookup'],
      ['variable-shadowing', 'Variable Shadowing'],
      ['best-practices-for-managing-scope', 'Best Practices for Managing Scope'], ['exercises', 'Exercises'],
    ],
  },
  'js-track/core-fundamentals/closures': {
    kind: 'lesson', contentId: '/js-track/core-fundamentals/closures',
    sourcePath: 'content/js-track/core-fundamentals/closures/page.mdx',
    headings: [
      ['lexical-scoping', 'Lexical Scoping'], ['closures', 'Closures'],
      ['how-closures-work-internally', 'How Closures Work Internally'],
      ['practical-examples-and-code-analysis', 'Practical Examples and Code Analysis'],
      ['best-practices-with-closures', 'Best Practices with Closures'], ['exercises', 'Exercises'],
      ['tips-and-best-practices', 'Tips and Best Practices'], ['additional-resources', 'Additional Resources'],
    ],
  },
  'resources/lexical-scope': {
    kind: 'resource', contentId: '/lexical-scope', sourcePath: 'resources/lexical-scope/page.mdx',
    headings: [['core-concepts', 'Core Concepts'], ['implementation-and-best-practices', 'Implementation and Best Practices']],
  },
  'resources/closure-fundamentals': {
    kind: 'resource', contentId: '/closure-fundamentals', sourcePath: 'resources/closure-fundamentals/page.mdx',
    headings: [['core-concepts', 'Core Concepts'], ['implementation-patterns-and-best-practices', 'Implementation Patterns and Best Practices']],
  },
} as const
export type LexicalBodyUid = keyof typeof LEXICAL_BODIES
export const LEXICAL_BODY_UIDS = Object.keys(LEXICAL_BODIES) as LexicalBodyUid[]
export const LEXICAL_REMAPS: Partial<Record<LexicalBodyUid, {
  beforeSha256: string; oldId: string; newId: string; title: string
}>> = {
  'js-track/core-fundamentals/scope-and-hoisting': {
    beforeSha256: 'd36b0071776cf35e92622b1d559a7df79a20778c915325c4c11c634e588e9f91',
    oldId: 'temporal-dead-zone-tdz', newId: 'binding-initialization-and-the-tdz',
    title: 'Binding Initialization and the TDZ',
  },
  'js-track/core-fundamentals/scope-chain': {
    beforeSha256: '5b459488db8dcd9b8b138b1d896fcde163cd3fdc662b5ddeb1aeb56ef6937f31',
    oldId: 'variable-shadowing', newId: 'shadowing-and-first-binding-lookup',
    title: 'Shadowing and First-Binding Lookup',
  },
}
export const LEXICAL_REGRADED_IDS = [
  '/js-track/core-fundamentals/scope-and-hoisting/reassignment-vs-mutation-with-let-and-const',
  '/js-track/core-fundamentals/scope-chain/lexical-capture-output-prediction',
  '/js-track/core-fundamentals/closures/javascript-closures-explained',
] as const
export const LEXICAL_QUESTION_ID = '/js-track/core-fundamentals/scope-chain/lexical-vs-dynamic-scoping'
export const LEXICAL_QUESTION = 'When a JavaScript function reads an outer variable, does it use the scope where it was defined or the local scope of its caller? Explain why this matters.'
const EASY_BEFORE = [
  '/js-track/core-fundamentals/scope-and-hoisting/temporal-dead-zone-tdz',
  '/js-track/core-fundamentals/scope-chain/variable-shadowing',
]
export const lexicalRawHash = g7Digest
export const lexicalValueHash = g7ValueHash
export function isLexicalLesson(value: string): value is LexicalLessonUid {
  return Object.hasOwn(LEXICAL_ASSESSMENTS, value)
}
export function isLexicalBody(value: string): value is LexicalBodyUid {
  return Object.hasOwn(LEXICAL_BODIES, value)
}
export function isLexicalAssessment(value: string): boolean {
  return LEXICAL_LESSONS.some(uid => LEXICAL_ASSESSMENTS[uid].some(id => value === `/${uid}/${id}`))
}
export function isLexicalRegrade(value: string): boolean {
  return LEXICAL_REGRADED_IDS.some(id => id === value)
}
export function lexicalDifficulty(contentId: string, after: boolean): 'EASY' | 'MEDIUM' {
  if (!isLexicalAssessment(contentId)) throw new Error('Unknown lexical assessment')
  return EASY_BEFORE.includes(contentId) || after && isLexicalRegrade(contentId) ? 'EASY' : 'MEDIUM'
}
export type LexicalBodyBinding = { rawSha256: string; serializedSha256: string }
export type LexicalAssessmentBinding = {
  difficulty: 'EASY' | 'MEDIUM'
  questionSha256: string
  answerSha256: string
  serializedQuestionSha256: string
  serializedAnswerSha256: string
}
export type LexicalPublicationBinding = {
  sourceBase: typeof LEXICAL_SOURCE_BASE
  protectedSourceSha256: string
  protectedPreparedSha256: string
  bodies: { uid: LexicalBodyUid; before: LexicalBodyBinding; after: LexicalBodyBinding; recovery?: LexicalBodyBinding }[]
  assessments: { contentId: string; before: LexicalAssessmentBinding; after: LexicalAssessmentBinding }[]
}
export function lexicalBodyVersions(body: LexicalPublicationBinding['bodies'][number]): LexicalBodyBinding[] {
  return body.recovery ? [body.before, body.after, body.recovery] : [body.before, body.after]
}
export function requireLexicalBinding(): LexicalPublicationBinding {
  const binding = REVIEWED_LEXICAL_BINDING
  if (!binding) throw new Error('The complete G7-02 lexical binding has not been reviewed')
  const checksum = (value: string) => {
    if (!/^[a-f0-9]{64}$/.test(value) || /^0+$/.test(value)) throw new Error('Invalid lexical binding checksum')
  }
  if (binding.sourceBase !== LEXICAL_SOURCE_BASE ||
      binding.bodies.length !== LEXICAL_BODY_UIDS.length ||
      new Set(binding.bodies.map(body => body.uid)).size !== LEXICAL_BODY_UIDS.length ||
      binding.assessments.length !== 13 || new Set(binding.assessments.map(item => item.contentId)).size !== 13) {
    throw new Error('Invalid closed lexical binding inventory')
  }
  checksum(binding.protectedSourceSha256)
  checksum(binding.protectedPreparedSha256)
  for (const body of binding.bodies) {
    if (!isLexicalBody(body.uid) || Boolean(body.recovery) !== Boolean(LEXICAL_REMAPS[body.uid])) {
      throw new Error('Unknown lexical body or missing compatible recovery')
    }
    for (const version of lexicalBodyVersions(body)) {
      checksum(version.rawSha256)
      checksum(version.serializedSha256)
    }
  }
  for (const item of binding.assessments) {
    if (!isLexicalAssessment(item.contentId) ||
        item.before.difficulty !== lexicalDifficulty(item.contentId, false) ||
        item.after.difficulty !== lexicalDifficulty(item.contentId, true)) {
      throw new Error('Unapproved lexical assessment or difficulty transition')
    }
    for (const version of [item.before, item.after]) {
      checksum(version.questionSha256)
      checksum(version.answerSha256)
      checksum(version.serializedQuestionSha256)
      checksum(version.serializedAnswerSha256)
    }
    if (item.contentId === LEXICAL_QUESTION_ID) {
      if (item.after.questionSha256 !== lexicalRawHash(LEXICAL_QUESTION)) throw new Error('Unapproved lexical question clarification')
    } else if (item.before.questionSha256 !== item.after.questionSha256 ||
        item.before.serializedQuestionSha256 !== item.after.serializedQuestionSha256) {
      throw new Error('An unchanged lexical question or its compilation differs')
    }
  }
  return binding
}
