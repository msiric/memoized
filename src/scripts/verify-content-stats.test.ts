import { beforeEach, describe, expect, it, vi } from 'vitest'
import { G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { G3B_TASK_METADATA, type InventoryRow } from './content-release/catalog'
import { verifyContentStats } from './verify-content-stats'

const mocks = vi.hoisted(() => ({ source: vi.fn(), prepare: vi.fn(), identities: vi.fn() }))
vi.mock('./content-release/scope', () => ({ assertKnownSourceCatalog: mocks.source }))
vi.mock('./content-release/plan', () => ({ prepareSnapshot: mocks.prepare }))
vi.mock('@/lib/content-identity', () => ({ validContentIds: mocks.identities }))

function catalog(added = false): InventoryRow[] {
  const counts = { course: 2, section: 8, lesson: 120, problem: 506, resource: 33 } as const
  const rows: InventoryRow[] = Object.entries(counts).flatMap(([kind, count]) => Array.from({ length: count }, (_, index) => {
    const contentId = kind === 'lesson' && index === 0 ? G3B_LESSON_CONTENT_ID : `/${kind}/${index}`
    return { kind: kind as InventoryRow['kind'], contentId, metadata: { contentId }, text: {}, serialized: {} }
  }))
  if (added) rows.push({
    kind: 'problem', contentId: G3B_TASK.contentId, metadata: { ...G3B_TASK_METADATA },
    text: { question: G3B_TASK.question, answer: 'Native free feedback.' },
    serialized: { question: { compiledSource: 'q' }, answer: { compiledSource: 'a' } },
  })
  return rows
}
function prepare(rows: InventoryRow[]) {
  mocks.prepare.mockResolvedValue(rows)
  mocks.identities.mockReturnValue(Object.fromEntries(['course', 'section', 'lesson', 'problem', 'resource'].map(kind => [
    kind, new Set(rows.filter(row => row.kind === kind).map(row => row.contentId)),
  ])))
}
beforeEach(() => vi.resetAllMocks())

describe('verify:stats authorized source inventory', () => {
  it.each([false, true])('validates every kind, identity and compiled record for added=%s', async added => {
    prepare(catalog(added))
    const result = await verifyContentStats('/source')
    expect(result.counts).toEqual({ courses: 2, sections: 8, lessons: 120, problems: added ? 507 : 506, resources: 33 })
    expect(mocks.source).toHaveBeenCalledWith('/source')
    expect(mocks.prepare).toHaveBeenCalledWith('/source')
    expect(mocks.identities).toHaveBeenCalledWith('/source/content')
  })
  it('fails on strict source/schema errors before any preparation', async () => {
    mocks.source.mockImplementation(() => { throw new Error('invalid source schema') })
    await expect(verifyContentStats('/source')).rejects.toThrow(/source schema/)
    expect(mocks.prepare).not.toHaveBeenCalled()
  })
  it('fails if full-catalog serialization fails, or an unrelated inventory is missing', async () => {
    prepare(catalog())
    mocks.prepare.mockRejectedValueOnce(new Error('unrelated resource compilation failed'))
    await expect(verifyContentStats('/source')).rejects.toThrow(/compilation/)
    prepare(catalog(true).filter(row => row.contentId !== '/resource/0'))
    await expect(verifyContentStats('/source')).rejects.toThrow(/resource inventory/)
  })
  it('rejects an arbitrary 507th task and canonical task with missing feedback', async () => {
    const rows = catalog(true)
    rows.at(-1)!.contentId = '/unknown/task'
    prepare(rows)
    await expect(verifyContentStats('/source')).rejects.toThrow(/problem inventory/)
    const incomplete = catalog(true)
    incomplete.at(-1)!.serialized.answer = null
    prepare(incomplete)
    await expect(verifyContentStats('/source')).rejects.toThrow(/compilation/)
  })
  it('preserves the independent authoritative identity-walk check, not just counts', async () => {
    prepare(catalog(true))
    const ids = mocks.identities()
    ids.problem.delete('/problem/0')
    ids.problem.add('/other/identity')
    await expect(verifyContentStats('/source')).rejects.toThrow(/authoritative source identities/)
  })
})
