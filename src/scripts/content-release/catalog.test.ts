import { describe, expect, it } from 'vitest'
import { CONTENT_STATS } from '@/constants/content-stats'
import { G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { assertG3bSourceTask, catalogMap, describeCatalog, G3B_TASK_METADATA, type InventoryRow } from './catalog'

function baseline(): InventoryRow[] {
  const counts = { course: 2, section: 8, lesson: 120, problem: 506, resource: 33 } as const
  return Object.entries(counts).flatMap(([kind, count]) => Array.from({ length: count }, (_, index) => {
    const contentId = kind === 'lesson' && index === 0 ? G3B_LESSON_CONTENT_ID : `/${kind}/${index}`
    return { kind: kind as InventoryRow['kind'], contentId, metadata: { contentId }, text: {}, serialized: {} }
  }))
}
function task(): InventoryRow {
  return {
    kind: 'problem', contentId: G3B_TASK.contentId, metadata: { ...G3B_TASK_METADATA },
    text: { question: G3B_TASK.question, answer: 'Complete free answer.' },
    serialized: { question: { compiledSource: 'compiled question' }, answer: { compiledSource: 'compiled answer' } },
  }
}

describe('strict offline full-catalog inventory', () => {
  it('keeps the baseline numbers and admits exactly the complete known 506 -> 507 delta', () => {
    expect(CONTENT_STATS).toMatchObject({ courses: 2, sections: 8, lessons: 120, problems: 506, resources: 33 })
    const before = describeCatalog(baseline())
    const after = describeCatalog([...baseline(), task()])
    expect(before.counts).toEqual(CONTENT_STATS)
    expect(after.counts).toEqual({ ...CONTENT_STATS, problems: 507 })
    const beforeIds = new Set(before.identities.map(row => `${row.kind}:${row.contentId}`))
    expect(after.identities.filter(row => !beforeIds.has(`${row.kind}:${row.contentId}`))).toEqual([
      { kind: 'problem', contentId: G3B_TASK.contentId },
    ])
    expect(describeCatalog([...baseline(), task()].reverse())).toEqual(after)
  })
  it('rejects arbitrary additions, substitution at 506, a second addition and incomplete unrelated inventories', () => {
    const unknown = { ...task(), contentId: '/unapproved/task' }
    expect(() => catalogMap([...baseline(), unknown])).toThrow(/inventory/)
    const missingOld = baseline().filter(row => row.contentId !== '/problem/0')
    expect(() => catalogMap([...missingOld, task()])).toThrow(/inventory/)
    expect(() => catalogMap([...baseline(), task(), unknown])).toThrow(/inventory/)
    for (const kind of ['course', 'section', 'lesson', 'problem', 'resource']) {
      const rows = baseline()
      rows.splice(rows.findIndex(row => row.kind === kind), 1)
      expect(() => catalogMap([...rows, task()])).toThrow()
    }
    expect(() => catalogMap([...baseline(), task(), task()])).toThrow(/Duplicate/)
  })
  it.each([
    ['title', 'Wrong'], ['slug', 'wrong'], ['type', 'THEORY'], ['difficulty', 'HARD'],
    ['href', 'https://example.com'], ['link', '/wrong'], ['lessonContentId', '/other/owner'],
    ['access', 'FREE'], ['order', 4],
  ])('rejects canonical task metadata/schema mismatch %s', (field, value) => {
    const invalid = task()
    invalid.metadata[field] = value
    expect(() => catalogMap([...baseline(), invalid])).toThrow(/G3B/)
  })
  it('requires the exact question and nonempty raw and compiled free feedback', () => {
    for (const invalid of [
      { ...task(), text: { question: 'Wrong contract', answer: 'An answer' } },
      { ...task(), text: { question: G3B_TASK.question, answer: ' ' } },
      { ...task(), serialized: { question: { compiledSource: 'q' }, answer: { compiledSource: '' } } },
      { ...task(), serialized: { question: { compiledSource: 'q' }, answer: { compiledSource: 'a', error: { message: 'failed' } } } },
    ]) expect(() => catalogMap([...baseline(), invalid])).toThrow()
  })
  it('does not accept derived fields as authored schema or wrong ownership', () => {
    const source = {
      id: G3B_TASK.id, title: G3B_TASK.title, type: G3B_TASK.type, difficulty: G3B_TASK.difficulty,
      href: G3B_TASK.href, question: G3B_TASK.question, answer: 'Complete free answer.',
    }
    expect(assertG3bSourceTask(source, G3B_LESSON_CONTENT_ID)).toEqual(source)
    expect(() => assertG3bSourceTask({ ...source, link: G3B_TASK.link }, G3B_LESSON_CONTENT_ID)).toThrow(/schema/)
    expect(() => assertG3bSourceTask(source, '/different-owner')).toThrow(/ownership/)
  })
})
