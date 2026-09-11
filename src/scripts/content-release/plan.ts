import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { CONTENT_STATS } from '@/constants/content-stats'
import { assertCompiledMdx } from '@/lib/mdx-result'
import { prepareContent, type PreparedContent } from '../sync-content'
import { prepareResources, type PreparedResource } from '../sync-resources'
import {
  DEFAULT_CHANGE_CLASS,
  STRUCTURAL_CHANGE_CLASS,
  assertInPlaceScope,
  digest,
  normalizeReleaseScopeOptions,
  type ChangeClass,
  type ReleaseScopeOptions,
  type ScopeReport,
} from './scope'

type Kind = 'course' | 'section' | 'lesson' | 'problem' | 'resource'
type TextField = 'body' | 'question' | 'answer'
type WriteMatch =
  | { kind: 'lesson'; where: Prisma.LessonWhereInput }
  | { kind: 'problem'; where: Prisma.ProblemWhereInput }
  | { kind: 'resource'; where: Prisma.ResourceWhereInput }
export type CatalogRow = {
  kind: Kind
  contentId: string
  metadata: Record<string, unknown>
  text: Partial<Record<TextField, string>>
  serialized: Partial<Record<TextField, unknown>>
  id?: string
  updatedAt?: Date
  match?: WriteMatch
}
export type InPlaceChange = {
  kind: 'lesson' | 'problem' | 'resource'
  contentId: string
  field: 'body' | 'answer'
  before: string
  after: string
  serializedAfter: { compiledSource: string }
}
export type InPlacePlan = {
  changeClass: ChangeClass
  lesson: string
  scope: ScopeReport
  before: CatalogRow[]
  after: CatalogRow[]
  changes: InPlaceChange[]
}

const key = (row: Pick<CatalogRow, 'kind' | 'contentId'>) => `${row.kind}:${row.contentId}`

function row(
  kind: Kind,
  metadata: Record<string, unknown>,
  text: Partial<Record<TextField, string | null>>,
  serialized: CatalogRow['serialized'],
  identity: Pick<CatalogRow, 'id' | 'updatedAt' | 'match'> = {},
): CatalogRow {
  if (typeof metadata.contentId !== 'string' || !metadata.contentId) {
    throw new Error(`Missing ${kind} content identity`)
  }
  const normalizedText: CatalogRow['text'] = {}
  for (const field of ['body', 'question', 'answer'] as const) {
    const value = text[field]
    if (value === undefined) continue
    if (typeof value !== 'string') throw new Error(`Missing authored field: ${kind}:${metadata.contentId}:${field}`)
    normalizedText[field] = value
    if (value.trim()) assertCompiledMdx(serialized[field], `${kind}:${metadata.contentId}:${field}`)
    else serialized[field] = null
  }
  return { kind, contentId: metadata.contentId, metadata, text: normalizedText, serialized, ...identity }
}

function sourceRows(content: PreparedContent, resources: PreparedResource[]): CatalogRow[] {
  return [
    ...content.courses.map(({ body, serializedBody, ...metadata }) =>
      row('course', metadata, { body }, { body: serializedBody })),
    ...content.sections.map(({ body, serializedBody, ...metadata }) =>
      row('section', metadata, { body }, { body: serializedBody })),
    ...content.lessons.map(({ body, serializedBody, description, ...metadata }) =>
      row('lesson', { ...metadata, description: description ?? null }, { body }, { body: serializedBody })),
    ...content.problems.map(({ question, answer, serializedQuestion, serializedAnswer, ...metadata }) =>
      row('problem', metadata, { question, answer }, { question: serializedQuestion, answer: serializedAnswer })),
    ...resources.map(({ body, serializedBody, ...metadata }) =>
      row('resource', metadata, { body }, { body: serializedBody })),
  ]
}

function catalogMap(rows: CatalogRow[]): Map<string, CatalogRow> {
  const map = new Map(rows.map((item) => [key(item), item]))
  if (map.size !== rows.length) throw new Error('Duplicate content identities in release catalog')
  const expected: Record<Kind, number> = {
    course: CONTENT_STATS.courses, section: CONTENT_STATS.sections,
    lesson: CONTENT_STATS.lessons, problem: CONTENT_STATS.problems,
    resource: CONTENT_STATS.resources,
  }
  for (const kind of Object.keys(expected) as Kind[]) {
    if (rows.filter((item) => item.kind === kind).length !== expected[kind]) {
      throw new Error(`Incomplete or unexpected ${kind} inventory`)
    }
  }
  return map
}

async function prepareSnapshot(root: string): Promise<CatalogRow[]> {
  const content = await prepareContent({ path: path.join(root, 'content'), isSample: false })
  const resources = await prepareResources({
    contentPath: path.join(root, 'content'), resourcesPath: path.join(root, 'resources'),
  })
  return sourceRows(content, resources)
}

export async function planInPlaceRelease(
  baseRoot: string,
  candidateRoot: string,
  options: ReleaseScopeOptions = {},
): Promise<InPlacePlan> {
  const releaseScope = normalizeReleaseScopeOptions(options)
  const scope = releaseScope.changeClass === DEFAULT_CHANGE_CLASS
    ? assertInPlaceScope(baseRoot, candidateRoot)
    : assertInPlaceScope(baseRoot, candidateRoot, releaseScope)
  // Both complete datasets, including resources, are prepared before any write.
  const before = await prepareSnapshot(baseRoot)
  const after = await prepareSnapshot(candidateRoot)
  const stableScope = releaseScope.changeClass === DEFAULT_CHANGE_CLASS
    ? assertInPlaceScope(baseRoot, candidateRoot)
    : assertInPlaceScope(baseRoot, candidateRoot, releaseScope)
  if (!isDeepStrictEqual(scope, stableScope)) {
    throw new Error('Source payload changed during release preparation')
  }
  const previous = catalogMap(before)
  const candidate = catalogMap(after)
  const changes: InPlaceChange[] = []
  for (const [id, oldRow] of previous) {
    const next = candidate.get(id)
    if (!next || !isDeepStrictEqual(oldRow.metadata, next.metadata)) {
      throw new Error(`Unsupported metadata/identity change: ${id}`)
    }
    for (const field of ['body', 'question', 'answer'] as const) {
      if (oldRow.text[field] === next.text[field]) continue
      if ((next.kind !== 'lesson' && next.kind !== 'problem' && next.kind !== 'resource') ||
          field !== (next.kind === 'problem' ? 'answer' : 'body') ||
          typeof oldRow.text[field] !== 'string' || typeof next.text[field] !== 'string') {
        throw new Error(`Unsupported authored-field change: ${id}:${field}`)
      }
      const serializedAfter = next.serialized[field]
      assertCompiledMdx(serializedAfter, `${id}:${field}`)
      changes.push({
        kind: next.kind, contentId: next.contentId, field,
        before: oldRow.text[field], after: next.text[field], serializedAfter,
      })
    }
  }
  if (releaseScope.changeClass === STRUCTURAL_CHANGE_CLASS) {
    const allowed = new Set(scope.structural?.allowedChangedFields.map((field) => field.contentId) ?? [])
    if (!scope.structural || changes.some((change) => !allowed.has(change.contentId))) {
      throw new Error('Structural release plan contains a change outside the selected TS Basics fields')
    }
  }
  return { changeClass: releaseScope.changeClass, lesson: releaseScope.lesson, scope, before, after, changes }
}

/** A bounded read snapshot, not the former full-catalog write transaction. */
export async function readReleaseCatalog(): Promise<CatalogRow[]> {
  const [courses, sections, lessons, problems, resources] = await prisma.$transaction([
    prisma.course.findMany({ select: {
      id: true, updatedAt: true, contentId: true, title: true, description: true,
      slug: true, href: true, order: true, body: true, serializedBody: true,
    } }),
    prisma.section.findMany({ select: {
      id: true, updatedAt: true, contentId: true, title: true, description: true,
      slug: true, href: true, order: true, body: true, serializedBody: true,
      course: { select: { slug: true } },
    } }),
    prisma.lesson.findMany({ select: {
      id: true, updatedAt: true, contentId: true, title: true, description: true,
      slug: true, href: true, order: true, body: true, serializedBody: true, access: true,
      sectionId: true, section: { select: { contentId: true } },
    } }),
    prisma.problem.findMany({ select: {
      id: true, updatedAt: true, contentId: true, title: true, slug: true,
      href: true, link: true, difficulty: true, type: true, question: true, answer: true,
      serializedQuestion: true, serializedAnswer: true,
      lessonId: true, lesson: { select: { contentId: true } },
    } }),
    prisma.resource.findMany({ select: {
      id: true, updatedAt: true, contentId: true, title: true, description: true,
      slug: true, href: true, order: true, body: true, serializedBody: true, access: true,
      lessonId: true,
      lesson: { select: { slug: true, section: { select: { slug: true, course: { select: { slug: true } } } } } },
    } }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  return [
    ...courses.map(({ id, updatedAt, body, serializedBody, ...metadata }) =>
      row('course', metadata, { body }, { body: serializedBody }, { id, updatedAt })),
    ...sections.map(({ id, updatedAt, body, serializedBody, course, ...metadata }) =>
      row('section', { ...metadata, courseSlug: course.slug }, { body }, { body: serializedBody }, { id, updatedAt })),
    ...lessons.map(({ id, updatedAt, body, serializedBody, section, sectionId, ...metadata }) =>
      row('lesson', { ...metadata, sectionContentId: section.contentId }, { body }, { body: serializedBody }, {
        id, updatedAt, match: { kind: 'lesson', where: {
          ...metadata, id, updatedAt, sectionId, body,
          serializedBody: { equals: serializedBody ?? Prisma.AnyNull },
        } },
      })),
    ...problems.map(({ id, updatedAt, question, answer, serializedQuestion, serializedAnswer, lesson, lessonId, ...metadata }) =>
      row('problem', { ...metadata, lessonContentId: lesson.contentId }, { question, answer },
        { question: serializedQuestion, answer: serializedAnswer }, {
          id, updatedAt, match: { kind: 'problem', where: {
            ...metadata, id, updatedAt, lessonId, question, answer,
            serializedQuestion: { equals: serializedQuestion ?? Prisma.AnyNull },
            serializedAnswer: { equals: serializedAnswer ?? Prisma.AnyNull },
          } },
        })),
    ...resources.map(({ id, updatedAt, body, serializedBody, lesson, lessonId, ...metadata }) =>
      row('resource', {
        ...metadata, lessonSlug: lesson?.slug ?? null, sectionSlug: lesson?.section.slug ?? null,
        courseSlug: lesson?.section.course.slug ?? null,
      }, { body }, { body: serializedBody }, {
        id, updatedAt, match: { kind: 'resource', where: {
          ...metadata, id, updatedAt, lessonId, body,
          serializedBody: { equals: serializedBody ?? Prisma.AnyNull },
        } },
      })),
  ]
}

const sameAuthoredState = (a: CatalogRow, b: CatalogRow) =>
  isDeepStrictEqual(a.text, b.text) && isDeepStrictEqual(a.serialized, b.serialized)

export function checkReleaseState(plan: InPlacePlan, current: CatalogRow[]) {
  const live = catalogMap(current)
  const before = catalogMap(plan.before)
  const after = catalogMap(plan.after)
  for (const [id, baseline] of before) {
    const actual = live.get(id)
    const candidate = after.get(id)
    if (!actual || !candidate || !isDeepStrictEqual(actual.metadata, baseline.metadata) ||
        (!sameAuthoredState(actual, baseline) && !sameAuthoredState(actual, candidate))) {
      throw new Error(`Unexpected database content/metadata state; no overwrite permitted: ${id}`)
    }
  }
  return live
}

export type ChangeResult = { kind: InPlaceChange['kind']; contentId: string; status: 'updated' | 'already-applied' }

export async function applyInPlaceRelease(
  plan: InPlacePlan,
  onChange: (result: ChangeResult) => void = () => {},
): Promise<ChangeResult[]> {
  const current = checkReleaseState(plan, await readReleaseCatalog())
  const after = catalogMap(plan.after)
  const results: ChangeResult[] = []
  for (const change of plan.changes) {
    const id = key(change)
    const actual = current.get(id)
    const candidate = after.get(id)
    if (!actual?.id || !actual.updatedAt || !candidate) throw new Error(`Missing update identity: ${id}`)
    let status: ChangeResult['status'] = 'already-applied'
    if (!sameAuthoredState(actual, candidate)) {
      if (!actual.match || actual.match.kind !== change.kind) throw new Error(`Missing conditional update: ${id}`)
      const data = { body: change.after, serializedBody: change.serializedAfter }
      // Match all observed authored fields, not only updatedAt (Problem does not
      // currently have an automatic @updatedAt version column).
      const result = actual.match.kind === 'lesson'
        ? await prisma.lesson.updateMany({ where: actual.match.where, data })
        : actual.match.kind === 'resource'
          ? await prisma.resource.updateMany({ where: actual.match.where, data })
          : await prisma.problem.updateMany({
            where: actual.match.where,
            data: { answer: change.after, serializedAnswer: change.serializedAfter },
          })
      if (result.count !== 1) throw new Error(`Concurrent authored change detected: ${id}`)
      status = 'updated'
    }
    const result = { kind: change.kind, contentId: change.contentId, status }
    results.push(result)
    onChange(result)
  }
  const final = checkReleaseState(plan, await readReleaseCatalog())
  for (const change of plan.changes) {
    const id = key(change)
    if (!sameAuthoredState(final.get(id)!, after.get(id)!)) {
      throw new Error(`Candidate content was not fully persisted: ${id}`)
    }
  }
  return results
}

export function describeInPlacePlan(plan: InPlacePlan) {
  const changedEntities = plan.changes.map((change) => ({
    kind: change.kind, contentId: change.contentId, field: change.field,
    beforeSha256: digest(change.before), afterSha256: digest(change.after),
  }))
  if (plan.changeClass === STRUCTURAL_CHANGE_CLASS) {
    return {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      profile: plan.scope.structural?.profile,
      lesson: plan.lesson,
      allowedChangedFields: plan.scope.structural?.allowedChangedFields,
      scope: plan.scope,
      changedEntities,
    }
  }
  return {
    changeClass: 'independent-in-place-text-v1',
    scope: plan.scope,
    changedEntities,
  }
}
