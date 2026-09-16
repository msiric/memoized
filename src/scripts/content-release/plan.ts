import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { assertCompiledMdx } from '@/lib/mdx-result'
import { G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_LESSON_UID, G3C_TASK } from '@/lib/g3c-task'
import { prepareContent, type PreparedContent } from '../sync-content'
import { prepareResources, type PreparedResource } from '../sync-resources'
import {
  DEFAULT_CHANGE_CLASS,
  ADDITIVE_CHANGE_CLASS,
  STRUCTURAL_CHANGE_CLASS,
  assertInPlaceScope,
  digest,
  normalizeReleaseScopeOptions,
  type ChangeClass,
  type ReleaseScopeOptions,
  type ScopeReport,
} from './scope'
import { catalogMap, describeCatalog, nativeTaskContract } from './catalog'

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
  creations: CatalogRow[]
}

const key = (row: Pick<CatalogRow, 'kind' | 'contentId'>) => `${row.kind}:${row.contentId}`
const isNativeTask = (contentId: string) => contentId === G3B_TASK.contentId || contentId === G3C_TASK.contentId
function selectedTask(scope: Pick<InPlacePlan, 'changeClass' | 'lesson'>) {
  if (scope.changeClass !== ADDITIVE_CHANGE_CLASS) return undefined
  if (scope.lesson === G3B_LESSON_UID) return G3B_TASK.contentId
  if (scope.lesson === G3C_LESSON_UID) return G3C_TASK.contentId
  throw new Error('Unsupported additive lesson selection')
}

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

export function sourceRows(content: PreparedContent, resources: PreparedResource[]): CatalogRow[] {
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

export async function prepareSnapshot(root: string): Promise<CatalogRow[]> {
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
  const creations = after.filter(item => !previous.has(key(item)))
  const taskId = selectedTask(releaseScope)
  if (creations.length && (releaseScope.changeClass !== ADDITIVE_CHANGE_CLASS || creations.length !== 1 ||
      creations[0].contentId !== taskId || scope.addition?.contentId !== taskId)) {
    throw new Error('Unsupported release identity addition')
  }
  if (creations.length) nativeTaskContract(creations[0].contentId).assert(creations[0])
  const changes: InPlaceChange[] = []
  for (const [id, oldRow] of previous) {
    const next = candidate.get(id)
    if (!next || !isDeepStrictEqual(oldRow.metadata, next.metadata)) {
      throw new Error(`Unsupported metadata/identity change: ${id}`)
    }
    if (isNativeTask(oldRow.contentId) &&
        (!isDeepStrictEqual(oldRow.text, next.text) || !isDeepStrictEqual(oldRow.serialized, next.serialized))) {
      throw new Error('Retained G3B/G3C complete task payload is immutable')
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
  if (releaseScope.changeClass !== DEFAULT_CHANGE_CLASS) {
    const allowed = new Set(scope.structural?.allowedChangedFields.map((field) => field.contentId) ?? [])
    if (!scope.structural || changes.some((change) => !allowed.has(change.contentId))) {
      throw new Error(`Structural release plan contains a change outside the selected ${releaseScope.changeClass === STRUCTURAL_CHANGE_CLASS ? 'TS Basics' : releaseScope.lesson === G3C_LESSON_UID ? 'G3C' : 'G3B'} fields`)
    }
  }
  return { changeClass: releaseScope.changeClass, lesson: releaseScope.lesson, scope, before, after, changes, creations }
}

const problemSelection = {
  id: true, updatedAt: true, contentId: true, title: true, slug: true,
  href: true, link: true, difficulty: true, type: true, question: true, answer: true,
  serializedQuestion: true, serializedAnswer: true,
  lessonId: true, lesson: { select: { contentId: true } },
} as const

function databaseProblem({
  id, updatedAt, question, answer, serializedQuestion, serializedAnswer, lesson, lessonId, ...metadata
}: Prisma.ProblemGetPayload<{ select: typeof problemSelection }>) {
  return row('problem', { ...metadata, lessonContentId: lesson.contentId }, { question, answer },
    { question: serializedQuestion, answer: serializedAnswer }, {
      id, updatedAt, match: { kind: 'problem', where: {
        ...metadata, id, updatedAt, lessonId, question, answer,
        serializedQuestion: { equals: serializedQuestion ?? Prisma.AnyNull },
        serializedAnswer: { equals: serializedAnswer ?? Prisma.AnyNull },
      } },
    })
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
    prisma.problem.findMany({ select: problemSelection }),
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
    ...problems.map(databaseProblem),
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
  const additions = plan.after.filter(item => !before.has(key(item)))
  const taskId = selectedTask(plan)
  if (additions.length && (plan.changeClass !== ADDITIVE_CHANGE_CLASS || additions.length !== 1 ||
      additions[0].contentId !== taskId)) {
    throw new Error('Unsupported release identity addition')
  }
  for (const [id, actual] of live) {
    const candidate = after.get(id)
    if (!candidate || (!before.has(id) &&
        (!isDeepStrictEqual(actual.metadata, candidate.metadata) || !sameAuthoredState(actual, candidate)))) {
      throw new Error(`Unexpected database content/metadata state; no identity reuse permitted: ${id}`)
    }
  }
  for (const [id, baseline] of before) {
    const actual = live.get(id)
    const candidate = after.get(id)
    if (!actual || !candidate || !isDeepStrictEqual(actual.metadata, baseline.metadata) ||
        (!sameAuthoredState(actual, baseline) && !sameAuthoredState(actual, candidate))) {
      throw new Error(`Unexpected database content/metadata state; no overwrite permitted: ${id}`)
    }
    if (additions.length && !live.has(`problem:${taskId}`) && !sameAuthoredState(actual, baseline)) {
      throw new Error(`Dependent authored changes exist without the complete ${nativeTaskContract(taskId!).name} task`)
    }
  }
  return live
}

export type ChangeResult = {
  kind: InPlaceChange['kind']
  contentId: string
  status: 'updated' | 'already-applied' | 'created' | 'already-created'
  id?: string
}

function inspectCreatedTask(actual: CatalogRow, candidate: CatalogRow, owner: CatalogRow) {
  const contract = nativeTaskContract(candidate.contentId)
  contract.assert(actual)
  if (!actual.id || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(actual.id) ||
      actual.match?.kind !== 'problem' || actual.match.where.lessonId !== owner.id ||
      !isDeepStrictEqual(actual.metadata, candidate.metadata) || !sameAuthoredState(actual, candidate)) {
    throw new Error(`Canonical ${contract.name} record exists with a different UUID, owner or complete payload; no reuse permitted`)
  }
  return actual
}

function mayHaveCreated(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) return false
  if (error.code === 'P2002') {
    const target = 'meta' in error && error.meta && typeof error.meta === 'object' &&
      'target' in error.meta ? error.meta.target : undefined
    return isDeepStrictEqual(target, ['contentId']) || isDeepStrictEqual(target, ['lessonId', 'slug'])
  }
  return ['P1001', 'P1002', 'P1008', 'P1017', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'].includes(String(error.code))
}

async function createCompleteTask(candidate: CatalogRow, owner: CatalogRow) {
  const contract = nativeTaskContract(candidate.contentId)
  const { task } = contract
  contract.assert(candidate)
  if (!owner.id || owner.contentId !== contract.lessonContentId || owner.match?.kind !== 'lesson') {
    throw new Error(`Missing conditional ${contract.name} lesson ownership`)
  }
  const question = candidate.serialized.question
  const answer = candidate.serialized.answer
  assertCompiledMdx(question, `${contract.name} question`)
  assertCompiledMdx(answer, `${contract.name} answer`)
  try {
    const created = await prisma.problem.create({
      data: {
        contentId: task.contentId, slug: task.slug, title: task.title,
        type: task.type, difficulty: task.difficulty, href: task.href, link: task.link,
        question: candidate.text.question!, answer: candidate.text.answer!,
        serializedQuestion: question, serializedAnswer: answer,
        lesson: { connect: { id: owner.id, AND: owner.match.where } },
      },
      select: problemSelection,
    })
    return { actual: inspectCreatedTask(databaseProblem(created), candidate, owner), status: 'created' as const }
  } catch (error) {
    if (!mayHaveCreated(error)) throw error
    // Resolve only the canonical identity/unique slot. Never upsert, overwrite,
    // regenerate a UUID or continue dependent writes on an unknown receipt.
    const receipts = await prisma.problem.findMany({
      where: { OR: [{ contentId: task.contentId }, { lessonId: owner.id, slug: task.slug }] },
      select: problemSelection,
    })
    if (receipts.length !== 1) throw new Error(`${contract.name} create receipt is missing or ambiguous; dependent writes blocked`)
    return {
      actual: inspectCreatedTask(databaseProblem(receipts[0]), candidate, owner),
      status: 'already-created' as const,
    }
  }
}

export async function applyInPlaceRelease(
  plan: InPlacePlan,
  onChange: (result: ChangeResult) => void = () => {},
): Promise<ChangeResult[]> {
  const current = checkReleaseState(plan, await readReleaseCatalog())
  const after = catalogMap(plan.after)
  const results: ChangeResult[] = []
  const nativeTasks = plan.after.filter(item => item.contentId === selectedTask(plan))
  for (const creation of nativeTasks) {
    const contract = nativeTaskContract(creation.contentId)
    const owner = current.get(`lesson:${contract.lessonContentId}`)
    if (!owner) throw new Error(`${contract.name} owner is absent`)
    const existing = current.get(key(creation))
    if (!existing && !plan.creations.some(item => key(item) === key(creation))) {
      throw new Error(`Retained ${contract.name} task is missing; recreation is not permitted`)
    }
    const receipt = existing
      ? { actual: inspectCreatedTask(existing, creation, owner), status: 'already-created' as const }
      : await createCompleteTask(creation, owner)
    current.set(key(creation), receipt.actual)
    const result: ChangeResult = {
      kind: 'problem', contentId: creation.contentId, status: receipt.status, id: receipt.actual.id,
    }
    results.push(result)
    onChange(result)
  }
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
  for (const [id, actual] of current) {
    if (final.get(id)?.id !== actual.id) throw new Error(`Concurrent database identity replacement: ${id}`)
  }
  for (const creation of plan.creations) {
    const persisted = final.get(key(creation))
    if (!persisted || !sameAuthoredState(persisted, creation)) throw new Error('Native task was not fully persisted')
  }
  for (const change of plan.changes) {
    const id = key(change)
    if (!sameAuthoredState(final.get(id)!, after.get(id)!)) {
      throw new Error(`Candidate content was not fully persisted: ${id}`)
    }
  }
  return results
}

export function describeInPlacePlan(plan: InPlacePlan) {
  const inventories = {
    before: describeCatalog(plan.before),
    candidate: describeCatalog(plan.after),
  }
  const createdEntities = plan.creations.map(item => ({
    kind: item.kind, contentId: item.contentId, metadata: item.metadata,
    questionSha256: digest(item.text.question!), answerSha256: digest(item.text.answer!),
    serializedSha256: digest(JSON.stringify(item.serialized)),
  }))
  const changedEntities = plan.changes.map((change) => ({
    kind: change.kind, contentId: change.contentId, field: change.field,
    beforeSha256: digest(change.before), afterSha256: digest(change.after),
  }))
  if (plan.changeClass !== DEFAULT_CHANGE_CLASS) {
    return {
      changeClass: plan.changeClass,
      profile: plan.scope.structural?.profile,
      lesson: plan.lesson,
      allowedChangedFields: plan.scope.structural?.allowedChangedFields,
      scope: plan.scope,
      changedEntities,
      createdEntities,
      inventories,
    }
  }

  return {
    changeClass: 'independent-in-place-text-v1',
    scope: plan.scope,
    changedEntities,
    createdEntities,
    inventories,
  }
}

export {
  planInPlaceRelease as prepareContentRelease,
  applyInPlaceRelease as applyContentRelease,
}
