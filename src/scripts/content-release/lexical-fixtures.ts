import { createHash } from 'node:crypto'
import type { LexicalPublicationBinding } from '@/lib/lexical-publication'
import { practiceSnapshot, sourcePayload, inventory, editSource, compileFixture, databaseFixture, type Snapshot } from './practice-fixtures'
import type { InventoryRow } from './catalog'

export const LESSONS = {
  'js-track/core-fundamentals/scope-and-hoisting': {
    title: 'Scope & Hoisting',
    ids: ['variable-options-var-vs-let-vs-const', 'understanding-hoisting', 'temporal-dead-zone-tdz', 'reassignment-vs-mutation-with-let-and-const', 'hoisting-output-prediction'],
    headings: ['Variable Declarations: var, let, and const', 'Variable Scope', 'Hoisting', 'Temporal Dead Zone (TDZ)', 'Redeclaration and Reassignment', 'Best Practices', 'Exercises'],
  },
  'js-track/core-fundamentals/scope-chain': {
    title: 'Scope Chain',
    ids: ['scope-chain-lookup-mechanics', 'lexical-vs-dynamic-scoping', 'variable-shadowing', 'lexical-capture-output-prediction', 'block-scope-vs-function-scope'],
    headings: ['Introduction to Execution Context', 'Variable Environments and Lexical Environments', 'Understanding Scope', 'Scope Chain Lookup', 'Variable Shadowing', 'Best Practices for Managing Scope', 'Exercises'],
  },
  'js-track/core-fundamentals/closures': {
    title: 'Closures',
    ids: ['javascript-closures-explained', 'closure-capture-reference-vs-value', 'closures-for-private-variables', 'common-pitfalls-in-closures', 'the-cost-of-closures'],
    headings: ['Lexical Scoping', 'Closures', 'How Closures Work Internally', 'Practical Examples and Code Analysis', 'Best Practices with Closures', 'Exercises', 'Tips and Best Practices', 'Additional Resources'],
  },
} as const
export const LESSON_IDS = Object.keys(LESSONS) as (keyof typeof LESSONS)[]
export const RESOURCES = ['lexical-scope', 'closure-fundamentals'] as const
export const BODY_IDS = [...LESSON_IDS, 'resources/lexical-scope', 'resources/closure-fundamentals'] as const
export const RETAINED = [
  '/js-track/core-fundamentals/scope-and-hoisting/variable-options-var-vs-let-vs-const',
  '/js-track/core-fundamentals/closures/closure-capture-reference-vs-value',
]
export const MUTABLE = LESSON_IDS.flatMap(uid => LESSONS[uid].ids.map(id => `/${uid}/${id}`)).filter(id => !RETAINED.includes(id))
export const REGRADED = [
  '/js-track/core-fundamentals/scope-and-hoisting/reassignment-vs-mutation-with-let-and-const',
  '/js-track/core-fundamentals/scope-chain/lexical-capture-output-prediction',
  '/js-track/core-fundamentals/closures/javascript-closures-explained',
]
export const QUESTION_ID = '/js-track/core-fundamentals/scope-chain/lexical-vs-dynamic-scoping'
export const APPROVED_QUESTION = 'When a JavaScript function reads an outer variable, does it use the scope where it was defined or the local scope of its caller? Explain why this matters.'
export const ALL_UNITS = [...BODY_IDS.map(id => `body:${id}`), ...MUTABLE.map(id => `assessment:${id}`)]
export type Version = 'before' | 'after' | 'recovery'
export type State = Version | ReadonlySet<string>
export const EXPECTED_HEADING_IDS = {
  'js-track/core-fundamentals/scope-and-hoisting': [
    'variable-declarations-var-let-and-const', 'variable-scope', 'hoisting', 'temporal-dead-zone-tdz',
    'redeclaration-and-reassignment', 'best-practices', 'exercises',
  ],
  'js-track/core-fundamentals/scope-chain': [
    'introduction-to-execution-context', 'variable-environments-and-lexical-environments',
    'understanding-scope', 'scope-chain-lookup', 'variable-shadowing', 'best-practices-for-managing-scope', 'exercises',
  ],
  'js-track/core-fundamentals/closures': [
    'lexical-scoping', 'closures', 'how-closures-work-internally', 'practical-examples-and-code-analysis',
    'best-practices-with-closures', 'exercises', 'tips-and-best-practices', 'additional-resources',
  ],
  'resources/lexical-scope': ['core-concepts', 'implementation-and-best-practices'],
  'resources/closure-fundamentals': ['core-concepts', 'implementation-patterns-and-best-practices'],
} as const
export const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export const valueHash = (value: unknown): string => hash(JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0))
    : item))

export function syntheticBody(uid: string, version: Version): string {
  const lesson = Object.entries(LESSONS).find(([key]) => key === uid)?.[1]
  const title = lesson?.title ?? (uid.endsWith('/lexical-scope') ? 'Lexical Scope' : 'Closure Fundamentals')
  const headings: readonly string[] = lesson?.headings ?? [
    'Core Concepts', uid.endsWith('/lexical-scope') ? 'Implementation and Best Practices' : 'Implementation Patterns and Best Practices',
  ]
  const changed = version === 'after'
  return `export const metadata = ${JSON.stringify({ title, description: 'Frozen synthetic metadata' })}\n\n# ${title}\n\n` +
    headings.map(title => {
      const mapped = version === 'before' ? title : title === 'Temporal Dead Zone (TDZ)' ? 'Binding Initialization and the TDZ'
        : title === 'Variable Shadowing' ? 'Shadowing and First-Binding Lookup' : title
      return `## ${mapped}\n\n${changed ? 'Reviewed' : 'Frozen'} synthetic explanation.\n`
    }).join('\n')
}

export function lexicalSnapshot(version: State = 'before'): Snapshot {
  if (typeof version !== 'string' && [...version].some(unit => !ALL_UNITS.includes(unit))) {
    throw new Error('Unknown synthetic lexical unit')
  }
  const selected = (unit: string) => version === 'after' || typeof version !== 'string' && version.has(unit)
  const snapshot = practiceSnapshot('after')
  const replacement = snapshot.content.lessons.filter(row =>
    row.sectionContentId === '/js-track/core-fundamentals' && row.contentId.includes('/frozen-')).slice(0, 4)
  const fallback = replacement[3]
  if (replacement.length !== 4 || !fallback) throw new Error('Missing synthetic replacement lessons')
  const dropped = new Set(snapshot.content.problems.filter(row => row.slug.startsWith('frozen-problem-')).slice(0, 15).map(row => row.contentId))
  snapshot.content.problems = snapshot.content.problems.filter(row => !dropped.has(row.contentId))
  for (const [index, uid] of LESSON_IDS.entries()) {
    const replaced = replacement[index]
    for (const problem of snapshot.content.problems.filter(problem => problem.lessonContentId === replaced.contentId)) {
      problem.lessonContentId = fallback.contentId
      problem.contentId = `${fallback.contentId}/${problem.slug}`
      problem.link = `${fallback.href}#${problem.slug}`
    }
    const contract = LESSONS[uid]
    const body = syntheticBody(uid, selected(`body:${uid}`) ? 'after' : version === 'recovery' ? 'recovery' : 'before')
    Object.assign(replaced, { contentId: `/${uid}`, slug: uid.split('/').at(-1)!, title: contract.title,
      href: `/courses/${uid}`, access: 'FREE', body, serializedBody: compileFixture(body) })
    for (const id of contract.ids) {
      const contentId = `/${uid}/${id}`
      const after = selected(`assessment:${contentId}`) && MUTABLE.includes(contentId)
      const question = after && contentId === QUESTION_ID ? APPROVED_QUESTION : `Frozen synthetic question ${id}.`
      const answer = `${after ? 'Reviewed' : 'Frozen'} synthetic answer ${id}.\n\n### Reasoning\n\nA bounded explanation.\n`
      snapshot.content.problems.push({
        contentId, slug: id, title: id === 'temporal-dead-zone-tdz' ? 'Temporal Dead Zone (TDZ)' : id.replaceAll('-', ' '),
        difficulty: id === 'temporal-dead-zone-tdz' || id === 'variable-shadowing' || after && REGRADED.includes(contentId) ? 'EASY' : 'MEDIUM',
        type: 'THEORY', href: '', link: `/courses/${uid}#${id}`, lessonContentId: `/${uid}`,
        question, answer, serializedQuestion: compileFixture(question), serializedAnswer: compileFixture(answer),
      })
    }
  }
  for (const [index, id] of RESOURCES.entries()) {
    const body = syntheticBody(`resources/${id}`, selected(`body:resources/${id}`) ? 'after' : 'before')
    Object.assign(snapshot.resources[index + 1], {
      contentId: `/${id}`, slug: id, title: id === 'lexical-scope' ? 'Lexical Scope' : 'Closure Fundamentals',
      href: `/resources/${id}`, body, serializedBody: compileFixture(body), lessonSlug: 'closures',
    })
  }
  return snapshot
}
export function lexicalSource(snapshot: Snapshot): Map<string, Buffer> {
  const files = sourcePayload(snapshot)
  editSource(files, 'js-track/core-fundamentals/closures', lesson => {
    lesson.resources = RESOURCES.map((id, index) => ({
      id: `/${id}`, title: id === 'lexical-scope' ? 'Lexical Scope' : 'Closure Fundamentals',
      href: `/resources/${id}`, description: 'Frozen resource description', order: index + 1,
    }))
  })
  return files
}
export const bodyPath = (uid: string) => `${uid.startsWith('resources/') ? '' : 'content/'}${uid}/page.mdx`
export function expectedSourceHash(files: Map<string, Buffer>) {
  return valueHash([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, bytes]) => {
    if (BODY_IDS.some(id => bodyPath(id) === file)) return { path: file, sha256: hash('[bound lexical body]') }
    if (file !== 'content/js-track/core-fundamentals/_lessons.json') return { path: file, sha256: hash(bytes) }
    const config = JSON.parse(bytes.toString('utf8'))
    for (const lesson of config.lessons) for (const problem of lesson.problems) {
      const id = `/js-track/core-fundamentals${lesson.id}/${problem.id}`
      if (MUTABLE.includes(id)) problem.answer = null
      if (id === QUESTION_ID) problem.question = null
      if (REGRADED.includes(id)) problem.difficulty = null
    }
    return { path: file, sha256: valueHash(config) }
  }))
}
export function expectedPreparedHash(rows: InventoryRow[]) {
  const copy: (Omit<InventoryRow, 'text'> & {
    text: Partial<Record<'body' | 'question' | 'answer', string | null>>
  })[] = structuredClone(rows)
  for (const row of copy) {
    if (BODY_IDS.some(uid => row.kind === (uid.startsWith('resources/') ? 'resource' : 'lesson') &&
        row.contentId === `/${uid.replace(/^resources\//, '')}`)) {
      row.text.body = null
      row.serialized.body = null
    }
    if (row.kind !== 'problem') continue
    if (MUTABLE.includes(row.contentId)) { row.text.answer = null; row.serialized.answer = null }
    if (row.contentId === QUESTION_ID) { row.text.question = null; row.serialized.question = null }
    if (REGRADED.includes(row.contentId)) row.metadata.difficulty = null
  }
  copy.sort((a, b) => `${a.kind}:${a.contentId}` < `${b.kind}:${b.contentId}` ? -1 : `${a.kind}:${a.contentId}` > `${b.kind}:${b.contentId}` ? 1 : 0)
  return valueHash(copy)
}
export function lexicalBinding(): LexicalPublicationBinding {
  const before = lexicalSnapshot(), after = lexicalSnapshot('after'), recovery = lexicalSnapshot('recovery')
  const bodyVersion = (snapshot: Snapshot, uid: string) => {
    const row = uid.startsWith('resources/')
      ? snapshot.resources.find(row => row.contentId === `/${uid.slice(10)}`)!
      : snapshot.content.lessons.find(row => row.contentId === `/${uid}`)!
    return { rawSha256: hash(row.body), serializedSha256: valueHash(row.serializedBody) }
  }
  const assessment = (snapshot: Snapshot, contentId: string) => {
    const row = snapshot.content.problems.find(row => row.contentId === contentId)!
    if (row.difficulty !== 'EASY' && row.difficulty !== 'MEDIUM') throw new Error('Invalid synthetic difficulty')
    return { difficulty: row.difficulty,
      questionSha256: hash(row.question), answerSha256: hash(row.answer),
      serializedQuestionSha256: valueHash(row.serializedQuestion), serializedAnswerSha256: valueHash(row.serializedAnswer) }
  }
  return {
    sourceBase: '7edc18d7340a1d9dc6c376181201d6a9b3bdd681',
    protectedSourceSha256: expectedSourceHash(lexicalSource(before)),
    protectedPreparedSha256: expectedPreparedHash(inventory(before)),
    bodies: BODY_IDS.map(uid => ({
      uid, before: bodyVersion(before, uid), after: bodyVersion(after, uid),
      ...(uid === LESSON_IDS[0] || uid === LESSON_IDS[1] ? { recovery: bodyVersion(recovery, uid) } : {}),
    })),
    assessments: MUTABLE.map(contentId => ({ contentId, before: assessment(before, contentId), after: assessment(after, contentId) })),
  }
}
export function syntheticRemaps() {
  return {
    [LESSON_IDS[0]]: { beforeSha256: hash(syntheticBody(LESSON_IDS[0], 'before')), oldId: 'temporal-dead-zone-tdz', newId: 'binding-initialization-and-the-tdz', title: 'Binding Initialization and the TDZ' },
    [LESSON_IDS[1]]: { beforeSha256: hash(syntheticBody(LESSON_IDS[1], 'before')), oldId: 'variable-shadowing', newId: 'shadowing-and-first-binding-lookup', title: 'Shadowing and First-Binding Lookup' },
  }
}

export function lexicalDatabaseFixture(snapshot: Snapshot) {
  const database = databaseFixture(snapshot)
  for (const resource of database[4]) {
    const owner = database[2].find(lesson => lesson.slug === resource.lesson.slug &&
      lesson.section.contentId === `/${resource.lesson.section.course.slug}/${resource.lesson.section.slug}`)
    if (!owner) throw new Error(`Missing synthetic resource owner: ${resource.contentId}`)
    resource.lessonId = owner.id
  }
  return database
}

export function lexicalScopeFixture() {
  return {
    changedFiles: [],
    assessment: {
      bindingSha256: valueHash(lexicalBinding()),
      sourceLessonBeforeSha256: hash('synthetic lexical before'),
      sourceLessonAfterSha256: hash('synthetic lexical after'),
    },
    structural: {
      changeClass: 'existing-lexical-batch-v1',
      profile: 'g7-scope-lookup-closures-2026-09',
      lesson: '',
      allowedChangedFields: [
        ...BODY_IDS.map(uid => ({
          kind: uid.startsWith('resources/') ? 'resource' : 'lesson',
          contentId: `/${uid.replace(/^resources\//, '')}`, field: 'body',
        })),
        ...MUTABLE.map(contentId => ({
          kind: 'problem', contentId, field: REGRADED.includes(contentId) ? 'calibrated-assessment' : 'assessment',
        })),
      ],
    },
  }
}
