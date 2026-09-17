import { isDeepStrictEqual } from 'node:util'
import { CONTENT_STATS } from '@/constants/content-stats'
import { G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_LESSON_CONTENT_ID, G3C_TASK } from '@/lib/g3c-task'
import { assertG3cQuestion, G3C_TASK_METADATA } from '@/lib/g3c-publication'
import { assertCompiledMdx } from '@/lib/mdx-result'

export const G3B_CONFIG_PATH = 'content/dsa-track/common-techniques/_lessons.json'
export const G3B_TASK_METADATA = {
  contentId: G3B_TASK.contentId,
  slug: G3B_TASK.slug,
  title: G3B_TASK.title,
  type: G3B_TASK.type,
  difficulty: G3B_TASK.difficulty,
  href: G3B_TASK.href,
  link: G3B_TASK.link,
  lessonContentId: G3B_LESSON_CONTENT_ID,
}

export type InventoryRow = {
  kind: 'course' | 'section' | 'lesson' | 'problem' | 'resource'
  contentId: string
  metadata: Record<string, unknown>
  text: Partial<Record<'body' | 'question' | 'answer', string>>
  serialized: Partial<Record<'body' | 'question' | 'answer', unknown>>
}

export function assertG3bTask(row: InventoryRow) {
  if (row.kind !== 'problem' || row.contentId !== G3B_TASK.contentId ||
      !isDeepStrictEqual(row.metadata, G3B_TASK_METADATA) ||
      row.text.question !== G3B_TASK.question || !row.text.answer?.trim()) {
    throw new Error('Invalid G3B task identity, ownership, metadata or complete free feedback')
  }

  assertCompiledMdx(row.serialized.question, `${row.contentId}:question`)
  assertCompiledMdx(row.serialized.answer, `${row.contentId}:answer`)
}

export function assertG3cTask(row: InventoryRow) {
  assertG3cQuestion(row.text.question)
  if (row.kind !== 'problem' || row.contentId !== G3C_TASK.contentId ||
      !isDeepStrictEqual(row.metadata, G3C_TASK_METADATA) || !row.text.answer?.trim()) {
    throw new Error('Invalid G3C task identity, ownership, metadata or complete free feedback')
  }
  assertCompiledMdx(row.serialized.question, `${row.contentId}:question`)
  assertCompiledMdx(row.serialized.answer, `${row.contentId}:answer`)
}

export function assertG3cSourceTask(value: unknown, lessonContentId: string) {
  if (!value || typeof value !== 'object' || !('answer' in value) ||
      typeof value.answer !== 'string' || !value.answer.trim() || !('question' in value)) {
    throw new Error('G3C requires a complete question/setup and nonempty free feedback')
  }
  const { answer, question, ...metadata } = value
  assertG3cQuestion(question)
  if (lessonContentId !== G3C_LESSON_CONTENT_ID || !isDeepStrictEqual(metadata, {
    id: G3C_TASK.id, title: G3C_TASK.title, type: G3C_TASK.type,
    difficulty: G3C_TASK.difficulty, href: G3C_TASK.href,
  })) throw new Error('Invalid G3C source task identity, ownership, metadata or schema')
  return { ...metadata, question, answer }
}

export function nativeTaskContract(contentId: string) {
  if (contentId === G3B_TASK.contentId) return { task: G3B_TASK, lessonContentId: G3B_LESSON_CONTENT_ID, assert: assertG3bTask, name: 'G3B' }
  if (contentId === G3C_TASK.contentId) return { task: G3C_TASK, lessonContentId: G3C_LESSON_CONTENT_ID, assert: assertG3cTask, name: 'G3C' }
  throw new Error('Unsupported native task identity')
}

/** Source-only contract: derived database fields and arbitrary schema keys are not authored. */
export function assertG3bSourceTask(value: unknown, lessonContentId: string) {
  if (!value || typeof value !== 'object' || !('answer' in value) ||
      typeof value.answer !== 'string' || !value.answer.trim()) {
    throw new Error('G3B requires complete nonempty free feedback')
  }
  const { answer, ...metadata } = value
  if (lessonContentId !== G3B_LESSON_CONTENT_ID || !isDeepStrictEqual(metadata, {
    id: G3B_TASK.id, title: G3B_TASK.title, type: G3B_TASK.type,
    difficulty: G3B_TASK.difficulty, href: G3B_TASK.href, question: G3B_TASK.question,
  })) throw new Error('Invalid G3B source task identity, ownership, question, metadata or schema')
  return { ...metadata, answer }
}

/** Baseline inventory plus only the two exact complete canonical additions. */
export function catalogMap<T extends InventoryRow>(rows: T[]): Map<string, T> {
  const map = new Map(rows.map((row) => [`${row.kind}:${row.contentId}`, row]))
  if (map.size !== rows.length) throw new Error('Duplicate content identities in release catalog')
  const task = map.get(`problem:${G3B_TASK.contentId}`)
  if (task) {
    assertG3bTask(task)
    if (!map.has(`lesson:${G3B_LESSON_CONTENT_ID}`)) throw new Error('Missing G3B task owner in catalog')
  }
  const g3c = map.get(`problem:${G3C_TASK.contentId}`)
  if (g3c) {
    assertG3cTask(g3c)
    if (!task || !map.has(`lesson:${G3C_LESSON_CONTENT_ID}`)) {
      throw new Error('G3C requires the retained complete G3B task and its own lesson owner')
    }
  }
  for (const row of rows) {
    if (row.kind !== 'problem') continue
    for (const native of [G3B_TASK, G3C_TASK]) {
      if (row.contentId !== native.contentId && (row.metadata.slug === native.slug || row.metadata.title === native.title)) {
        throw new Error('Duplicate or foreign native task identity/slug/title in release problem inventory')
      }
    }
  }
  const expected = {
    course: CONTENT_STATS.courses, section: CONTENT_STATS.sections,
    lesson: CONTENT_STATS.lessons, problem: CONTENT_STATS.problems + (task ? 1 : 0) + (g3c ? 1 : 0),
    resource: CONTENT_STATS.resources,
  }
  for (const kind of Object.keys(expected) as InventoryRow['kind'][]) {
    if (rows.filter((row) => row.kind === kind).length !== expected[kind]) {
      throw new Error(`Incomplete or unexpected ${kind} inventory`)
    }
  }
  return map
}

export function describeCatalog(rows: InventoryRow[]) {
  catalogMap(rows)
  const identities = rows.map(({ kind, contentId }) => ({ kind, contentId }))
    .sort((a, b) => `${a.kind}:${a.contentId}`.localeCompare(`${b.kind}:${b.contentId}`, 'en'))
  return {
    counts: {
      courses: rows.filter(row => row.kind === 'course').length,
      sections: rows.filter(row => row.kind === 'section').length,
      lessons: rows.filter(row => row.kind === 'lesson').length,
      problems: rows.filter(row => row.kind === 'problem').length,
      resources: rows.filter(row => row.kind === 'resource').length,
    },
    identities,
  }
}
