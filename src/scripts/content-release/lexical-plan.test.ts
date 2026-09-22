import { isDeepStrictEqual } from 'node:util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LexicalPublicationBinding } from '@/lib/lexical-publication'
import {
  applyContentRelease, checkReleaseState, describeInPlacePlan, prepareContentRelease,
  readReleaseCatalog, sourceRows, type ChangeResult,
} from './plan'
import {
  ALL_UNITS, BODY_IDS, LESSON_IDS, MUTABLE, QUESTION_ID, REGRADED, RETAINED,
  lexicalBinding, lexicalDatabaseFixture, lexicalScopeFixture, lexicalSnapshot, valueHash,
} from './lexical-fixtures'
import { compileFixture, inventory, type Snapshot } from './practice-fixtures'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3C_TASK } from '@/lib/g3c-task'

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(),
  })
  return {
    binding: undefined as LexicalPublicationBinding | undefined,
    content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
    course: model(), section: model(), lesson: model(), problem: model(), resource: model(),
    problemProgress: model(), lessonProgress: model(),
  }
})
vi.mock('@/lib/lexical-publication-binding', () => ({
  get REVIEWED_LEXICAL_BINDING() { return mocks.binding },
}))
vi.mock('../sync-content', () => ({ prepareContent: mocks.content }))
vi.mock('../sync-resources', () => ({ prepareResources: mocks.resources }))
vi.mock('./scope', async original => ({
  ...(await original<typeof import('./scope')>()), assertInPlaceScope: mocks.scope,
}))
vi.mock('@/lib/g7-contracts', async original => {
  const actual = await original<typeof import('@/lib/g7-contracts')>()
  return (await import('./g7-fixtures')).bindSyntheticG7(actual)
})
vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  return { ...actual, assertG3cQuestion: (value: unknown) => {
    if (value !== fixture.syntheticQuestion) throw new Error('Synthetic retained G3C question mismatch')
  } }
})
vi.mock('@/lib/prisma', () => ({ default: {
  $transaction: mocks.transaction, course: mocks.course, section: mocks.section,
  lesson: mocks.lesson, problem: mocks.problem, resource: mocks.resource,
  problemProgress: mocks.problemProgress, lessonProgress: mocks.lessonProgress,
} }))

const options = { changeClass: 'existing-lexical-batch-v1' } as const
let live = lexicalDatabaseFixture(lexicalSnapshot())
type Update = { where: Record<string, unknown>; data: Record<string, unknown> }
function conditionalUpdate(rows: object[], { where, data }: Update) {
  const matches = rows.filter(row => Object.entries(where).every(([field, expected]) => {
    const comparison = expected && typeof expected === 'object' && Object.hasOwn(expected, 'equals')
      ? (expected as { equals: unknown }).equals : expected
    return isDeepStrictEqual(row[field as keyof typeof row], comparison)
  }))
  for (const row of matches) Object.assign(row, structuredClone(data))
  return { count: matches.length }
}
const models = () => [mocks.course, mocks.section, mocks.lesson, mocks.problem, mocks.resource,
  mocks.problemProgress, mocks.lessonProgress]
function expectNoForbiddenWrites() {
  for (const model of models()) {
    expect(model.create).not.toHaveBeenCalled()
    expect(model.upsert).not.toHaveBeenCalled()
    expect(model.deleteMany).not.toHaveBeenCalled()
  }
  for (const model of [mocks.course, mocks.section, mocks.problemProgress, mocks.lessonProgress]) {
    expect(model.updateMany).not.toHaveBeenCalled()
  }
}
function expectNoWrites() {
  for (const model of models()) expect(model.updateMany.mock.calls.length, 'writes before rejection').toBe(0)
  expectNoForbiddenWrites()
}
function expectNoDatabaseAccess() {
  expect(mocks.transaction).not.toHaveBeenCalled()
  for (const model of models()) expect(model.findMany).not.toHaveBeenCalled()
  expectNoWrites()
}
async function prepare(before: Snapshot = lexicalSnapshot(), after: Snapshot = lexicalSnapshot('after')) {
  mocks.content.mockReset().mockResolvedValueOnce(before.content).mockResolvedValueOnce(after.content)
  mocks.resources.mockReset().mockResolvedValueOnce(before.resources).mockResolvedValueOnce(after.resources)
  return prepareContentRelease('/synthetic-lexical-before', '/synthetic-lexical-candidate', options)
}
const single = (id: string) => prepare(lexicalSnapshot(), lexicalSnapshot(new Set([`assessment:${id}`])))
const findProblem = (id: string) => live[3].find(row => row.contentId === id)!
beforeEach(() => {
  vi.resetAllMocks()
  mocks.binding = lexicalBinding()
  mocks.scope.mockReturnValue(lexicalScopeFixture())
  live = lexicalDatabaseFixture(lexicalSnapshot())
  mocks.transaction.mockImplementation(async (queries, transactionOptions) => {
    expect(Array.isArray(queries)).toBe(true)
    expect(queries).toHaveLength(5)
    expect(transactionOptions).toEqual({ isolationLevel: 'RepeatableRead' })
    return structuredClone(live)
  })
  mocks.lesson.updateMany.mockImplementation(async (args: Update) => conditionalUpdate(live[2], args))
  mocks.problem.updateMany.mockImplementation(async (args: Update) => conditionalUpdate(live[3], args))
  mocks.resource.updateMany.mockImplementation(async (args: Update) => conditionalUpdate(live[4], args))
  mocks.problem.findMany.mockImplementation(({ where } = {}) => where?.OR
    ? structuredClone(live[3].filter(row => where.OR.some((item: { id?: string; contentId?: string }) =>
      item.id === row.id || item.contentId === row.contentId))) : undefined)
})

describe('lexical plans over complete prepared catalogs', () => {
  it.each(['calibrated', 'resource', 'all'] as const)('rejects omitted %s updates before any writes or receipts', async omitted => {
    const plan = await prepare()
    const original = structuredClone(live)
    plan.changes = omitted === 'all' ? [] : plan.changes.filter(change =>
      omitted === 'calibrated' ? change.contentId !== REGRADED[0] : change.contentId !== '/closure-fundamentals')
    const receipts: ChangeResult[] = []
    await expect(applyContentRelease(plan, receipt => receipts.push(receipt)))
      .rejects.toThrow('complete before/after delta')
    expectNoWrites()
    expect(receipts).toEqual([])
    expect(live).toEqual(original)
  })

  it('plans exactly 18 existing writes with three difficulty-bearing groups and no database access', async () => {
    const before = lexicalSnapshot(), after = lexicalSnapshot('after')
    const plan = await prepare(before, after)
    const sorted = (rows: ReturnType<typeof inventory>) => rows.toSorted((a, b) => `${a.kind}:${a.contentId}`.localeCompare(`${b.kind}:${b.contentId}`))
    expect(sorted(sourceRows(before.content, before.resources))).toEqual(sorted(inventory(before)))
    expect(plan.creations).toEqual([])
    expect(plan.changes).toHaveLength(18)
    expect(plan.changes.filter(row => row.field === 'body')).toHaveLength(5)
    expect(plan.changes.filter(row => row.field === 'assessment')).toHaveLength(10)
    expect(plan.changes.filter(row => row.field === 'calibrated-assessment').map(row => row.contentId)).toEqual(REGRADED)
    expect(plan.changes.map(row => `${row.field}:${row.contentId}`).sort()).toEqual([
      ...BODY_IDS.map(uid => `body:/${uid.replace(/^resources\//, '')}`),
      ...MUTABLE.map(id => `${REGRADED.includes(id) ? 'calibrated-assessment' : 'assessment'}:${id}`),
    ].sort())
    const description = describeInPlacePlan(plan)
    expect(description).toMatchObject({ changeClass: options.changeClass, profile: 'g7-scope-lookup-closures-2026-09', lesson: '' })
    expect(description.inventories.before).toEqual(description.inventories.candidate)
    expect(description.inventories.candidate.counts).toEqual({ courses: 2, sections: 8, lessons: 120, problems: 508, resources: 33 })
    expect(description.inventories.candidate.identities).toHaveLength(671)
    expect(describeInPlacePlan(await prepare())).toEqual(description)
    expectNoDatabaseAccess()
  })

  it('binds before/after difficulty in the journal description only for the three accepted regrades', async () => {
    const plan = await prepare()
    const description = describeInPlacePlan(plan)
    const calibrated = description.changedEntities.filter(row => row.field === 'calibrated-assessment')
    expect(calibrated.map(row => row.contentId)).toEqual(REGRADED)
    for (const row of calibrated) {
      expect(row).toMatchObject({ before: { type: 'THEORY', difficulty: 'MEDIUM' }, after: { type: 'THEORY', difficulty: 'EASY' } })
    }
    for (const row of description.changedEntities.filter(row => row.field === 'assessment')) {
      expect(row).toHaveProperty('before.type', 'THEORY')
      expect(row).not.toHaveProperty('after.difficulty')
    }
    const change = plan.changes.find(row => row.field === 'calibrated-assessment')!
    if (change.field !== 'calibrated-assessment') throw new Error('Missing calibrated fixture group')
    change.after.difficulty = 'MEDIUM'
    expect(valueHash(describeInPlacePlan(plan))).not.toBe(valueHash(description))
    expectNoDatabaseAccess()
  })

  it('checks source eligibility before preparation and notices a changed second source inspection', async () => {
    mocks.scope.mockImplementationOnce(() => { throw new Error('Source rejected') })
    await expect(prepare()).rejects.toThrow('Source rejected')
    expect(mocks.content).not.toHaveBeenCalled()
    expect(mocks.resources).not.toHaveBeenCalled()
    expectNoDatabaseAccess()
    const first = lexicalScopeFixture()
    mocks.scope.mockReturnValueOnce(first).mockReturnValueOnce({
      ...first, assessment: { ...first.assessment, sourceLessonAfterSha256: 'f'.repeat(64) },
    })
    await expect(prepare()).rejects.toThrow(/Source payload changed during release preparation/)
    expectNoDatabaseAccess()
  })

  it('does not allow a narrowed or wrong-field source report to authorize a complete catalog change', async () => {
    const report = lexicalScopeFixture()
    report.structural.allowedChangedFields = report.structural.allowedChangedFields.filter(row => row.contentId !== REGRADED[0])
    mocks.scope.mockReturnValue(report)
    await expect(prepare()).rejects.toThrow(/outside the selected lexical batch fields/)
    report.structural.allowedChangedFields.push({ kind: 'problem', contentId: REGRADED[0], field: 'assessment' })
    await expect(prepare()).rejects.toThrow(/outside the selected lexical batch fields/)
    expectNoDatabaseAccess()
  })

  it.each(['binding', 'title', 'type', 'fixed-question', 'grade', 'owner', 'retained-pair', 'compiled-neighbor', 'missing-native', 'new-id'])(
    'rejects prepared %s before database access', async variant => {
      const candidate = lexicalSnapshot('after')
      const target = candidate.content.problems.find(row => row.contentId === MUTABLE[0])!
      if (variant === 'binding') mocks.binding = undefined
      if (variant === 'title') target.title += ' changed'
      if (variant === 'type') target.type = 'CODING'
      if (variant === 'fixed-question') target.question += ' changed'
      if (variant === 'grade') target.difficulty = 'HARD'
      if (variant === 'owner') target.lessonContentId = '/foreign'
      if (variant === 'retained-pair') candidate.content.problems.find(row => row.contentId === RETAINED[0])!.answer += ' changed'
      if (variant === 'compiled-neighbor') candidate.resources[0].serializedBody = compileFixture('foreign')
      if (variant === 'missing-native') candidate.content.problems = candidate.content.problems.filter(row => row.contentId !== G3B_TASK.contentId)
      if (variant === 'new-id') candidate.content.problems.push({ ...target, contentId: '/foreign' })
      await expect(prepare(lexicalSnapshot(), candidate)).rejects.toThrow()
      expectNoDatabaseAccess()
    },
  )
})

describe('conditional complete updates, recovery and protected learner identities', () => {
  it('writes complete raw/compiled groups with UUID, owner, difficulty and metadata conditions', async () => {
    const initial = structuredClone(live)
    const plan = await prepare()
    const journal: ChangeResult[] = []
    await applyContentRelease(plan, receipt => { journal.push(receipt) })
    expect(mocks.lesson.updateMany).toHaveBeenCalledTimes(3)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(13)
    expect(mocks.resource.updateMany).toHaveBeenCalledTimes(2)
    expect(journal).toHaveLength(18)
    expect(journal.filter(row => row.field === 'calibrated-assessment').map(row => row.contentId)).toEqual(REGRADED)
    for (const [args] of mocks.problem.updateMany.mock.calls) {
      const old = initial[3].find(row => row.contentId === args.where.contentId)!
      const calibrated = REGRADED.includes(old.contentId)
      expect(Object.keys(args.data).sort()).toEqual([
        'question', 'answer', 'type', 'serializedQuestion', 'serializedAnswer', ...(calibrated ? ['difficulty'] : []),
      ].sort())
      expect(Object.keys(args.where).sort()).toEqual([
        'id', 'updatedAt', 'contentId', 'slug', 'title', 'href', 'link', 'difficulty', 'type',
        'lessonId', 'question', 'answer', 'serializedQuestion', 'serializedAnswer',
      ].sort())
      expect(args.where).toMatchObject({
        id: old.id, updatedAt: old.updatedAt, lessonId: old.lessonId, contentId: old.contentId,
        slug: old.slug, title: old.title, href: old.href, link: old.link,
        difficulty: old.difficulty, type: 'THEORY', question: old.question, answer: old.answer,
        serializedQuestion: { equals: old.serializedQuestion }, serializedAnswer: { equals: old.serializedAnswer },
      })
      if (calibrated) expect(args.data.difficulty).toBe('EASY')
      else expect(args.data).not.toHaveProperty('difficulty')
    }
    for (const [args] of mocks.lesson.updateMany.mock.calls) {
      const old = initial[2].find(row => row.contentId === args.where.contentId)!
      expect(Object.keys(args.data).sort()).toEqual(['body', 'serializedBody'])
      expect(args.where).toMatchObject({
        id: old.id, updatedAt: old.updatedAt, sectionId: old.sectionId, body: old.body,
        serializedBody: { equals: old.serializedBody }, title: old.title, access: old.access, order: old.order,
      })
    }
    for (const [args] of mocks.resource.updateMany.mock.calls) {
      const old = initial[4].find(row => row.contentId === args.where.contentId)!
      expect(Object.keys(args.data).sort()).toEqual(['body', 'serializedBody'])
      expect(args.where).toMatchObject({
        id: old.id, updatedAt: old.updatedAt, lessonId: old.lessonId, body: old.body,
        serializedBody: { equals: old.serializedBody }, title: old.title, access: 'FREE', order: old.order,
      })
      expect(args.where.lessonId).toBe(initial[2].find(row => row.contentId === `/${LESSON_IDS[2]}`)!.id)
    }
    expect(live).toEqual(lexicalDatabaseFixture(lexicalSnapshot('after')))
    expect(live[3].map(row => row.id)).toEqual(initial[3].map(row => row.id))
    for (const id of [...RETAINED, G3B_TASK.contentId, G3C_TASK.contentId]) {
      expect(findProblem(id)).toEqual(initial[3].find(row => row.contentId === id))
    }
    expect(live[3].filter(row => row.type === 'THEORY')).toHaveLength(316)
    expect(live[3].filter(row => row.type === 'CODING')).toHaveLength(192)
    expectNoForbiddenWrites()
  })

  it('is idempotent and supports after-to-compatible-recovery-to-after without changing UUIDs', async () => {
    for (const version of ['before', 'after', 'recovery'] as const) {
      const snapshot = lexicalSnapshot(version)
      live = lexicalDatabaseFixture(snapshot)
      expect(await applyContentRelease(await prepare(snapshot, snapshot))).toEqual([])
    }
    live = lexicalDatabaseFixture(lexicalSnapshot())
    const initialIds = live.flat().map(row => row.id)
    const forward = await prepare()
    await applyContentRelease(forward)
    const writes = mocks.lesson.updateMany.mock.calls.length + mocks.problem.updateMany.mock.calls.length + mocks.resource.updateMany.mock.calls.length
    expect((await applyContentRelease(forward)).every(row => row.status === 'already-applied')).toBe(true)
    expect(mocks.lesson.updateMany.mock.calls.length + mocks.problem.updateMany.mock.calls.length + mocks.resource.updateMany.mock.calls.length).toBe(writes)
    await applyContentRelease(await prepare(lexicalSnapshot('after'), lexicalSnapshot('recovery')))
    expect(live).toEqual(lexicalDatabaseFixture(lexicalSnapshot('recovery')))
    await applyContentRelease(await prepare(lexicalSnapshot('recovery'), lexicalSnapshot('after')))
    expect(live).toEqual(lexicalDatabaseFixture(lexicalSnapshot('after')))
    expect(live.flat().map(row => row.id)).toEqual(initialIds)
    expectNoForbiddenWrites()
  })

  it('recognizes all 18 single/complement complete live states before writing', async () => {
    const plan = await prepare()
    for (const unit of ALL_UNITS) {
      for (const selected of [new Set([unit]), new Set(ALL_UNITS.filter(other => other !== unit))]) {
        live = lexicalDatabaseFixture(lexicalSnapshot(selected))
        expect(checkReleaseState(plan, await readReleaseCatalog()).size, unit).toBe(671)
      }
    }
    expectNoWrites()
  })

  it.each(['grade-only', 'question-only', 'answer-only', 'compiled-only', 'body-hybrid', 'resource-hybrid',
    'type', 'owner', 'retained-pair', 'neighbor', 'missing-native', 'foreign-id'])(
    'rejects initial live %s before any write or progress mutation', async variant => {
      const plan = await prepare()
      const after = lexicalDatabaseFixture(lexicalSnapshot('after'))
      const calibrated = findProblem(REGRADED[0])
      if (variant === 'grade-only') calibrated.difficulty = 'EASY'
      if (variant === 'question-only') findProblem(QUESTION_ID).question = after[3].find(row => row.contentId === QUESTION_ID)!.question
      if (variant === 'answer-only') calibrated.answer = after[3].find(row => row.contentId === REGRADED[0])!.answer
      if (variant === 'compiled-only') calibrated.serializedAnswer = after[3].find(row => row.contentId === REGRADED[0])!.serializedAnswer
      if (variant === 'body-hybrid') live[2].find(row => row.contentId === `/${LESSON_IDS[0]}`)!.body = after[2].find(row => row.contentId === `/${LESSON_IDS[0]}`)!.body
      if (variant === 'resource-hybrid') live[4].find(row => row.contentId === '/lexical-scope')!.serializedBody = after[4].find(row => row.contentId === '/lexical-scope')!.serializedBody
      if (variant === 'type') calibrated.type = 'CODING'
      if (variant === 'owner') calibrated.lesson.contentId = '/foreign-owner'
      if (variant === 'retained-pair') findProblem(RETAINED[1]).answer += ' foreign'
      if (variant === 'neighbor') live[0][0].body += ' foreign'
      if (variant === 'missing-native') live[3].splice(live[3].findIndex(row => row.contentId === G3C_TASK.contentId), 1)
      if (variant === 'foreign-id') calibrated.contentId = '/foreign'
      await expect(applyContentRelease(plan)).rejects.toThrow()
      expectNoWrites()
    },
  )

  it('rejects a calibrated-assessment field on an ordinary row before any writes', async () => {
    const plan = await prepare()
    const ordinary = plan.changes.find(row => row.field === 'assessment')
    if (!ordinary || ordinary.field !== 'assessment') throw new Error('Missing ordinary group')
    Object.assign(ordinary, {
      field: 'calibrated-assessment',
      before: { ...ordinary.before, difficulty: 'MEDIUM' },
      after: { ...ordinary.after, difficulty: 'MEDIUM' },
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/Unapproved existing assessment group/)
    expectNoWrites()
  })

  it('rejects an ordinary field or unapproved difficulty on a calibrated row', async () => {
    const plan = await single(REGRADED[0])
    const change = plan.changes[0]
    if (change.field !== 'calibrated-assessment') throw new Error('Missing calibrated group')
    Object.assign(change, { field: 'assessment' })
    await expect(applyContentRelease(plan)).rejects.toThrow(/Unapproved existing assessment group/)
    expectNoWrites()
    Object.assign(change, { field: 'calibrated-assessment' })
    change.after.difficulty = 'MEDIUM'
    await expect(applyContentRelease(plan)).rejects.toThrow(/Unapproved existing assessment group/)
    expectNoWrites()
  })

  it.each([
    ['resource-after-text', /Unapproved planned text\/compilation pair/],
    ['resource-after-compiled', /Unapproved planned text\/compilation pair/],
    ['resource-before-text', /Unapproved planned text\/compilation pair/],
    ['assessment-before-payload', /Unapproved existing assessment group/],
    ['calibrated-before-grade', /Unapproved existing assessment group/],
    ['duplicate-update', /Missing, duplicate or unsupported planned update/],
    ['ungrouped-assessment', /Unapproved planned text\/compilation pair/],
    ['unselected-field', /outside the selected fields/],
    ['unexpected-creation', /Unapproved planned content creation/],
  ] as const)('preflights a malformed %s without writing preceding bodies or emitting receipts', async (variant, error) => {
    const plan = await prepare()
    const initial = structuredClone(live)
    const resource = plan.changes.find(change => change.contentId === '/closure-fundamentals')
    const ordinary = plan.changes.find(change => change.field === 'assessment')
    const calibrated = plan.changes.find(change => change.field === 'calibrated-assessment')
    if (!resource || resource.field !== 'body' || !ordinary || ordinary.field !== 'assessment' ||
        !calibrated || calibrated.field !== 'calibrated-assessment') {
      throw new Error('Missing complete lexical plan fixture groups')
    }
    expect(plan.changes.slice(0, plan.changes.indexOf(resource)).filter(change => change.kind === 'lesson')).toHaveLength(3)
    if (variant === 'resource-after-text') resource.after += ' unreviewed'
    if (variant === 'resource-after-compiled') resource.serializedAfter = compileFixture('unreviewed compiler output')
    if (variant === 'resource-before-text') resource.before += ' fabricated baseline'
    if (variant === 'assessment-before-payload') ordinary.before.answer += ' fabricated baseline'
    if (variant === 'calibrated-before-grade') calibrated.before.difficulty = 'EASY'
    if (variant === 'duplicate-update') plan.changes.push(structuredClone(resource))
    if (variant === 'ungrouped-assessment') Object.assign(ordinary, {
      field: 'answer',
      before: ordinary.before.answer,
      after: ordinary.after.answer,
      serializedAfter: ordinary.after.serializedAnswer,
    })
    if (variant === 'unselected-field') {
      if (!plan.scope.structural) throw new Error('Missing closed lexical scope fixture')
      plan.scope.structural.allowedChangedFields = plan.scope.structural.allowedChangedFields
        .filter(field => field.contentId !== resource.contentId)
    }
    if (variant === 'unexpected-creation') {
      const existing = plan.after.find(row => row.contentId === REGRADED[0])
      if (!existing) throw new Error('Missing existing calibrated candidate')
      plan.creations.push(structuredClone(existing))
    }
    const journal: ChangeResult[] = []
    await expect(applyContentRelease(plan, receipt => { journal.push(receipt) })).rejects.toThrow(error)
    expectNoWrites()
    expect(live).toEqual(initial)
    expect(journal).toEqual([])
  })
})

describe('calibrated conditional races and receipt inspection', () => {
  it.each(['zero-count', 'P1001', 'ECONNRESET'])('inspects a persisted complete same-UUID winner after %s without a second write', async outcome => {
    const plan = await single(REGRADED[0])
    const old = structuredClone(findProblem(REGRADED[0]))
    const normal = mocks.problem.updateMany.getMockImplementation()!
    mocks.problem.updateMany.mockImplementationOnce(async args => {
      await normal(args)
      if (outcome === 'zero-count') return { count: 0 }
      throw Object.assign(new Error('Lost receipt'), { code: outcome })
    })
    const journal: ChangeResult[] = []
    expect(await applyContentRelease(plan, receipt => { journal.push(receipt) })).toEqual([
      { kind: 'problem', contentId: REGRADED[0], status: 'already-applied', field: 'calibrated-assessment', id: old.id },
    ])
    expect(journal).toHaveLength(1)
    expect(findProblem(REGRADED[0]).difficulty).toBe('EASY')
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
    const inspections = mocks.problem.findMany.mock.calls.filter(([args]) => args?.where?.OR)
    expect(inspections).toHaveLength(1)
    expect(inspections[0][0].where).toEqual({ OR: [{ id: old.id }, { contentId: old.contentId }] })
    expectNoForbiddenWrites()
  })

  it.each(['missing', 'duplicate', 'before', 'uuid', 'owner', 'difficulty', 'metadata', 'question', 'answer', 'compiled-question', 'compiled-answer'])(
    'rejects a %s receipt without retries or unrelated writes', async variant => {
      const plan = await single(REGRADED[0])
      const initial = structuredClone(live)
      const receipt = lexicalDatabaseFixture(lexicalSnapshot('after'))[3].find(row => row.contentId === REGRADED[0])!
      if (variant === 'uuid') receipt.id = 'foreign-uuid'
      if (variant === 'owner') receipt.lessonId = 'foreign-owner'
      if (variant === 'difficulty') receipt.difficulty = 'MEDIUM'
      if (variant === 'metadata') receipt.title += ' foreign'
      if (variant === 'question') receipt.question += ' foreign'
      if (variant === 'answer') receipt.answer += ' foreign'
      if (variant === 'compiled-question') receipt.serializedQuestion = compileFixture('foreign')
      if (variant === 'compiled-answer') receipt.serializedAnswer = compileFixture('foreign')
      mocks.problem.updateMany.mockResolvedValueOnce({ count: 0 })
      mocks.problem.findMany.mockImplementation(({ where } = {}) => where?.OR
        ? variant === 'missing' ? [] : variant === 'duplicate' ? [receipt, receipt]
          : variant === 'before' ? [initial[3].find(row => row.contentId === REGRADED[0])!] : [receipt]
        : undefined)
      const journal: ChangeResult[] = []
      await expect(applyContentRelease(plan, item => { journal.push(item) })).rejects.toThrow(/receipt/)
      expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
      expect(mocks.lesson.updateMany).not.toHaveBeenCalled()
      expect(mocks.resource.updateMany).not.toHaveBeenCalled()
      expect(journal).toEqual([])
      expect(live).toEqual(initial)
      expectNoForbiddenWrites()
    },
  )

  it.each(['difficulty', 'compiled', 'owner', 'updatedAt'])('enforces the %s conditional clause against a between-read-and-write race', async variant => {
    const plan = await single(REGRADED[0])
    const initial = structuredClone(findProblem(REGRADED[0]))
    const normal = mocks.problem.updateMany.getMockImplementation()!
    mocks.problem.updateMany.mockImplementationOnce(async args => {
      const row = findProblem(REGRADED[0])
      if (variant === 'difficulty') row.difficulty = 'HARD'
      if (variant === 'compiled') row.serializedAnswer = compileFixture('racing output')
      if (variant === 'owner') row.lessonId = 'foreign-owner'
      if (variant === 'updatedAt') row.updatedAt = new Date('2026-09-22T00:00:01Z')
      return normal(args)
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/receipt unresolved or foreign/)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
    expect(findProblem(REGRADED[0]).answer).toBe(initial.answer)
    expectNoForbiddenWrites()
  })

  it('does not turn an arbitrary failure or ambiguous count into a successful lost-receipt result', async () => {
    const plan = await single(REGRADED[0])
    mocks.problem.updateMany.mockRejectedValueOnce(new Error('Unclassified failure'))
    await expect(applyContentRelease(plan)).rejects.toThrow('Unclassified failure')
    expect(mocks.problem.findMany.mock.calls.filter(([args]) => args?.where?.OR)).toHaveLength(0)
    mocks.problem.updateMany.mockResolvedValueOnce({ count: 2 })
    await expect(applyContentRelease(plan)).rejects.toThrow(/Ambiguous/)
    expect(mocks.problem.findMany.mock.calls.filter(([args]) => args?.where?.OR)).toHaveLength(0)
    expectNoForbiddenWrites()
  })

  it('preserves a durable complete regrade after journal failure and resumes idempotently', async () => {
    const plan = await single(REGRADED[0])
    await expect(applyContentRelease(plan, () => { throw new Error('Journal failed') })).rejects.toThrow('Journal failed')
    expect(findProblem(REGRADED[0])).toEqual(lexicalDatabaseFixture(lexicalSnapshot('after'))[3].find(row => row.contentId === REGRADED[0]))
    const receipts = await applyContentRelease(plan)
    expect(receipts[0]).toMatchObject({ status: 'already-applied', field: 'calibrated-assessment' })
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
    expectNoForbiddenWrites()
  })

  it('detects a final foreign identity or metadata replacement rather than declaring success', async () => {
    const plan = await single(REGRADED[0])
    await expect(applyContentRelease(plan, () => { findProblem(REGRADED[0]).id = 'foreign-uuid' })).rejects.toThrow(/identity replacement/)
    live = lexicalDatabaseFixture(lexicalSnapshot())
    await expect(applyContentRelease(plan, () => { findProblem(REGRADED[0]).title += ' foreign' })).rejects.toThrow(/metadata/)
    expectNoForbiddenWrites()
  })
})
