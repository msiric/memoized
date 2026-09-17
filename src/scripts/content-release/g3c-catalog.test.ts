import { describe, expect, it, vi } from 'vitest'
import { serialize } from 'next-mdx-remote-client/serialize'
import { CONTENT_STATS } from '@/constants/content-stats'
import { G3B_LESSON_CONTENT_ID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_HEADINGS, G3C_LESSON_CONTENT_ID, G3C_TASK } from '@/lib/g3c-task'
import { G3C_TASK_METADATA } from '@/lib/g3c-publication'
import { assertCompiledMdx } from '@/lib/mdx-result'
import { extractSectionsFromCompiledSource } from '@/services/section'
import { assertG3cSourceTask, assertG3cTask, catalogMap, describeCatalog, G3B_TASK_METADATA, type InventoryRow } from './catalog'
import { syntheticAnswer, syntheticBody, syntheticNativeSource, syntheticQuestion } from './g3c-fixtures'

vi.mock('@/lib/prisma', () => ({ default: {} }))

vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  return { ...actual, assertG3cQuestion: (question: unknown) => {
    if (question !== fixture.syntheticQuestion) throw new Error('Synthetic complete question binding mismatch')
  } }
})

const compiled = (text: string) => ({ compiledSource: `compiled ${text}` })
function baseline(): InventoryRow[] {
  return Object.entries({ course: 2, section: 8, lesson: 120, problem: 506, resource: 33 })
    .flatMap(([kind, count]) => Array.from({ length: count }, (_, index) => {
      const contentId = kind === 'lesson' && index < 2
        ? [G3B_LESSON_CONTENT_ID, G3C_LESSON_CONTENT_ID][index] : `/${kind}/${index}`
      return { kind: kind as InventoryRow['kind'], contentId, metadata: { contentId }, text: {}, serialized: {} }
    }))
}
function g3b(): InventoryRow {
  return { kind: 'problem', contentId: G3B_TASK.contentId, metadata: { ...G3B_TASK_METADATA },
    text: { question: G3B_TASK.question, answer: 'Retained complete G3B answer.' },
    serialized: { question: compiled(G3B_TASK.question), answer: compiled('Retained complete G3B answer.') } }
}
function g3c(): InventoryRow {
  return { kind: 'problem', contentId: G3C_TASK.contentId, metadata: { ...G3C_TASK_METADATA },
    text: { question: syntheticQuestion, answer: syntheticAnswer(5) },
    serialized: { question: compiled(syntheticQuestion), answer: compiled(syntheticAnswer(5)) } }
}

describe('complete 507/508 catalog capability with synthetic final-question binding', () => {
  it('preserves the 506 baseline and admits only retained G3B plus the exact G3C addition', () => {
    const before = describeCatalog([...baseline(), g3b()])
    const after = describeCatalog([...baseline(), g3b(), g3c()])
    expect(before.counts).toEqual({ ...CONTENT_STATS, problems: 507 })
    expect(after.counts).toEqual({ ...CONTENT_STATS, problems: 508 })
    const existing = new Set(before.identities.map(row => `${row.kind}:${row.contentId}`))
    expect(after.identities.filter(row => !existing.has(`${row.kind}:${row.contentId}`))).toEqual([
      { kind: 'problem', contentId: G3C_TASK.contentId },
    ])
    expect(describeCatalog([...baseline(), g3c(), g3b()].reverse())).toEqual(after)
  })
  it('rejects missing G3B, its incomplete payload, unknown additions, duplicate SKU and old-row substitution', () => {
    expect(() => catalogMap([...baseline(), g3c()])).toThrow(/G3B/)
    expect(() => catalogMap([...baseline(), { ...g3b(), serialized: {} }, g3c()])).toThrow()
    expect(() => catalogMap([...baseline(), g3b(), g3c(), { ...g3c(), contentId: '/extra' }])).toThrow()
    expect(() => catalogMap([...baseline(), g3b(), g3c(), g3c()])).toThrow(/Duplicate/)
    expect(() => catalogMap([...baseline().filter(row => row.contentId !== '/problem/0'), g3b(), g3c()])).toThrow(/inventory/)
    expect(() => catalogMap([...baseline(), g3b(), { ...g3c(), contentId: '/another-task' }])).toThrow()
    for (const kind of ['course', 'section', 'lesson', 'problem', 'resource']) {
      const rows = baseline()
      rows.splice(rows.findIndex(row => row.kind === kind), 1)
      expect(() => catalogMap([...rows, g3b(), g3c()])).toThrow()
    }
  })
  it.each([
    ['contentId', '/wrong'], ['slug', 'wrong'], ['title', 'Wrong'], ['type', 'THEORY'],
    ['difficulty', 'MEDIUM'], ['href', 'https://example.com'], ['link', '/wrong'],
    ['lessonContentId', '/wrong'], ['access', 'FREE'], ['order', 6],
  ])('requires exact G3C authored metadata/schema %s', (field, value) => {
    const task = g3c()
    task.metadata[field] = value
    expect(() => catalogMap([...baseline(), g3b(), task])).toThrow(/G3C/)
  })
  it('rejects incomplete/changed raw or serialized question and answer payloads', () => {
    for (const field of ['question', 'answer'] as const) {
      for (const value of ['', ' \n', undefined]) {
        const task = g3c()
        task.text[field] = value
        expect(() => assertG3cTask(task)).toThrow()
      }
      for (const value of [null, { compiledSource: '' }, { compiledSource: 'x', error: { message: 'failed' } }]) {
        const task = g3c()
        task.serialized[field] = value
        expect(() => assertG3cTask(task)).toThrow()
      }
    }
    const task = g3c()
    task.text.question = 'Synthetic complete question.'
    expect(() => assertG3cTask(task)).toThrow(/binding/)
  })
  it('serializes both complete synthetic new surfaces through actual application MDX options', async () => {
    const { mdxOptions } = await import('@/mdx/index.mjs')
    const task = g3c()
    task.serialized.question = await serialize({ source: syntheticQuestion, options: { mdxOptions, scope: {} } })
    task.serialized.answer = await serialize({ source: syntheticAnswer(5), options: { mdxOptions, scope: {} } })
    expect(() => assertG3cTask(task)).not.toThrow()
    expect(assertG3cSourceTask(syntheticNativeSource(), G3C_LESSON_CONTENT_ID)).toEqual(syntheticNativeSource())
    expect(() => assertG3cSourceTask({ ...syntheticNativeSource(), link: G3C_TASK.link }, G3C_LESSON_CONTENT_ID)).toThrow(/schema/)
    expect(() => assertG3cSourceTask(syntheticNativeSource(), '/other-owner')).toThrow(/ownership/)
  })
  it('keeps the exact publication heading IDs/titles aligned with the shared reader section extractor', async () => {
    const { mdxOptions } = await import('@/mdx/index.mjs')
    const body = await serialize({ source: syntheticBody, options: { mdxOptions, scope: {} } })
    assertCompiledMdx(body)
    expect(extractSectionsFromCompiledSource(body.compiledSource)).toEqual(
      Object.entries(G3C_HEADINGS).map(([id, title]) => ({ id, title })),
    )
  })
})
