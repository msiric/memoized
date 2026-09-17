import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { G3B_LESSON_UID } from '@/lib/g3b-task'
import { G3C_BODY_TITLE, G3C_HEADINGS, G3C_LESSON_UID, G3C_TASK } from '@/lib/g3c-task'
import { G3C_OLD_CONTRACTS } from '@/lib/g3c-publication'
import { ADDITIVE_CHANGE_CLASS, G3C_ADDITIVE_PROFILE, STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID, assertInPlaceScope, digest, normalizeReleaseScopeOptions } from './scope'
import {
  editFixture, g3bConfigPath, g3cBodyPath, sourceFixture, syntheticAnswer,
  syntheticBody, syntheticLegacyAnswer, syntheticLegacyBody, syntheticNativeSource, syntheticQuestion, writeFixture,
} from './g3c-fixtures'

vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  const { createHash } = await import('node:crypto')
  const hash = (text: string) => createHash('sha256').update(text).digest('hex')
  return {
    ...actual,
    G3C_LEGACY_BODY_SHA256: hash(fixture.syntheticLegacyBody),
    G3C_OLD_CONTRACTS: actual.G3C_OLD_CONTRACTS.map((contract, index) => ({
      ...contract, questionSha256: hash(fixture.syntheticOldQuestion(index)), answerSha256: hash(fixture.syntheticLegacyAnswer(index)),
    })),
    assertG3cQuestion: (question: unknown) => {
      if (typeof question !== 'string' || hash(question) !== hash(fixture.syntheticQuestion)) {
        throw new Error('Synthetic complete question binding mismatch')
      }
    },
  }
})

const options = { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3C_LESSON_UID } as const
const roots: string[] = []
const fixture = (add = false, mask = 0) => {
  const root = sourceFixture(G3C_OLD_CONTRACTS, add, mask)
  roots.push(root)
  return root
}
afterEach(() => { roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })) })

describe('G3C source capability with explicit synthetic bindings, not final profile acceptance', () => {
  it('requires the exact additive selector and admits the retained-G3B no-op before G3C creation', () => {
    expect(normalizeReleaseScopeOptions(options)).toEqual(options)
    for (const lesson of ['', `/${G3C_LESSON_UID}`, `${G3C_LESSON_UID} `, `${G3C_LESSON_UID}\nmode=publish`]) {
      expect(() => normalizeReleaseScopeOptions({ ...options, lesson })).toThrow(/requires --lesson/)
    }
    expect(() => normalizeReleaseScopeOptions({ changeClass: STRUCTURAL_CHANGE_CLASS, lesson: G3C_LESSON_UID })).toThrow()
    const base = fixture()
    expect(assertInPlaceScope(base, base, options)).toMatchObject({
      changedFiles: [], structural: { profile: G3C_ADDITIVE_PROFILE, allowedChangedFields: expect.any(Array) },
    })
  })

  it('binds the complete question/setup and answer in the exact sixth-task plan', () => {
    const base = fixture(), next = fixture(true, 63)
    const scope = assertInPlaceScope(base, next, options)
    expect(scope.addition).toMatchObject({
      contentId: G3C_TASK.contentId, questionSha256: digest(syntheticQuestion), answerSha256: digest(syntheticAnswer(5)),
    })
    expect(scope.structural?.allowedChangedFields).toHaveLength(6)
    expect(scope.structural?.changedSurfaces).toHaveLength(6)
    expect(scope.structural?.changedSurfaces[0].after.h1).toEqual([G3C_BODY_TITLE])
    expect(scope.structural?.changedSurfaces[0].after.h2).toEqual(Object.entries(G3C_HEADINGS).map(([id, text]) => ({ id, text })))
    expect(scope.structural?.anchorConflictProof.fixedProblemCardAnchors).toHaveLength(6)
    expect(scope.structural?.anchorConflictProof.fixedProblemCardAnchors.at(-1)?.id).toBe(G3C_TASK.id)
  })

  it('accepts all 64 independent old/new body-plus-five-answer mixtures and retained-ID recovery', () => {
    const base = fixture(), retained = fixture(true), full = fixture(true, 63)
    for (let mask = 0; mask < 64; mask += 1) {
      const mixed = fixture(true, mask)
      const forward = assertInPlaceScope(base, mixed, options)
      expect(forward.addition?.contentId).toBe(G3C_TASK.contentId)
      expect(assertInPlaceScope(mixed, full, options).addition).toBeUndefined()
      expect(assertInPlaceScope(mixed, retained, options).addition).toBeUndefined()
    }
    const recovery = assertInPlaceScope(full, retained, options)
    expect(recovery.structural?.changedSurfaces[0].afterSha256).toBe(digest(syntheticLegacyBody))
    expect(recovery.structural?.changedSurfaces[0].after.h1).toEqual(['Legacy baseline'])
  }, 30000)

  it.each([
    ['id', 'other'], ['title', 'Different'], ['question', 'Synthetic complete question.'],
    ['type', 'THEORY'], ['difficulty', 'EASY'], ['href', 'https://example.com'],
    ['answer', ' '], ['link', G3C_TASK.link], ['order', 6], ['access', 'FREE'],
  ])('rejects a foreign/incomplete new-task %s', (field, value) => {
    const base = fixture(), next = fixture(true)
    editFixture(next, lesson => { lesson.problems[5][field] = value })
    expect(() => assertInPlaceScope(base, next, options)).toThrow()
  })

  it.each([
    (lesson: Record<string, any>) => { lesson.problems[0].question += ' changed' },
    (lesson: Record<string, any>) => { lesson.problems[0].id = 'different' },
    (lesson: Record<string, any>) => { lesson.problems[0].title = 'Different' },
    (lesson: Record<string, any>) => { lesson.problems[0].type = 'CODING' },
    (lesson: Record<string, any>) => { lesson.problems[0].difficulty = 'HARD' },
    (lesson: Record<string, any>) => { lesson.problems[0].href = 'https://example.com' },
    (lesson: Record<string, any>) => { lesson.problems.reverse() },
    (lesson: Record<string, any>) => { lesson.problems.push(syntheticNativeSource()) },
    (lesson: Record<string, any>) => { lesson.problems[5] = { ...syntheticNativeSource(), id: 'arbitrary', title: 'Arbitrary' } },
    (lesson: Record<string, any>) => { lesson.access = 'FREE' },
    (lesson: Record<string, any>) => { lesson.order = 16 },
    (lesson: Record<string, any>) => { lesson.title = G3C_BODY_TITLE },
    (lesson: Record<string, any>) => { lesson.description = 'Different' },
    (lesson: Record<string, any>) => { lesson.resources = [] },
    (lesson: Record<string, any>) => { lesson.id = '/wrong-owner' },
  ])('preserves all old question contracts, identity, lesson metadata, ownership and order %#', mutate => {
    const base = fixture(), next = fixture(true)
    editFixture(next, mutate)
    expect(() => assertInPlaceScope(base, next, options)).toThrow()
  })

  it.each([
    (body: string) => body.replace(`# ${G3C_BODY_TITLE}`, '# Unapproved H1'),
    (body: string) => body.replace(JSON.stringify(G3C_BODY_TITLE), JSON.stringify('Unapproved export')),
    (body: string) => body.replace('export const metadata = ', 'export const metadata = (() => '),
    (body: string) => body.replace('export const metadata = ', 'import x from "./x"\n\nexport const metadata = '),
    (body: string) => body.replace('"title":', '["title"]:'),
    (body: string) => body + '\nexport const other = 1\n',
    (body: string) => body + '\n{globalThis.secret}\n',
    (body: string) => body + '\n<Unknown />\n',
    (body: string) => body + '\n<Note>\n\nexport const other = 1\n\n</Note>\n',
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id={"introduction-to-coding-interviews"}'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id="introduction-to-coding-interviews" onClick="bad"'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id="introduction-to-coding-interviews" style="bad"'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id="introduction-to-coding-interviews" {...props}'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id=""'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', 'id="practice-problems"'),
    (body: string) => body.replace('id="introduction-to-coding-interviews"', `id="${G3C_TASK.id}"`),
    (body: string) => body.replace('id="understanding-algorithmic-problems"', 'id="introduction-to-coding-interviews"'),
    (body: string) => body.replace('>Frontend interview formats</h2>', '>Other visible title</h2>'),
    (body: string) => body.replace('>Frontend interview formats</h2>', '><span>Frontend interview formats</span></h2>'),
    (body: string) => body.replace('<h2 id="introduction-to-coding-interviews">', 'Inline prefix <h2 id="introduction-to-coding-interviews">'),
    (body: string) => body.replace('>Frontend interview formats</h2>', '>Frontend interview formats</h2> inline suffix'),
    (body: string) => body.replace('<h2 id="introduction-to-coding-interviews">Frontend interview formats</h2>', '**<h2 id="introduction-to-coding-interviews">Frontend interview formats</h2>**'),
    (body: string) => body + '\n```python\nprint("new Python")\n```\n',
    (body: string) => body + '\n```\nUnlabeled new panel\n```\n',
  ])('rejects unapproved body/runtime/static-heading/fence surface %#', mutate => {
    const base = fixture(), next = fixture(true, 63)
    writeFixture(next, g3cBodyPath, mutate(syntheticBody))
    expect(() => assertInPlaceScope(base, next, options)).toThrow()
  })

  it('never treats a modified legacy hash or another field as the legacy exception', () => {
    const base = fixture()
    for (const index of [-1, 0, 1, 2, 3, 4]) {
      const next = fixture(true)
      if (index === -1) writeFixture(next, g3cBodyPath, syntheticLegacyBody + '\nA changed legacy body.\n')
      else editFixture(next, lesson => { lesson.problems[index].answer = syntheticLegacyAnswer(index) + '\nChanged.\n' })
      expect(() => assertInPlaceScope(base, next, options)).toThrow(/language/)
    }
    const misplaced = fixture(true)
    editFixture(misplaced, lesson => { lesson.problems[0].answer = syntheticLegacyAnswer(1) })
    expect(() => assertInPlaceScope(base, misplaced, options)).toThrow(/language/)
  })

  const referenceDisclosure = '<details>\n<summary>Open the complete reference files</summary>\n\n### File: example.ts\n\n```typescript\nexport const value = 1\n```\n\n</details>'

  it('allows native file disclosures only in the new task with the exact summary and fully checked contents', () => {
    const base = fixture(), next = fixture(true, 63)
    editFixture(next, lesson => { lesson.problems[5].answer = referenceDisclosure })
    const scope = assertInPlaceScope(base, next, options)
    expect(scope.addition?.question.components).toContainEqual({ name: 'details', count: 1 })
    expect(scope.addition?.answer.components).toContainEqual({ name: 'details', count: 1 })
    expect(scope.addition?.answer.codeBlocks.at(-1)?.language).toBe('typescript')
    for (const index of [0, 1, 2, 3, 4]) {
      const misplaced = fixture(true, 63)
      editFixture(misplaced, lesson => { lesson.problems[index].answer += `\n\n${referenceDisclosure}` })
      expect(() => assertInPlaceScope(base, misplaced, options)).toThrow(/component/)
    }
    writeFixture(next, g3cBodyPath, `${syntheticBody}\n\n${referenceDisclosure}`)
    expect(() => assertInPlaceScope(base, next, options)).toThrow(/component/)
  })

  it.each([
    (source: string) => source.replace('<details>', '<details open>'),
    (source: string) => source.replace('<details>', '<details onToggle={run}>'),
    (source: string) => source.replace('<details>', '<details {...props}>'),
    (source: string) => source.replace('<summary>', '<summary tabIndex="0">'),
    (source: string) => source.replace('Open the complete reference files', 'Open the complete starter files'),
    (source: string) => source.replace('Open the complete reference files', '{dynamic}'),
    (source: string) => source.replace('Open the complete reference files', '<strong>Open the complete reference files</strong>'),
    (source: string) => source.replace('<summary>', 'Inline prefix <summary>'),
    (source: string) => source.replace('</summary>', '</summary> trailing text'),
    (source: string) => source.replace('### File: example.ts', '## Unapproved anchor'),
    (source: string) => source.replace('### File: example.ts', '{run()}'),
    (source: string) => source.replace('### File: example.ts', '<Unknown />'),
    (source: string) => source.replace('### File: example.ts', 'export const other = 1'),
    (source: string) => source.replace('```typescript', '```python'),
    (source: string) => source.replace('### File: example.ts', referenceDisclosure),
    (source: string) => `${source}\n\n${source}`,
  ])('rejects unsupported disclosure shape or contents %#', mutate => {
    const base = fixture(), next = fixture(true, 63)
    editFixture(next, lesson => { lesson.problems[5].answer = mutate(referenceDisclosure) })
    expect(() => assertInPlaceScope(base, next, options)).toThrow()
  })

  it('keeps both complete native disclosures through retained no-op and recovery plans', () => {
    const complete = fixture(true, 63), retained = fixture(true)
    const unchanged = assertInPlaceScope(complete, complete, options)
    expect(unchanged.changedFiles).toEqual([])
    expect(unchanged.addition).toBeUndefined()
    const recovery = assertInPlaceScope(complete, retained, options)
    expect(recovery.addition).toBeUndefined()
    expect(recovery.structural?.changedSurfaces).toHaveLength(6)
    expect(assertInPlaceScope(retained, complete, options).addition).toBeUndefined()
  })

  it('requires G3B and rejects task drops, duplicates, changes and premature dependent links', () => {
    const base = fixture(), next = fixture(true)
    const g3b = JSON.parse(fs.readFileSync(path.join(next, g3bConfigPath), 'utf8'))
    g3b.lessons[0].problems.pop()
    writeFixture(next, g3bConfigPath, JSON.stringify(g3b))
    expect(() => assertInPlaceScope(base, next, options)).toThrow(/G3B/)
    const retained = fixture(true)
    expect(() => assertInPlaceScope(retained, base, options)).toThrow(/immutable/)
    editFixture(next, lesson => { lesson.problems.push(syntheticNativeSource()) })
    expect(() => assertInPlaceScope(base, next, options)).toThrow()
    const premature = fixture()
    writeFixture(premature, g3cBodyPath, syntheticBody)
    expect(() => assertInPlaceScope(base, premature, options)).toThrow()
  })

  it('rejects new H2s in nonbody fields and links relying on another future field', () => {
    const base = fixture()
    for (const suffix of ['\n## Practice Problems\n', '\n## New answer anchor\n\n[link](#new-answer-anchor)\n',
      '\n[future](#unpublished-section)\n', '\n[external](http://example.com)\n']) {
      const next = fixture(true, 63)
      editFixture(next, lesson => { lesson.problems[0].answer += suffix })
      expect(() => assertInPlaceScope(base, next, options)).toThrow()
    }
  })

  it('keeps future default, TS and G3B scopes compatible without new G3C editing rights', () => {
    const base = fixture(true, 63), next = fixture(true, 63)
    expect(assertInPlaceScope(base, next).changedFiles).toEqual([])
    writeFixture(next, g3cBodyPath, syntheticBody.replace('A synthetic explanation', 'An independent explanation'))
    expect(assertInPlaceScope(base, next).changedFiles).toHaveLength(1)
    expect(() => assertInPlaceScope(base, next, { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3B_LESSON_UID })).toThrow()
    writeFixture(next, g3cBodyPath, syntheticBody)
    expect(assertInPlaceScope(base, next, { changeClass: ADDITIVE_CHANGE_CLASS, lesson: G3B_LESSON_UID }).changedFiles).toEqual([])
    for (const root of [base, next]) {
      writeFixture(root, 'content/js-track/typescript-introduction/_lessons.json', JSON.stringify({ lessons: [{
        id: '/ts-basics', title: 'TS Basics', problems: Array.from({ length: 5 }, (_, index) => ({
          id: `ts-${index}`, title: `TS ${index}`, question: 'Unchanged.', answer: 'Before.', type: 'THEORY', difficulty: 'EASY', href: '',
        })),
      }] }))
      writeFixture(root, `content/${STRUCTURAL_LESSON_UID}/page.mdx`, "export const metadata = { title: 'TS Basics' }\n\n# TS Basics\n\nBefore.\n")
    }
    writeFixture(next, `content/${STRUCTURAL_LESSON_UID}/page.mdx`, "export const metadata = { title: 'TS Basics' }\n\n# TS Basics\n\nAfter.\n")
    expect(assertInPlaceScope(base, next, { changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID }).changedFiles).toHaveLength(1)
    for (const field of ['question', 'answer']) {
      const edited = fixture(true, 63)
      editFixture(edited, lesson => { lesson.problems[5][field] += '\nSilently changed.\n' })
      expect(() => assertInPlaceScope(base, edited)).toThrow()
      expect(() => assertInPlaceScope(base, edited, options)).toThrow()
    }
  })
})
