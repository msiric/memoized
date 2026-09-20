import { createHash } from 'node:crypto'
import path from 'node:path'
import type fs from 'node:fs'
import { G7_CONTRACTS, G7_DATA_TYPES, G7_TYPE_COERCION } from '@/lib/g7-contracts'
import { G3B_CARD_ORDER, G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_LESSON_UID, G3C_TASK } from '@/lib/g3c-task'
import { G3C_LESSON_METADATA, G3C_OLD_CONTRACTS, G3C_TASK_METADATA } from '@/lib/g3c-publication'
import type { PracticePublicationBinding } from '@/lib/practice-publication'
import type { InventoryRow } from './catalog'
import type { PreparedContent } from '../sync-content'
import type { PreparedResource } from '../sync-resources'
import { syntheticG7Body, syntheticG7Lesson } from './g7-fixtures'
import { syntheticOldQuestion, syntheticQuestion } from './g3c-fixtures'

// Deliberately independent of the capability's exported target enumeration.
export const EXPECTED_TASKS = {
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
export const EXPECTED_LESSONS = Object.keys(EXPECTED_TASKS) as (keyof typeof EXPECTED_TASKS)[]
export const TC = 'js-track/core-fundamentals/type-coercion'
export const TC_ANSWERS = [
  'truthy-and-falsy-values', 'vs', 'the-operators-dual-nature',
  'false-and-if-output-prediction', 'nan-semantics',
]
export const expectedIds = (uid: keyof typeof EXPECTED_TASKS): readonly string[] =>
  uid === TC ? [...TC_ANSWERS, ...EXPECTED_TASKS[uid]] : EXPECTED_TASKS[uid]
export const ASSESSMENTS = EXPECTED_LESSONS.flatMap(uid => expectedIds(uid).map(id => `/${uid}/${id}`))
export const ALL_UNITS = [
  ...EXPECTED_LESSONS.map(uid => `body:${uid}`),
  ...ASSESSMENTS.map(id => `assessment:${id}`),
]
export const rawHash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
export function valueHash(value: unknown): string {
  const canonical = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(canonical)
    if (item !== null && typeof item === 'object') {
      return Object.fromEntries(Object.keys(item).sort().map(key => [
        key, canonical((item as Record<string, unknown>)[key]),
      ]))
    }
    return item
  }
  return rawHash(JSON.stringify(canonical(value)))
}
export const compileFixture = (text: string) => ({
  compiledSource: `Explicit synthetic practice compilation: ${text}`,
  frontmatter: {}, scope: {},
})
export type Snapshot = { content: PreparedContent; resources: PreparedResource[] }
export type State = 'before' | 'after' | ReadonlySet<string>
const selected = (state: State, unit: string) =>
  state === 'after' ? ALL_UNITS.includes(unit) : state !== 'before' && state.has(unit)

export function practiceSnapshot(state: State = 'before'): Snapshot {
  const sectionsUids = [
    'js-track/core-fundamentals', 'js-track/advanced-concepts',
    'js-track/typescript-introduction', 'js-track/frontend-development',
    'js-track/synthetic-one', 'js-track/synthetic-two',
    'dsa-track/common-techniques', 'dsa-track/synthetic-structures',
  ]
  const courses = ['js-track', 'dsa-track'].map((slug, order) => ({
    contentId: `/${slug}`, slug, title: `Synthetic ${slug}`, description: 'Frozen synthetic course',
    href: `/courses/${slug}`, order, body: '# Synthetic course\n', serializedBody: compileFixture('# Synthetic course\n'),
  }))
  const sections = sectionsUids.map((uid, order) => ({
    contentId: `/${uid}`, slug: uid.split('/')[1], courseSlug: uid.split('/')[0],
    title: `Synthetic section ${order}`, description: 'Frozen synthetic section',
    href: `/courses/${uid}`, order, body: '# Synthetic section\n', serializedBody: compileFixture('# Synthetic section\n'),
  }))
  const lessonUids: string[] = [...EXPECTED_LESSONS, G7_DATA_TYPES, G3B_LESSON_UID, G3C_LESSON_UID]
  while (lessonUids.length < 120) lessonUids.push(`${sectionsUids[lessonUids.length % 8]}/frozen-${lessonUids.length}`)
  const lessons = lessonUids.map((uid, order) => {
    const bodyAfter = selected(state, `body:${uid}`)
    const title = uid === TC || uid === G7_DATA_TYPES
      ? G7_CONTRACTS[uid].metadata.title : `Synthetic lesson ${order}`
    const body = uid === TC ? syntheticG7Body(G7_CONTRACTS[TC], bodyAfter)
      : uid === G7_DATA_TYPES ? syntheticG7Body(G7_CONTRACTS[G7_DATA_TYPES], true)
        : `export const metadata = ${JSON.stringify({ title, description: 'Frozen synthetic metadata' })}\n\n# ${title}\n\n## Foundation\n\n${bodyAfter ? 'Reviewed' : 'Frozen'} synthetic explanation.\n`
    return {
      contentId: `/${uid}`, slug: uid.split('/').at(-1)!, title, description: 'Frozen synthetic description',
      href: `/courses/${uid}`, order, access: 'PREMIUM' as const,
      sectionContentId: `/${uid.split('/').slice(0, 2).join('/')}`, body, serializedBody: compileFixture(body),
    }
  })
  const problems: PreparedContent['problems'] = []
  function add(uid: string, item: {
    id: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    type: 'THEORY' | 'CODING'; question: string; answer: string; href: string;
  }) {
    problems.push({
      contentId: `/${uid}/${item.id}`, slug: item.id, title: item.title,
      difficulty: item.difficulty, type: item.type, href: item.href,
      link: `/courses/${uid}#${item.id}`, lessonContentId: `/${uid}`,
      question: item.question, answer: item.answer,
      serializedQuestion: compileFixture(item.question), serializedAnswer: compileFixture(item.answer),
    })
  }
  for (const uid of EXPECTED_LESSONS) {
    for (const id of expectedIds(uid)) {
      const after = selected(state, `assessment:/${uid}/${id}`)
      if (uid === TC) {
        const item = syntheticG7Lesson(G7_CONTRACTS[TC], after).problems.find(item => item.id === id)!
        add(uid, { ...item, difficulty: item.difficulty as 'EASY' | 'MEDIUM' | 'HARD' })
      } else {
        add(uid, {
          id, title: `Synthetic ${id}`, difficulty: 'HARD', type: after ? 'CODING' : 'THEORY', href: '',
          question: `${after ? 'Reviewed' : 'Frozen'} synthetic question ${id}.\n\n### Attempt\n\nExplain your attempt.\n`,
          answer: `${after ? 'Reviewed' : 'Frozen'} synthetic answer ${id}.\n\n### Explanation\n\nA complete synthetic explanation.\n`,
        })
      }
    }
  }
  for (const item of syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], true).problems) {
    add(G7_DATA_TYPES, { ...item, difficulty: item.difficulty as 'EASY' | 'MEDIUM' | 'HARD' })
  }
  G3B_CARD_ORDER.slice(0, 3).forEach((id, index) => add(G3B_LESSON_UID, {
    id: id.split('/').at(-1)!, title: `Frozen retained comparison ${index}`, difficulty: 'MEDIUM',
    type: 'CODING', href: '', question: `Frozen G3B comparison ${index}.`, answer: `Frozen G3B comparison answer ${index}.`,
  }))
  add(G3B_LESSON_UID, { ...G3B_TASK, answer: 'Complete synthetic retained G3B answer.' })
  G3C_OLD_CONTRACTS.forEach((item, index) => add(G3C_LESSON_UID, {
    id: item.id, title: item.title, difficulty: item.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    type: 'THEORY', href: '', question: syntheticOldQuestion(index), answer: `Frozen G3C old answer ${index}.`,
  }))
  add(G3C_LESSON_UID, { ...G3C_TASK, question: syntheticQuestion, answer: 'Complete synthetic retained G3C answer.' })
  Object.assign(problems.find(row => row.contentId === G3C_TASK.contentId)!, G3C_TASK_METADATA)
  let filler = 0
  while (problems.length < 508) {
    add(lessonUids[20 + filler % 100], {
      id: `frozen-problem-${filler}`, title: `Frozen problem ${filler}`, difficulty: 'MEDIUM',
      type: filler < 301 ? 'THEORY' : 'CODING', href: '',
      question: `Frozen neighbor question ${filler}.`, answer: `Frozen neighbor answer ${filler}.`,
    })
    filler++
  }
  const resources = Array.from({ length: 33 }, (_, order) => ({
    contentId: `/fixture-resource-${order}`, slug: `fixture-resource-${order}`, title: `Frozen resource ${order}`,
    description: 'Frozen resource description', href: `/resources/fixture-resource-${order}`, order,
    access: 'FREE' as const, courseSlug: 'js-track', sectionSlug: 'core-fundamentals', lessonSlug: 'type-coercion',
    body: '# Frozen resource\n', serializedBody: compileFixture('# Frozen resource\n'),
  }))
  return { content: { courses, sections, lessons, problems }, resources }
}

export function inventory(snapshot: Snapshot): InventoryRow[] {
  const result: InventoryRow[] = []
  for (const kind of ['course', 'section', 'lesson', 'resource'] as const) {
    const rows = kind === 'resource' ? snapshot.resources : snapshot.content[`${kind}s`]
    for (const { body, serializedBody, ...metadata } of rows) {
      result.push({ kind, contentId: metadata.contentId, metadata, text: { body }, serialized: { body: serializedBody } })
    }
  }
  for (const { question, answer, serializedQuestion, serializedAnswer, ...metadata } of snapshot.content.problems) {
    result.push({ kind: 'problem', contentId: metadata.contentId, metadata,
      text: { question, answer }, serialized: { question: serializedQuestion, answer: serializedAnswer } })
  }
  return result
}

type SourceProblem = {
  id: string; title: string; difficulty: string; type: string; href: string; question: string; answer: string;
  [key: string]: unknown;
}
export type SourceLesson = {
  id: string; title: string; description: string | null; order: number; access: string;
  problems: SourceProblem[]; [key: string]: unknown;
}
export function sourcePayload(snapshot: Snapshot): Map<string, Buffer> {
  const files = new Map<string, Buffer>()
  const put = (file: string, text: string) => files.set(file, Buffer.from(text))
  for (const course of snapshot.content.courses) put(`content/${course.slug}/page.mdx`, course.body)
  for (const section of snapshot.content.sections) put(`content${section.contentId}/page.mdx`, section.body)
  for (const section of snapshot.content.sections) {
    const lessons = snapshot.content.lessons.filter(row => row.sectionContentId === section.contentId).map(row => {
      const problems = snapshot.content.problems.filter(problem => problem.lessonContentId === row.contentId).map(problem => ({
        id: problem.contentId.split('/').at(-1)!, title: problem.title, difficulty: problem.difficulty, type: problem.type, href: problem.href,
        question: problem.question, answer: problem.answer,
      }))
      const metadata = row.contentId === `/${G3C_LESSON_UID}` ? G3C_LESSON_METADATA : {
        id: `/${row.contentId.split('/').at(-1)!}`, title: row.title, description: row.description, order: row.order, access: row.access,
      }
      return { ...metadata, problems }
    })
    put(`content${section.contentId}/_lessons.json`, JSON.stringify({ lessons }))
  }
  for (const lesson of snapshot.content.lessons) put(`content${lesson.contentId}/page.mdx`, lesson.body)
  for (const resource of snapshot.resources) put(`resources/${resource.slug}/page.mdx`, resource.body)
  files.set('resources/fixture-resource-0/opaque.bin', Buffer.from([0xff, 0x80, 0x00]))
  return files
}
export function editSource(files: Map<string, Buffer>, uid: string, edit: (lesson: SourceLesson) => void) {
  const file = `content/${uid.split('/').slice(0, 2).join('/')}/_lessons.json`
  const parsed = JSON.parse(files.get(file)!.toString('utf8')) as { lessons: SourceLesson[] }
  const lesson = parsed.lessons.find(item => item.id === `/${uid.split('/').at(-1)}`)!
  edit(lesson)
  files.set(file, Buffer.from(JSON.stringify(parsed)))
}

export function expectedSourceHash(files: Map<string, Buffer>) {
  const selectedBodies = new Set(EXPECTED_LESSONS.map(uid => `content/${uid}/page.mdx`))
  const entries = [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, bytes]) => {
    if (selectedBodies.has(file)) return { path: file, sha256: rawHash('[bound lesson body]') }
    const match = /^content\/([^/]+)\/([^/]+)\/_lessons\.json$/.exec(file)
    if (!match) return { path: file, sha256: rawHash(bytes) }
    const config = JSON.parse(bytes.toString('utf8')) as { lessons: SourceLesson[] }
    for (const lesson of config.lessons) {
      for (const problem of lesson.problems) {
        if (ASSESSMENTS.includes(`/${match[1]}/${match[2]}${lesson.id}/${problem.id}`)) {
          Object.assign(problem, { question: null, answer: null, type: null })
        }
      }
    }
    return { path: file, sha256: valueHash(config) }
  })
  return valueHash(entries)
}
export function expectedPreparedHash(rows: InventoryRow[]) {
  const copy = structuredClone(rows)
  for (const row of copy) {
    if (row.kind === 'lesson' && EXPECTED_LESSONS.some(uid => row.contentId === `/${uid}`)) {
      Object.assign(row.text, { body: null })
      row.serialized.body = null
    }
    if (row.kind === 'problem' && ASSESSMENTS.includes(row.contentId)) {
      row.metadata.type = null
      Object.assign(row.text, { question: null, answer: null })
      Object.assign(row.serialized, { question: null, answer: null })
    }
  }
  copy.sort((a, b) => `${a.kind}:${a.contentId}` < `${b.kind}:${b.contentId}` ? -1 : `${a.kind}:${a.contentId}` > `${b.kind}:${b.contentId}` ? 1 : 0)
  return valueHash(copy)
}
export function practiceBinding(): PracticePublicationBinding {
  const before = practiceSnapshot(), after = practiceSnapshot('after')
  const assessment = (snapshot: Snapshot, contentId: string) => {
    const row = snapshot.content.problems.find(row => row.contentId === contentId)!
    return {
      type: row.type, questionSha256: rawHash(row.question), answerSha256: rawHash(row.answer),
      serializedQuestionSha256: valueHash(row.serializedQuestion), serializedAnswerSha256: valueHash(row.serializedAnswer),
    }
  }
  const body = (snapshot: Snapshot, uid: string) => {
    const row = snapshot.content.lessons.find(row => row.contentId === `/${uid}`)!
    return { rawSha256: rawHash(row.body), serializedSha256: valueHash(row.serializedBody) }
  }
  return {
    sourceBase: '5f46718f80c5340ae0a128e0bb87418c9a6c0619',
    protectedSourceSha256: expectedSourceHash(sourcePayload(before)),
    protectedPreparedSha256: expectedPreparedHash(inventory(before)),
    lessons: EXPECTED_LESSONS.map(uid => ({
      uid, body: { before: body(before, uid), after: body(after, uid) },
      assessments: expectedIds(uid).map(id => ({
        id, before: assessment(before, `/${uid}/${id}`), after: assessment(after, `/${uid}/${id}`),
      })),
    })),
  }
}

export const RETAINED_ANCHOR_CASES = [
  { uid: 'js-track/advanced-concepts/functional-programming', id: 'pure-functions', title: 'Pure Functions' },
  { uid: 'js-track/advanced-concepts/symbols', id: 'well-known-symbols', title: 'Well-Known Symbols' },
  { uid: 'js-track/advanced-concepts/service-workers', id: 'registering-a-service-worker', title: 'Registering a Service Worker' },
] as const

export function retainedPracticeSourceFixture(
  target: (typeof RETAINED_ANCHOR_CASES)[number] = RETAINED_ANCHOR_CASES[0],
) {
  const snapshots = { before: practiceSnapshot(), after: practiceSnapshot('after') }
  const binding = practiceBinding()
  const lessonBinding = binding.lessons.find(item => item.uid === target.uid)!
  for (const version of ['before', 'after'] as const) {
    const snapshot = snapshots[version]
    const card = snapshot.content.problems.find(item => item.slug === 'frozen-problem-0')!
    const question = 'Frozen protected theory question.'
    const answer = 'Frozen protected theory explanation.'
    Object.assign(card, {
      contentId: `/${target.uid}/${target.id}`, slug: target.id, title: target.title,
      lessonContentId: `/${target.uid}`, link: `/courses/${target.uid}#${target.id}`,
      type: 'THEORY', question, answer,
      serializedQuestion: compileFixture(question), serializedAnswer: compileFixture(answer),
    })
    const body = snapshot.content.lessons.find(item => item.contentId === `/${target.uid}`)!
    body.body += `\n\n## ${target.title}\n\nRetained synthetic destination.\n`
    body.serializedBody = compileFixture(body.body)
    lessonBinding.body[version] = {
      rawSha256: rawHash(body.body), serializedSha256: valueHash(body.serializedBody),
    }
  }
  const before = sourcePayload(snapshots.before), after = sourcePayload(snapshots.after)
  binding.protectedSourceSha256 = expectedSourceHash(before)
  binding.protectedPreparedSha256 = expectedPreparedHash(inventory(snapshots.before))
  return {
    before, after, binding, target,
    retained: { [target.uid]: { beforeBodySha256: lessonBinding.body.before.rawSha256, ids: [target.id] } },
  }
}

export const PROMISE_DIAGRAM_CASE = {
  lesson: 'js-track/advanced-concepts/promise-patterns',
  beforeBodySha256: '2c231d24b29ca727089859064fcc03497149ae0902c05c9aa0f66d4d644ace49',
  beforeUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises/promises.png',
  afterUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/promises.png',
  alt: 'Promise States Diagram',
} as const

export function promiseDiagramSourceFixture() {
  const snapshots = { before: practiceSnapshot(), after: practiceSnapshot('after') }
  const binding = practiceBinding()
  const bodyBinding = binding.lessons.find(item => item.uid === PROMISE_DIAGRAM_CASE.lesson)!.body
  for (const version of ['before', 'after'] as const) {
    const body = snapshots[version].content.lessons.find(item => item.contentId === `/${PROMISE_DIAGRAM_CASE.lesson}`)!
    const url = version === 'before' ? PROMISE_DIAGRAM_CASE.beforeUrl : PROMISE_DIAGRAM_CASE.afterUrl
    body.body += `\n\n![${PROMISE_DIAGRAM_CASE.alt}](${url})\n`
    body.serializedBody = compileFixture(body.body)
    bodyBinding[version] = { rawSha256: rawHash(body.body), serializedSha256: valueHash(body.serializedBody) }
  }
  const before = sourcePayload(snapshots.before), after = sourcePayload(snapshots.after)
  binding.protectedSourceSha256 = expectedSourceHash(before)
  binding.protectedPreparedSha256 = expectedPreparedHash(inventory(snapshots.before))
  return {
    before, after, binding,
    diagram: { ...PROMISE_DIAGRAM_CASE, beforeBodySha256: bodyBinding.before.rawSha256 },
  }
}

export const CANONICAL_NEIGHBOR_CASES = [
  {
    sourceUid: 'js-track/advanced-concepts/security', title: 'Browser Security',
    publicSlug: 'browser-security', publicHref: '/courses/js-track/advanced-concepts/browser-security',
  },
  {
    sourceUid: 'js-track/frontend-development/security', title: 'Web Application Security',
    publicSlug: 'web-application-security', publicHref: '/courses/js-track/frontend-development/web-application-security',
  },
] as const

export function canonicalNeighborSourceFixture(target: (typeof CANONICAL_NEIGHBOR_CASES)[number]) {
  const linkingUid = 'js-track/advanced-concepts/browser-storage'
  const snapshots = { before: practiceSnapshot(), after: practiceSnapshot('after') }
  const binding = practiceBinding()
  for (const version of ['before', 'after'] as const) {
    const snapshot = snapshots[version]
    const neighbor = snapshot.content.lessons.find(item => item.contentId.includes('/frozen-'))!
    const originalContentId = neighbor.contentId
    Object.assign(neighbor, {
      contentId: `/${target.sourceUid}`, slug: target.publicSlug, title: target.title,
      href: target.publicHref, sectionContentId: `/${target.sourceUid.split('/').slice(0, 2).join('/')}`,
    })
    neighbor.body = 'export const metadata = { title: "Synthetic security reference" }\n\n# Synthetic security reference\n\n## Security Reference\n\nFrozen neighboring explanation.\n'
    neighbor.serializedBody = compileFixture(neighbor.body)
    for (const problem of snapshot.content.problems) {
      if (problem.lessonContentId !== originalContentId) continue
      const id = problem.contentId.split('/').at(-1)!
      problem.contentId = `/${target.sourceUid}/${id}`
      problem.lessonContentId = `/${target.sourceUid}`
      problem.link = `${target.publicHref}#${problem.slug}`
    }
    const body = snapshot.content.lessons.find(item => item.contentId === `/${linkingUid}`)!
    body.body += `\n\nSee [security lesson](${target.publicHref}) and [security reference](${target.publicHref}#security-reference).\n`
    body.serializedBody = compileFixture(body.body)
    binding.lessons.find(item => item.uid === linkingUid)!.body[version] = {
      rawSha256: rawHash(body.body), serializedSha256: valueHash(body.serializedBody),
    }
  }
  const before = sourcePayload(snapshots.before), after = sourcePayload(snapshots.after)
  binding.protectedSourceSha256 = expectedSourceHash(before)
  binding.protectedPreparedSha256 = expectedPreparedHash(inventory(snapshots.before))
  return { before, after, binding, target, linkingUid, snapshots }
}

export function scopeFixture() {
  return {
    changedFiles: [],
    assessment: { bindingSha256: valueHash(practiceBinding()), sourceLessonBeforeSha256: rawHash('before'), sourceLessonAfterSha256: rawHash('after') },
    structural: {
      changeClass: 'existing-practice-batch-v1', profile: 'platform-practice-consistency-2026-09', lesson: '',
      allowedChangedFields: [
        ...EXPECTED_LESSONS.map(uid => ({ kind: 'lesson', contentId: `/${uid}`, field: 'body' })),
        ...ASSESSMENTS.map(contentId => ({ kind: 'problem', contentId, field: 'assessment' })),
      ],
    },
  }
}
export function databaseFixture(snapshot: Snapshot) {
  const updatedAt = new Date('2026-09-19T00:00:00Z')
  return [
    snapshot.content.courses.map((row, i) => ({ ...row, id: `course-${i}`, updatedAt })),
    snapshot.content.sections.map(({ courseSlug, ...row }, i) => ({ ...row, id: `section-${i}`, updatedAt, course: { slug: courseSlug } })),
    snapshot.content.lessons.map(({ sectionContentId, ...row }, i) => ({
      ...row, id: `lesson-${i}`, updatedAt,
      sectionId: `section-${snapshot.content.sections.findIndex(section => section.contentId === sectionContentId)}`,
      section: { contentId: sectionContentId },
    })),
    snapshot.content.problems.map(({ lessonContentId, ...row }, i) => ({
      ...row, id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, updatedAt,
      lessonId: `lesson-${snapshot.content.lessons.findIndex(lesson => lesson.contentId === lessonContentId)}`,
      lesson: { contentId: lessonContentId },
    })),
    snapshot.resources.map(({ lessonSlug, sectionSlug, courseSlug, ...row }, i) => ({
      ...row, id: `resource-${i}`, updatedAt, lessonId: 'lesson-0',
      lesson: { slug: lessonSlug, section: { slug: sectionSlug, course: { slug: courseSlug } } },
    })),
  ] as const
}

// Virtual source trees exercise the real payload walker without creating scratch directories.
export function virtualPayloadFs(real: typeof fs, roots: Map<string, Map<string, Buffer>>) {
  const locate = (value: unknown) => {
    if (typeof value !== 'string') return undefined
    for (const [root, files] of roots) if (value.startsWith(`${root}${path.sep}`)) {
      return { files, relative: path.relative(root, value).split(path.sep).join('/') }
    }
  }
  return {
    ...real,
    lstatSync: ((file: string, ...args: unknown[]) => {
      const entry = locate(file)
      if (!entry) return Reflect.apply(real.lstatSync, real, [file, ...args])
      const isFile = entry.files.has(entry.relative)
      const isDirectory = [...entry.files.keys()].some(key => key.startsWith(`${entry.relative}/`))
      if (!isFile && !isDirectory) throw new Error(`Synthetic ENOENT: ${file}`)
      return { isFile: () => isFile, isDirectory: () => isDirectory, isSymbolicLink: () => false }
    }) as typeof real.lstatSync,
    readdirSync: ((file: string, ...args: unknown[]) => {
      const entry = locate(file)
      if (!entry) return Reflect.apply(real.readdirSync, real, [file, ...args])
      return [...new Set([...entry.files.keys()].filter(key => key.startsWith(`${entry.relative}/`))
        .map(key => key.slice(entry.relative.length + 1).split('/')[0]))]
    }) as typeof real.readdirSync,
    readFileSync: ((file: string, ...args: unknown[]) => {
      const entry = locate(file)
      if (!entry) return Reflect.apply(real.readFileSync, real, [file, ...args])
      const value = entry.files.get(entry.relative)
      if (!value) throw new Error(`Synthetic ENOENT: ${file}`)
      return args[0] === 'utf8' ? value.toString('utf8') : Buffer.from(value)
    }) as typeof real.readFileSync,
  }
}
