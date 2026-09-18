import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  G7_CHANGE_CLASS, G7_CONFIG_PATH, G7_CONTRACTS, G7_DATA_TYPES, G7_TYPE_COERCION,
  G7_PROFILE, G7_REVIEWED_BINDINGS, assertG7SourceLesson, g7Digest, g7ValueHash, requireG7Binding,
  type G7LessonUid,
} from '@/lib/g7-contracts'
import { assertInPlaceScope } from './scope'
import { editG7Source, g7SourceFixture, setSyntheticG7SourceState, syntheticG7Body, syntheticG7Lesson } from './g7-fixtures'
import { writeFixture } from './g3c-fixtures'

vi.mock('@/lib/g7-contracts', async original => {
  const actual = await original<typeof import('@/lib/g7-contracts')>()
  const fixture = await import('./g7-fixtures')
  return fixture.bindSyntheticG7(actual)
})
vi.mock('@/lib/g3c-publication', async original => {
  const actual = await original<typeof import('@/lib/g3c-publication')>()
  const fixture = await import('./g3c-fixtures')
  const { createHash } = await import('node:crypto')
  return {
    ...actual,
    G3C_OLD_CONTRACTS: actual.G3C_OLD_CONTRACTS.map((contract, index) => ({
      ...contract, questionSha256: createHash('sha256').update(fixture.syntheticOldQuestion(index)).digest('hex'),
    })),
    assertG3cQuestion: (value: unknown) => {
      if (value !== fixture.syntheticQuestion) throw new Error('Synthetic retained G3C question mismatch')
    },
  }
})

const roots: string[] = []
const originalContracts = structuredClone(G7_CONTRACTS)
const originalBindings = structuredClone(G7_REVIEWED_BINDINGS)
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
  Object.assign(G7_CONTRACTS, structuredClone(originalContracts))
  Object.assign(G7_REVIEWED_BINDINGS, structuredClone(originalBindings))
})
function fixture(lesson: G7LessonUid = G7_DATA_TYPES) {
  const before = g7SourceFixture(G7_CONTRACTS, lesson)
  const after = g7SourceFixture(G7_CONTRACTS, lesson, true)
  roots.push(before, after)
  return { before, after, options: { changeClass: G7_CHANGE_CLASS, lesson } as const }
}
function bindBody(root: string, lesson: G7LessonUid, text: string) {
  writeFixture(root, `content/${lesson}/page.mdx`, text)
  requireG7Binding(lesson).bodySha256 = g7Digest(text)
}
function rebindSource(root: string, lesson: G7LessonUid, index = 0) {
  const source = JSON.parse(fs.readFileSync(path.join(root, G7_CONFIG_PATH), 'utf8')).lessons[index]
  requireG7Binding(lesson).sourceLessonSha256 = g7ValueHash(source)
}

describe('G7 scope with explicitly synthetic complete bindings (not candidate acceptance)', () => {
  it.each([G7_DATA_TYPES, G7_TYPE_COERCION] as const)('preserves all identities and supports forward/no-op/reverse %s sources', lesson => {
    const { before, after, options } = fixture(lesson)
    const result = assertInPlaceScope(before, after, options)
    expect(result.structural).toMatchObject({
      changeClass: G7_CHANGE_CLASS, profile: G7_PROFILE, lesson,
      allowedChangedFields: expect.arrayContaining([{ kind: 'lesson', lesson, contentId: `/${lesson}`,
        sourcePath: `content/${lesson}/page.mdx`, field: 'body' }]),
    })
    expect(result.assessment?.bindingSha256).toBe(g7ValueHash(requireG7Binding(lesson)))
    expect(result.structural?.changedSurfaces).toHaveLength(lesson === G7_DATA_TYPES ? 9 : 8)
    expect(assertInPlaceScope(after, after, options).changedFiles).toEqual([])
    expect(assertInPlaceScope(after, before, options).structural?.profile).toBe(G7_PROFILE)
  })
  it('admits all 128 Data Types source mixtures and selective reverse scopes without rebinding the complete candidate', () => {
    const { before, after, options } = fixture()
    const mixed = g7SourceFixture(G7_CONTRACTS, G7_DATA_TYPES)
    roots.push(mixed)
    const binding = structuredClone(requireG7Binding(G7_DATA_TYPES))
    const beforeLesson = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], false)
    const afterLesson = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], true)
    for (let mask = 0; mask < 128; mask++) {
      setSyntheticG7SourceState(mixed, G7_CONTRACTS, G7_DATA_TYPES, mask)
      const source = {
        ...beforeLesson,
        problems: beforeLesson.problems.map((problem, index) => mask & (1 << (index + 1)) ? afterLesson.problems[index] : problem),
      }
      expect(assertG7SourceLesson(source, G7_DATA_TYPES)).toBe(mask < 2 ? 'before' : mask >= 126 ? 'after' : 'mixed')
      for (const base of [before, after]) {
        const result = assertInPlaceScope(base, mixed, options)
        expect(result.assessment?.sourceLessonAfterSha256).toBe(g7ValueHash(source))
        expect(result.assessment?.bindingSha256).toBe(g7ValueHash(binding))
        expect(result.structural?.anchorConflictProof.fixedProblemCardAnchors.map(item => item.id))
          .toEqual(G7_CONTRACTS[G7_DATA_TYPES].problems.map(problem => problem.id))
      }
    }
    expect(requireG7Binding(G7_DATA_TYPES)).toEqual(binding)
  })
  it.each([
    { index: 1, mask: 1 }, { index: 1, mask: 2 },
    ...[1, 2, 3, 4, 5, 6].map(mask => ({ index: 5, mask })),
  ])('rejects a paired assessment hybrid in an otherwise valid source mixture: %j', ({ index, mask }) => {
    const { before, after, options } = fixture()
    const original = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], false).problems[index]
    const reviewed = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], true).problems[index]
    setSyntheticG7SourceState(after, G7_CONTRACTS, G7_DATA_TYPES, 43)
    editG7Source(after, lesson => {
      lesson.problems[index] = {
        ...original,
        question: mask & 1 ? reviewed.question : original.question,
        answer: mask & 2 ? reviewed.answer : original.answer,
        type: mask & 4 ? reviewed.type : original.type,
      }
    })
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/one complete frozen or reviewed assessment/)
  })
  it('retains the complete-candidate checksum gate for an all-after lesson and the frozen checksum for all-before', () => {
    const { before, after, options } = fixture()
    requireG7Binding(G7_DATA_TYPES).sourceLessonSha256 = 'f'.repeat(64)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/complete source lesson checksum/)
    Object.assign(G7_REVIEWED_BINDINGS, structuredClone(originalBindings))
    G7_CONTRACTS[G7_DATA_TYPES].sourceLessonSha256 = 'e'.repeat(64)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/complete source lesson checksum/)
  })
  it('hashes only the selected complete lesson object, not an arbitrary shared configuration checkpoint', () => {
    const { before, after, options } = fixture()
    editG7Source(after, lesson => { lesson.description += ' unrelated change' }, 1)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/shared configuration neighbors/)
  })
  it.each(['metadata', 'access', 'order', 'resources', 'removed', 'added', 'ordering', 'title', 'difficulty', 'href', 'question', 'answer', 'type'])(
    'rejects an unbound %s change before preparing any database payload', variant => {
      const { before, after, options } = fixture()
      editG7Source(after, lesson => {
        if (variant === 'metadata') lesson.description += ' changed'
        if (variant === 'access') Object.assign(lesson, { access: 'PREMIUM' })
        if (variant === 'order') lesson.order++
        if (variant === 'resources') Object.assign(lesson, { resources: [] })
        if (variant === 'removed') lesson.problems.pop()
        if (variant === 'added') lesson.problems.push({ ...lesson.problems[0], id: 'foreign-question' })
        if (variant === 'ordering') lesson.problems.reverse()
        if (variant === 'title') lesson.problems[0].title += ' changed'
        if (variant === 'difficulty') lesson.problems[5].difficulty = 'EASY'
        if (variant === 'href') lesson.problems[0].href = 'https://example.test'
        if (variant === 'question') lesson.problems[0].question += ' changed'
        if (variant === 'answer') lesson.problems[1].answer += ' unreviewed tail'
        if (variant === 'type') lesson.problems[0].type = 'CODING'
      })
      expect(() => assertInPlaceScope(before, after, options)).toThrow()
    },
  )
  it('rejects unrelated files, missing native tasks and changed retained native answers', () => {
    const { before, after, options } = fixture()
    const body = `content/${G7_TYPE_COERCION}/page.mdx`
    const original = fs.readFileSync(path.join(after, body), 'utf8')
    writeFixture(after, body, original + '\nforeign change')
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/outside the selected/)
    writeFixture(after, body, original)
    const native = 'content/js-track/frontend-development/_lessons.json'
    const config = JSON.parse(fs.readFileSync(path.join(after, native), 'utf8'))
    config.lessons[0].problems.at(-1).answer += ' changed'
    writeFixture(after, native, JSON.stringify(config))
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/immutable retained/)
    config.lessons[0].problems.pop()
    writeFixture(after, native, JSON.stringify(config))
    expect(() => assertInPlaceScope(before, after, options)).toThrow()
  })
  it('rejects added/removed payload files and a duplicate selected lesson object', () => {
    const { before, after, options } = fixture()
    writeFixture(after, 'resources/unapproved/page.mdx', '# Unapproved resource')
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/add, remove or move/)
    fs.rmSync(path.join(after, 'resources/unapproved'), { recursive: true })
    const filename = path.join(after, G7_CONFIG_PATH)
    const config = JSON.parse(fs.readFileSync(filename, 'utf8'))
    config.lessons.push(config.lessons[0])
    fs.writeFileSync(filename, JSON.stringify(config))
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/exactly one selected/)
    config.lessons.pop()
    fs.writeFileSync(filename, JSON.stringify(config))
    fs.rmSync(path.join(after, `content/${G7_DATA_TYPES}/page.mdx`))
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/add, remove or move/)
  })
  it('rejects binding an unapproved question, type, problem, or incomplete hash set', () => {
    const { before, after, options } = fixture()
    const binding = requireG7Binding(G7_DATA_TYPES)
    const frozen = structuredClone(binding)
    for (const change of [
      () => { binding.problems[0].questionSha256 = 'a'.repeat(64) },
      () => { binding.problems[0].type = 'CODING' },
      () => { binding.problems[1].id = 'other-question' },
      () => { binding.problems.pop() },
      () => { binding.problems[5].serializedAnswerSha256 = '' },
      () => { binding.bodySha256 = '' },
    ]) {
      change()
      expect(() => assertInPlaceScope(before, after, options)).toThrow()
      Object.assign(binding, structuredClone(frozen))
    }
  })
  it('rejects new question with old feedback or CODING with the old unprepared task even when the source checksum is supplied', () => {
    const { before, after, options } = fixture()
    const old = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], false)
    editG7Source(after, lesson => { lesson.problems[5].answer = old.problems[5].answer })
    rebindSource(after, G7_DATA_TYPES)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/complete frozen or reviewed assessment/)
  })
  it.each([
    '\nimport Example from "foreign"\n',
    '\n{dangerous()}\n',
    '\n<div>unapproved HTML</div>\n',
    '\n<details>\n<summary>Files</summary>\n\nText.\n\n</details>\n',
    '\n![remote](https://example.test/image.png)\n',
    '\n<Note title="extra">\n\nText.\n\n</Note>\n',
    '\n```jsx\nconst Example = () => <div />\n```\n',
    '\n```javascript {{ exec: false }}\nconst example = 1\n```\n',
    '\n<CodeGroup>\n\n```js\n1\n```\n\n```javascript\n2\n```\n\n</CodeGroup>\n',
  ])('still rejects unapproved runtime/surface syntax after explicit synthetic rebinding: %s', extra => {
    const { before, after, options } = fixture()
    bindBody(after, G7_DATA_TYPES, syntheticG7Body(G7_CONTRACTS[G7_DATA_TYPES], true) + extra)
    expect(() => assertInPlaceScope(before, after, options)).toThrow()
  })
  it.each([
    (text: string) => text.replace('# Data Types', '# Renamed'),
    (text: string) => text.replace('"title":"Data Types"', '"title":"Renamed"'),
    (text: string) => text.replace('"description":"Predict', '"description":"Changed Predict'),
    (text: string) => text.replace('id="arrays"', 'id="renamed-arrays"'),
    (text: string) => text.replace('Array operations for this task', 'Other title'),
    (text: string) => text.replace('id="arrays"', 'id={"arrays"}'),
    (text: string) => text.replace('id="arrays"', 'id="arrays" onClick={run}'),
  ])('requires the approved H1, export metadata and same-parser static H2 mapping', mutate => {
    const { before, after, options } = fixture()
    bindBody(after, G7_DATA_TYPES, mutate(syntheticG7Body(G7_CONTRACTS[G7_DATA_TYPES], true)))
    expect(() => assertInPlaceScope(before, after, options)).toThrow()
  })
  it('allows plain Markdown, Note and distinct plain JS/TS/text/bash/json panels without expanding the component set', () => {
    const { before, after, options } = fixture()
    bindBody(after, G7_DATA_TYPES, syntheticG7Body(G7_CONTRACTS[G7_DATA_TYPES], true) + `
<Note>

An ordinary note.

</Note>

<CodeGroup>

\`\`\`javascript
const value = 1
\`\`\`

\`\`\`typescript
const value: number = 1
\`\`\`

</CodeGroup>

\`\`\`text
plain output
\`\`\`

\`\`\`bash
node example.js
\`\`\`

\`\`\`json
{"value":1}
\`\`\`
`)
    expect(assertInPlaceScope(before, after, options).structural?.changedSurfaces[0].after.codeBlocks).toHaveLength(5)
  })
  it('admits exactly the two named frozen Coercion collisions before/recovery and rejects a near-hash or third collision', () => {
    const { before, after, options } = fixture(G7_TYPE_COERCION)
    expect(assertInPlaceScope(before, after, options).structural?.anchorConflictProof.fixedProblemCardAnchors
      .filter(item => ['truthy-and-falsy-values', 'the-operators-dual-nature'].includes(item.id))).toHaveLength(2)
    expect(assertInPlaceScope(after, before, options).structural?.profile).toBe(G7_PROFILE)
    const file = `content/${G7_TYPE_COERCION}/page.mdx`
    const legacy = fs.readFileSync(path.join(before, file), 'utf8')
    writeFixture(before, file, legacy + '\n')
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/body differs/)
    // A reviewed candidate checksum cannot turn legacy collisions into a new-body allowance.
    bindBody(before, G7_TYPE_COERCION, legacy + '\n')
    expect(() => assertInPlaceScope(before, after, options)).toThrow()
  })
  it('does not allow a third collision even in an explicitly mocked frozen legacy body', () => {
    const { before, after, options } = fixture(G7_TYPE_COERCION)
    const file = `content/${G7_TYPE_COERCION}/page.mdx`
    const body = fs.readFileSync(path.join(before, file), 'utf8') + '\n<h2 id="nan-semantics">An extra synthetic collision</h2>\n'
    writeFixture(before, file, body)
    G7_CONTRACTS[G7_TYPE_COERCION].bodySha256 = g7Digest(body)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/collides with fixed/)
  })
  it('retains pairwise cross-surface anchor and link checks for changed assessments', () => {
    const { before, after, options } = fixture()
    editG7Source(after, lesson => { lesson.problems[1].question += '\n\n## Arrays\n' })
    rebindSource(after, G7_DATA_TYPES)
    requireG7Binding(G7_DATA_TYPES).problems[1].questionSha256 =
      g7Digest(syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], true).problems[1].question + '\n\n## Arrays\n')
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/anchors collide/)
  })
  it('does not permit candidate-only cross-surface links in an otherwise bound answer', () => {
    const { before, after, options } = fixture()
    const answer = syntheticG7Lesson(G7_CONTRACTS[G7_DATA_TYPES], true).problems[0].answer + '\n[Unsafe dependency](#candidate-only)\n'
    editG7Source(after, lesson => { lesson.problems[0].answer = answer })
    rebindSource(after, G7_DATA_TYPES)
    requireG7Binding(G7_DATA_TYPES).problems[0].answerSha256 = g7Digest(answer)
    expect(() => assertInPlaceScope(before, after, options)).toThrow(/not a rendered anchor/)
  })
})
