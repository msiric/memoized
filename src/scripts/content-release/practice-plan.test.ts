import { isDeepStrictEqual } from 'node:util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticePublicationBinding } from '@/lib/practice-publication'
import {
  applyContentRelease, checkReleaseState, describeInPlacePlan,
  prepareContentRelease, readReleaseCatalog, sourceRows, type ChangeResult,
} from './plan'
import {
  ALL_UNITS, ASSESSMENTS, EXPECTED_LESSONS, TC, expectedIds,
  compileFixture, databaseFixture, inventory, practiceBinding, practiceSnapshot,
  scopeFixture, type Snapshot,
} from './practice-fixtures'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3C_TASK } from '@/lib/g3c-task'

const mocks = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(),
  })
  return {
    binding: undefined as PracticePublicationBinding | undefined,
    content: vi.fn(), resources: vi.fn(), scope: vi.fn(), transaction: vi.fn(),
    course: model(), section: model(), lesson: model(), problem: model(), resource: model(),
    problemProgress: model(), lessonProgress: model(),
  }
})
vi.mock('@/lib/practice-publication-binding', () => ({
  get REVIEWED_PRACTICE_BINDING() { return mocks.binding },
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

const options = { changeClass: 'existing-practice-batch-v1' } as const
let live = databaseFixture(practiceSnapshot())
type Update = { where: Record<string, unknown>; data: Record<string, unknown> }
function conditionalUpdate(rows: object[], { where, data }: Update) {
  const matches = rows.filter(row => Object.entries(where).every(([field, expected]) => {
    const value = row[field as keyof typeof row]
    const comparison = expected && typeof expected === 'object' && Object.hasOwn(expected, 'equals')
      ? (expected as { equals: unknown }).equals : expected
    return isDeepStrictEqual(value, comparison)
  }))
  for (const row of matches) Object.assign(row, structuredClone(data))
  return { count: matches.length }
}
function expectNoForbiddenWrites() {
  for (const model of [mocks.course, mocks.section, mocks.lesson, mocks.problem, mocks.resource, mocks.problemProgress, mocks.lessonProgress]) {
    expect(model.create).not.toHaveBeenCalled()
    expect(model.upsert).not.toHaveBeenCalled()
    expect(model.deleteMany).not.toHaveBeenCalled()
  }
  for (const model of [mocks.course, mocks.section, mocks.resource, mocks.problemProgress, mocks.lessonProgress]) {
    expect(model.updateMany).not.toHaveBeenCalled()
  }
}
function expectNoDatabaseAccess() {
  expect(mocks.transaction).not.toHaveBeenCalled()
  for (const model of [mocks.course, mocks.section, mocks.lesson, mocks.problem, mocks.resource]) {
    expect(model.findMany).not.toHaveBeenCalled()
    expect(model.updateMany).not.toHaveBeenCalled()
  }
  expectNoForbiddenWrites()
}
async function prepare(before: Snapshot = practiceSnapshot(), after: Snapshot = practiceSnapshot('after')) {
  mocks.content.mockReset().mockResolvedValueOnce(before.content).mockResolvedValueOnce(after.content)
  mocks.resources.mockReset().mockResolvedValueOnce(before.resources).mockResolvedValueOnce(after.resources)
  return prepareContentRelease('/synthetic-practice-before', '/synthetic-practice-after', options)
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.binding = practiceBinding()
  mocks.scope.mockReturnValue(scopeFixture())
  live = databaseFixture(practiceSnapshot())
  mocks.transaction.mockImplementation(async (queries, transactionOptions) => {
    expect(Array.isArray(queries)).toBe(true)
    expect(queries).toHaveLength(5)
    expect(transactionOptions).toEqual({ isolationLevel: 'RepeatableRead' })
    return structuredClone(live)
  })
  mocks.lesson.updateMany.mockImplementation(async (args: Update) => conditionalUpdate(live[2], args))
  mocks.problem.updateMany.mockImplementation(async (args: Update) => conditionalUpdate(live[3], args))
  mocks.problem.findMany.mockImplementation(({ where } = {}) => where?.OR
    ? structuredClone(live[3].filter(row => where.OR.some((item: { id?: string; contentId?: string }) =>
      item.id === row.id || item.contentId === row.contentId))) : undefined)
})

describe('practice plans over 671 synthetic identities and conditional mock database writes', () => {
  it('plans only the exact 46 allowed units deterministically before database access', async () => {
    const before = practiceSnapshot(), after = practiceSnapshot('after')
    const plan = await prepare(before, after)
    const sort = (rows: ReturnType<typeof inventory>) => rows.toSorted((a, b) => `${a.kind}:${a.contentId}`.localeCompare(`${b.kind}:${b.contentId}`))
    expect(sort(sourceRows(before.content, before.resources))).toEqual(sort(inventory(before)))
    expect(plan.creations).toEqual([])
    expect(plan.changes.map(item => `${item.field}:${item.contentId}`).sort()).toEqual([
      ...EXPECTED_LESSONS.map(uid => `body:/${uid}`), ...ASSESSMENTS.map(id => `assessment:${id}`),
    ].sort())
    expect(plan.changes).toHaveLength(46)
    const description = describeInPlacePlan(plan)
    expect(description).toMatchObject({ changeClass: options.changeClass, profile: 'platform-practice-consistency-2026-09', lesson: '' })
    expect(description.inventories.before).toEqual(description.inventories.candidate)
    expect(description.inventories.candidate.counts).toEqual({ courses: 2, sections: 8, lessons: 120, problems: 508, resources: 33 })
    expect(description.inventories.candidate.identities).toHaveLength(671)
    expect(describeInPlacePlan(await prepare())).toEqual(description)
    expectNoDatabaseAccess()
  })

  it('writes only whole approved assessments and bodies with complete conditional guards, never creates or history writes', async () => {
    const initial = structuredClone(live)
    const plan = await prepare()
    const journal: ChangeResult[] = []
    await applyContentRelease(plan, receipt => { journal.push(receipt) })
    expect(mocks.lesson.updateMany).toHaveBeenCalledTimes(17)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(29)
    expect(journal).toHaveLength(46)
    expect(journal.filter(item => item.field === 'assessment').map(item => item.contentId).sort()).toEqual([...ASSESSMENTS].sort())
    for (const [args] of mocks.problem.updateMany.mock.calls) {
      expect(Object.keys(args.data).sort()).toEqual(['answer', 'question', 'serializedAnswer', 'serializedQuestion', 'type'])
      expect(Object.keys(args.where).sort()).toEqual([
        'id', 'updatedAt', 'contentId', 'slug', 'title', 'href', 'link', 'difficulty', 'type',
        'lessonId', 'question', 'answer', 'serializedQuestion', 'serializedAnswer',
      ].sort())
      const before = initial[3].find(row => row.contentId === args.where.contentId)!
      expect(args.where).toMatchObject({
        id: before.id, updatedAt: before.updatedAt, lessonId: before.lessonId,
        type: before.type, difficulty: before.difficulty, title: before.title, href: before.href,
        question: before.question, answer: before.answer,
        serializedQuestion: { equals: before.serializedQuestion },
        serializedAnswer: { equals: before.serializedAnswer },
      })
    }
    for (const [args] of mocks.lesson.updateMany.mock.calls) {
      expect(Object.keys(args.data).sort()).toEqual(['body', 'serializedBody'])
      const before = initial[2].find(row => row.contentId === args.where.contentId)!
      expect(args.where).toMatchObject({
        id: before.id, updatedAt: before.updatedAt, sectionId: before.sectionId,
        contentId: before.contentId, title: before.title, description: before.description,
        slug: before.slug, href: before.href, access: before.access, order: before.order,
        body: before.body, serializedBody: { equals: before.serializedBody },
      })
    }
    expect(live).toEqual(databaseFixture(practiceSnapshot('after')))
    expect(live[3].filter(row => row.type === 'THEORY')).toHaveLength(316)
    expect(live[3].filter(row => row.type === 'CODING')).toHaveLength(192)
    expect(live[3].map(row => row.id)).toEqual(initial[3].map(row => row.id))
    for (const id of [G3B_TASK.contentId, G3C_TASK.contentId]) {
      expect(live[3].find(row => row.contentId === id)).toEqual(initial[3].find(row => row.contentId === id))
    }
    expectNoForbiddenWrites()
  })

  it('supports both no-ops, idempotence and a complete reverse with original UUIDs', async () => {
    for (const state of ['before', 'after'] as const) {
      const snapshot = practiceSnapshot(state)
      const noOp = await prepare(snapshot, snapshot)
      expect(noOp.changes).toEqual([])
      live = databaseFixture(snapshot)
      expect(await applyContentRelease(noOp)).toEqual([])
    }
    live = databaseFixture(practiceSnapshot())
    const plan = await prepare()
    await applyContentRelease(plan)
    const writes = mocks.problem.updateMany.mock.calls.length + mocks.lesson.updateMany.mock.calls.length
    expect((await applyContentRelease(plan)).every(item => item.status === 'already-applied')).toBe(true)
    expect(mocks.problem.updateMany.mock.calls.length + mocks.lesson.updateMany.mock.calls.length).toBe(writes)
    const reverse = await prepare(practiceSnapshot('after'), practiceSnapshot())
    await applyContentRelease(reverse)
    expect(live).toEqual(databaseFixture(practiceSnapshot()))
    expectNoForbiddenWrites()
  })

  it('selectively reverses one complete assessment independently of its body and all other rows', async () => {
    const id = ASSESSMENTS[10]
    const restored = new Set(ALL_UNITS.filter(unit => unit !== `assessment:${id}`))
    live = databaseFixture(practiceSnapshot('after'))
    const baseline = structuredClone(live)
    const plan = await prepare(practiceSnapshot('after'), practiceSnapshot(restored))
    expect(plan.changes).toHaveLength(1)
    expect(plan.changes[0]).toMatchObject({ contentId: id, field: 'assessment' })
    await applyContentRelease(plan)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
    expect(mocks.lesson.updateMany).not.toHaveBeenCalled()
    expect(live[2]).toEqual(baseline[2])
    expect(live[3].filter(row => row.contentId !== id)).toEqual(baseline[3].filter(row => row.contentId !== id))
    expect(live).toEqual(databaseFixture(practiceSnapshot(restored)))
  })

  it('accepts 128 Coercion live states and 46 single-unit states under one unchanged full plan', async () => {
    const plan = await prepare()
    const units = [`body:${TC}`, ...expectedIds(TC).map(id => `assessment:/${TC}/${id}`)]
    for (let mask = 0; mask < 128; mask++) {
      live = databaseFixture(practiceSnapshot(new Set(units.filter((_, bit) => mask & (1 << bit)))))
      expect(checkReleaseState(plan, await readReleaseCatalog()).size, `TC ${mask}`).toBe(671)
    }
    for (const unit of ALL_UNITS) {
      live = databaseFixture(practiceSnapshot(new Set([unit])))
      expect(checkReleaseState(plan, await readReleaseCatalog()).size, unit).toBe(671)
    }
    expect(mocks.problem.updateMany).not.toHaveBeenCalled()
    expect(mocks.lesson.updateMany).not.toHaveBeenCalled()
  })

  it.each(['question', 'answer', 'type', 'serializedQuestion', 'serializedAnswer'] as const)(
    'rejects a live %s cross-product before the first write', async field => {
      const plan = await prepare()
      Object.assign(live[3][5], { [field]: databaseFixture(practiceSnapshot('after'))[3][5][field] })
      await expect(applyContentRelease(plan)).rejects.toThrow(/one bound assessment/)
      expect(mocks.lesson.updateMany).not.toHaveBeenCalled()
      expect(mocks.problem.updateMany).not.toHaveBeenCalled()
    },
  )

  it.each(['unknown-metadata', 'title', 'difficulty', 'ownership', 'compiled-neighbor', 'missing-native', 'added-id'])(
    'rejects prepared %s without a database read', async variant => {
      const candidate = practiceSnapshot('after')
      if (variant === 'unknown-metadata') Object.assign(candidate.content.problems[0], { futureMetadata: 'not approved' })
      if (variant === 'title') candidate.content.problems[0].title += ' changed'
      if (variant === 'difficulty') candidate.content.problems[0].difficulty = 'HARD'
      if (variant === 'ownership') candidate.content.problems[0].lessonContentId = '/foreign'
      if (variant === 'compiled-neighbor') candidate.resources[0].serializedBody = compileFixture('foreign')
      if (variant === 'missing-native') candidate.content.problems = candidate.content.problems.filter(row => row.contentId !== G3B_TASK.contentId)
      if (variant === 'added-id') candidate.content.problems.push({ ...candidate.content.problems[0], contentId: '/new' })
      await expect(prepare(practiceSnapshot(), candidate)).rejects.toThrow()
      expectNoDatabaseAccess()
    },
  )

  it('checks source eligibility before compilation or database access, then detects a changed second source report', async () => {
    mocks.scope.mockImplementationOnce(() => { throw new Error('synthetic source freeze rejected') })
    await expect(prepare()).rejects.toThrow('synthetic source freeze rejected')
    expect(mocks.content).not.toHaveBeenCalled()
    expect(mocks.resources).not.toHaveBeenCalled()
    expectNoDatabaseAccess()
    const before = scopeFixture()
    mocks.scope.mockReturnValueOnce(before).mockReturnValueOnce({
      ...before, assessment: { ...before.assessment, sourceLessonAfterSha256: 'f'.repeat(64) },
    })
    await expect(prepare()).rejects.toThrow(/Source payload changed during release preparation/)
    expect(mocks.content).toHaveBeenCalledTimes(2)
    expectNoDatabaseAccess()
  })

  it('rejects a missing trusted binding during preparation without consulting a database', async () => {
    mocks.binding = undefined
    await expect(prepare()).rejects.toThrow(/has not been reviewed/)
    expectNoDatabaseAccess()
  })

  it('does not let a narrowed source allowlist authorize other bound assessment changes', async () => {
    const report = scopeFixture()
    report.structural.allowedChangedFields = report.structural.allowedChangedFields.filter(item => item.contentId !== ASSESSMENTS[0])
    mocks.scope.mockReturnValue(report)
    await expect(prepare()).rejects.toThrow(/outside the selected practice batch fields/)
    expectNoDatabaseAccess()
  })

  it.each(['P1001', 'P1002', 'P1008', 'P1017', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE'])(
    'inspects an actually persisted complete row once after a lost %s receipt', async code => {
      const plan = await prepare()
      const normal = mocks.problem.updateMany.getMockImplementation()!
      mocks.problem.updateMany.mockImplementationOnce(async args => {
        await normal(args)
        throw Object.assign(new Error('lost receipt'), { code })
      })
      const receipts = await applyContentRelease(plan)
      expect(receipts.find(row => row.contentId === ASSESSMENTS[0])?.status).toBe('already-applied')
      expect(mocks.problem.updateMany).toHaveBeenCalledTimes(29)
      const lookups = mocks.problem.findMany.mock.calls.filter(([args]) => args?.where?.OR)
      expect(lookups).toHaveLength(1)
      expect(lookups[0][0].where).toEqual({ OR: [{ id: live[3][0].id }, { contentId: live[3][0].contentId }] })
      expect(live).toEqual(databaseFixture(practiceSnapshot('after')))
      expectNoForbiddenWrites()
    },
  )

  it.each(['missing', 'duplicate', 'before', 'uuid', 'owner', 'metadata', 'question', 'answer', 'compiled-question', 'compiled-answer'])(
    'fails closed after a %s racing receipt with no blind second write', async variant => {
      const plan = await prepare()
      const receipt = databaseFixture(practiceSnapshot('after'))[3][0]
      if (variant === 'uuid') receipt.id = 'foreign-uuid'
      if (variant === 'owner') receipt.lessonId = 'foreign-owner'
      if (variant === 'metadata') receipt.title += ' foreign'
      if (variant === 'question') receipt.question += ' foreign'
      if (variant === 'answer') receipt.answer += ' foreign'
      if (variant === 'compiled-question') receipt.serializedQuestion = compileFixture('foreign')
      if (variant === 'compiled-answer') receipt.serializedAnswer = compileFixture('foreign')
      mocks.problem.updateMany.mockResolvedValueOnce({ count: 0 })
      mocks.problem.findMany.mockImplementation(({ where } = {}) => where?.OR
        ? variant === 'missing' ? [] : variant === 'duplicate' ? [receipt, receipt]
          : variant === 'before' ? [databaseFixture(practiceSnapshot())[3][0]] : [receipt] : undefined)
      await expect(applyContentRelease(plan)).rejects.toThrow(/receipt/)
      expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
      expectNoForbiddenWrites()
    },
  )

  it('accepts a complete same-UUID concurrent winner but does not retry its write', async () => {
    const plan = await prepare()
    const normal = mocks.problem.updateMany.getMockImplementation()!
    mocks.problem.updateMany.mockImplementationOnce(async args => {
      await normal(args)
      return { count: 0 }
    })
    expect((await applyContentRelease(plan)).find(item => item.contentId === ASSESSMENTS[0])?.status).toBe('already-applied')
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(29)
  })

  it('enforces the compiled guard against a between-read-and-write race', async () => {
    const plan = await prepare()
    const normal = mocks.problem.updateMany.getMockImplementation()!
    mocks.problem.updateMany.mockImplementationOnce(async args => {
      live[3][0].serializedAnswer = compileFixture('racing foreign payload')
      return normal(args)
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/receipt unresolved or foreign/)
    expect(live[3][0].answer).toBe(practiceSnapshot().content.problems[0].answer)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
  })

  it('rejects a stale updatedAt conditional match even when authored fields are still the before version', async () => {
    const plan = await prepare()
    const normal = mocks.problem.updateMany.getMockImplementation()!
    mocks.problem.updateMany.mockImplementationOnce(async args => {
      live[3][0].updatedAt = new Date('2026-09-19T00:01:00Z')
      return normal(args)
    })
    await expect(applyContentRelease(plan)).rejects.toThrow(/receipt unresolved or foreign/)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
    expect(live[3][0].answer).toBe(practiceSnapshot().content.problems[0].answer)
  })

  it('preserves durable complete writes after journal failure and retries without resetting history or identities', async () => {
    const plan = await prepare()
    await expect(applyContentRelease(plan, receipt => {
      if (receipt.field === 'assessment') throw new Error('synthetic journal failed')
    })).rejects.toThrow('synthetic journal failed')
    expect(live[3][0]).toEqual(databaseFixture(practiceSnapshot('after'))[3][0])
    expect(live[3][1]).toEqual(databaseFixture(practiceSnapshot())[3][1])
    const receipts = await applyContentRelease(plan)
    expect(receipts.find(item => item.contentId === ASSESSMENTS[0])?.status).toBe('already-applied')
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(29)
    expect(live).toEqual(databaseFixture(practiceSnapshot('after')))
    expectNoForbiddenWrites()
  })

  it('does not classify an arbitrary thrown failure as a lost receipt', async () => {
    const plan = await prepare()
    mocks.problem.updateMany.mockRejectedValueOnce(new Error('unclassified failure'))
    await expect(applyContentRelease(plan)).rejects.toThrow('unclassified failure')
    expect(mocks.problem.findMany.mock.calls.filter(([args]) => args?.where?.OR)).toHaveLength(0)
    expect(mocks.problem.updateMany).toHaveBeenCalledTimes(1)
  })

  it('rejects ambiguous write counts and final foreign metadata or identity replacement', async () => {
    const plan = await prepare()
    mocks.problem.updateMany.mockResolvedValueOnce({ count: 2 })
    await expect(applyContentRelease(plan)).rejects.toThrow(/Ambiguous/)
    live = databaseFixture(practiceSnapshot())
    await expect(applyContentRelease(plan, receipt => {
      if (receipt.contentId === ASSESSMENTS.at(-1)) live[3][0].title += ' foreign'
    })).rejects.toThrow(/metadata/)
    live = databaseFixture(practiceSnapshot())
    await expect(applyContentRelease(plan, receipt => {
      if (receipt.contentId === ASSESSMENTS.at(-1)) live[3][0].id = 'foreign-uuid'
    })).rejects.toThrow(/identity replacement/)
    expectNoForbiddenWrites()
  })
})
