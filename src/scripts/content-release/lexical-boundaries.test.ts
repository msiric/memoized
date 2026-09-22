import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LEXICAL_ASSESSMENTS, LEXICAL_BODIES, LEXICAL_BODY_UIDS, LEXICAL_CHANGE_CLASS,
  LEXICAL_PROFILE, LEXICAL_QUESTION, LEXICAL_QUESTION_ID, LEXICAL_REGRADED_IDS,
  isLexicalAssessment, isLexicalBody, isLexicalLesson, isLexicalRegrade,
  lexicalDifficulty, requireLexicalBinding, type LexicalPublicationBinding,
} from '@/lib/lexical-publication'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3C_TASK } from '@/lib/g3c-task'
import {
  assertLexicalPreparedCatalog, assertLexicalSource,
  lexicalProtectedPreparedHash, lexicalProtectedSourceHash,
} from './lexical-boundaries'
import {
  ALL_UNITS, APPROVED_QUESTION, BODY_IDS, EXPECTED_HEADING_IDS, LESSON_IDS,
  MUTABLE, QUESTION_ID, REGRADED, RESOURCES, RETAINED, bodyPath,
  expectedPreparedHash, expectedSourceHash, hash, lexicalBinding, lexicalDatabaseFixture,
  lexicalSnapshot, lexicalSource, valueHash,
} from './lexical-fixtures'
import { compileFixture, editSource, inventory } from './practice-fixtures'
import { catalogMap } from './catalog'

const trusted = vi.hoisted(() => ({ binding: undefined as LexicalPublicationBinding | null | undefined }))
vi.mock('@/lib/lexical-publication-binding', () => ({
  get REVIEWED_LEXICAL_BINDING() { return trusted.binding },
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

beforeEach(() => { trusted.binding = lexicalBinding() })

describe('closed lexical binding and independently enumerated fixture', () => {
  it('keeps the exact independent 5/13/3 publication inventory closed', () => {
    expect(LEXICAL_CHANGE_CLASS).toBe('existing-lexical-batch-v1')
    expect(LEXICAL_PROFILE).toBe('g7-scope-lookup-closures-2026-09')
    expect(LEXICAL_BODY_UIDS).toEqual(BODY_IDS)
    expect(Object.entries(LEXICAL_ASSESSMENTS).flatMap(([uid, ids]) => ids.map(id => `/${uid}/${id}`))).toEqual(MUTABLE)
    expect(LEXICAL_REGRADED_IDS).toEqual(REGRADED)
    expect([BODY_IDS.length, MUTABLE.length, REGRADED.length, ALL_UNITS.length]).toEqual([5, 13, 3, 18])
    expect(LEXICAL_QUESTION_ID).toBe(QUESTION_ID)
    expect(LEXICAL_QUESTION).toBe(APPROVED_QUESTION)
    expect(Object.values(EXPECTED_HEADING_IDS).flat()).toHaveLength(26)
    for (const uid of BODY_IDS) {
      expect(LEXICAL_BODIES[uid].sourcePath).toBe(bodyPath(uid))
      expect(LEXICAL_BODIES[uid].headings.map(([id]) => id)).toEqual(EXPECTED_HEADING_IDS[uid])
      expect(isLexicalBody(uid)).toBe(true)
      expect(isLexicalLesson(uid)).toBe(LESSON_IDS.some(id => id === uid))
    }
    for (const id of MUTABLE) {
      expect(isLexicalAssessment(id)).toBe(true)
      expect(isLexicalRegrade(id)).toBe(REGRADED.includes(id))
      expect(lexicalDifficulty(id, true)).toBe(REGRADED.includes(id) || id.endsWith('/temporal-dead-zone-tdz') || id.endsWith('/variable-shadowing') ? 'EASY' : 'MEDIUM')
    }
    for (const id of [...RETAINED, G3B_TASK.contentId, G3C_TASK.contentId, QUESTION_ID.slice(1), '/foreign']) {
      expect(isLexicalAssessment(id)).toBe(false)
      expect(isLexicalRegrade(id)).toBe(false)
      expect(() => lexicalDifficulty(id, false)).toThrow('Unknown lexical assessment')
    }
    for (const id of ['__proto__', 'constructor', 'resources/rate-limiting', '/resources/lexical-scope']) {
      expect(isLexicalBody(id)).toBe(false)
      expect(isLexicalLesson(id)).toBe(false)
    }
    expect(requireLexicalBinding()).toBe(trusted.binding)
  })

  it.each([
    'null', 'missing', 'base', 'source-checksum', 'prepared-checksum', 'missing-body', 'duplicate-body',
    'foreign-body', 'missing-recovery', 'extra-recovery', 'body-raw-checksum', 'body-compiled-checksum',
    'missing-assessment', 'duplicate-assessment', 'foreign-assessment', 'missing-before', 'missing-after',
    'question-checksum', 'answer-checksum', 'compiled-question-checksum', 'compiled-answer-checksum',
    'wrong-question', 'fixed-question', 'fixed-question-compilation', 'wrong-before-grade', 'wrong-after-grade',
  ])('rejects a %s binding defect', variant => {
    const binding = trusted.binding!
    const body = binding.bodies[0]
    const item = binding.assessments[0]
    if (variant === 'null') trusted.binding = null
    if (variant === 'missing') trusted.binding = undefined
    if (variant === 'base') Object.assign(binding, { sourceBase: 'f'.repeat(40) })
    if (variant === 'source-checksum') binding.protectedSourceSha256 = '0'.repeat(64)
    if (variant === 'prepared-checksum') binding.protectedPreparedSha256 = 'g'.repeat(64)
    if (variant === 'missing-body') binding.bodies.pop()
    if (variant === 'duplicate-body') binding.bodies[1] = structuredClone(body)
    if (variant === 'foreign-body') Object.assign(body, { uid: 'resources/rate-limiting' })
    if (variant === 'missing-recovery') delete body.recovery
    if (variant === 'extra-recovery') binding.bodies[4].recovery = structuredClone(body.before)
    if (variant === 'body-raw-checksum') body.after.rawSha256 = 'A'.repeat(64)
    if (variant === 'body-compiled-checksum') body.before.serializedSha256 = ''
    if (variant === 'missing-assessment') binding.assessments.pop()
    if (variant === 'duplicate-assessment') binding.assessments[1] = structuredClone(item)
    if (variant === 'foreign-assessment') item.contentId = RETAINED[0]
    if (variant === 'missing-before') Reflect.deleteProperty(item, 'before')
    if (variant === 'missing-after') Reflect.deleteProperty(item, 'after')
    if (variant === 'question-checksum') item.before.questionSha256 = 'short'
    if (variant === 'answer-checksum') item.after.answerSha256 = ''
    if (variant === 'compiled-question-checksum') item.before.serializedQuestionSha256 = '0'.repeat(64)
    if (variant === 'compiled-answer-checksum') item.after.serializedAnswerSha256 = 'Z'.repeat(64)
    if (variant === 'wrong-question') binding.assessments.find(row => row.contentId === QUESTION_ID)!.after.questionSha256 = hash('Different task')
    if (variant === 'fixed-question') item.after.questionSha256 = hash('Changed fixed question')
    if (variant === 'fixed-question-compilation') item.after.serializedQuestionSha256 = valueHash(compileFixture('Compiler drift'))
    if (variant === 'wrong-before-grade') binding.assessments.find(row => row.contentId === REGRADED[0])!.before.difficulty = 'EASY'
    if (variant === 'wrong-after-grade') binding.assessments.find(row => row.contentId === REGRADED[0])!.after.difficulty = 'MEDIUM'
    expect(() => requireLexicalBinding()).toThrow()
  })

  it('keeps all 671 source/prepared identities, native tasks and resource owners coherent', () => {
    const before = lexicalSnapshot(), after = lexicalSnapshot('after')
    expect([before.content.courses.length, before.content.sections.length, before.content.lessons.length,
      before.content.problems.length, before.resources.length]).toEqual([2, 8, 120, 508, 33])
    const oldRows = inventory(before), nextRows = inventory(after)
    expect(catalogMap(oldRows).size).toBe(671)
    expect(catalogMap(nextRows).size).toBe(671)
    expect(nextRows.map(row => `${row.kind}:${row.contentId}`)).toEqual(oldRows.map(row => `${row.kind}:${row.contentId}`))
    expect(before.content.problems.filter(row => row.type === 'THEORY')).toHaveLength(316)
    expect(after.content.problems.filter(row => row.type === 'CODING')).toHaveLength(192)
    for (const problem of before.content.problems) {
      const owner = before.content.lessons.find(lesson => lesson.contentId === problem.lessonContentId)
      expect(owner, problem.contentId).toBeDefined()
      expect(problem.contentId).toBe(`${owner!.contentId}/${problem.slug}`)
      expect(problem.link).toBe(`${owner!.href}#${problem.slug}`)
    }
    const changed = oldRows.filter((row, index) => valueHash(row) !== valueHash(nextRows[index]))
    expect(changed).toHaveLength(18)
    expect(oldRows.filter((row, index) => valueHash(row) === valueHash(nextRows[index]))).toHaveLength(653)
    for (const id of [...RETAINED, G3B_TASK.contentId, G3C_TASK.contentId]) {
      expect(nextRows.find(row => row.contentId === id)).toEqual(oldRows.find(row => row.contentId === id))
    }
    const source = lexicalSource(before)
    const config = JSON.parse(source.get('content/js-track/core-fundamentals/_lessons.json')!.toString('utf8'))
    const associations = config.lessons.find((row: { id: string }) => row.id === '/closures').resources
    const database = lexicalDatabaseFixture(before)
    for (const [index, id] of RESOURCES.entries()) {
      const resource = before.resources.find(row => row.contentId === `/${id}`)!
      expect(associations[index]).toMatchObject({ id: resource.contentId, href: resource.href, order: resource.order })
      expect(resource).toMatchObject({ lessonSlug: 'closures', access: 'FREE' })
      expect(database[4].find(row => row.contentId === resource.contentId)!.lessonId)
        .toBe(database[2].find(row => row.contentId === '/js-track/core-fundamentals/closures')!.id)
    }
    expect(lexicalProtectedSourceHash(source)).toBe(expectedSourceHash(source))
    expect(lexicalProtectedPreparedHash(oldRows)).toBe(expectedPreparedHash(oldRows))
    for (const snapshot of [before, after, lexicalSnapshot('recovery')]) {
      expect(() => assertLexicalSource(lexicalSource(snapshot))).not.toThrow()
      expect(() => assertLexicalPreparedCatalog(inventory(snapshot))).not.toThrow()
      expect(lexicalProtectedSourceHash(lexicalSource(snapshot))).toBe(trusted.binding!.protectedSourceSha256)
      expect(lexicalProtectedPreparedHash(inventory(snapshot))).toBe(trusted.binding!.protectedPreparedSha256)
    }
  })
})

describe('complete lexical unit boundaries rather than arbitrary field mixtures', () => {
  it('accepts all 18 single units and 18 complements without changing the trusted binding', () => {
    const saved = structuredClone(trusted.binding)
    for (const unit of ALL_UNITS) {
      for (const selected of [new Set([unit]), new Set(ALL_UNITS.filter(other => other !== unit))]) {
        const snapshot = lexicalSnapshot(selected)
        expect(() => assertLexicalSource(lexicalSource(snapshot)), unit).not.toThrow()
        expect(() => assertLexicalPreparedCatalog(inventory(snapshot)), unit).not.toThrow()
      }
    }
    expect(trusted.binding).toEqual(saved)
  })

  it('rejects each incomplete changed-field cross-product for the clarified question and three regrades', () => {
    const before = lexicalSnapshot(), after = lexicalSnapshot('after')
    for (const id of [QUESTION_ID, ...REGRADED]) {
      const old = before.content.problems.find(row => row.contentId === id)!
      const next = after.content.problems.find(row => row.contentId === id)!
      const fields = id === QUESTION_ID
        ? ['question', 'answer', 'serializedQuestion', 'serializedAnswer'] as const
        : ['difficulty', 'answer', 'serializedAnswer'] as const
      for (let mask = 1; mask < 2 ** fields.length - 1; mask++) {
        const snapshot = lexicalSnapshot()
        const row = snapshot.content.problems.find(row => row.contentId === id)!
        fields.forEach((field, bit) => Object.assign(row, { [field]: mask & (1 << bit) ? next[field] : old[field] }))
        expect(() => assertLexicalPreparedCatalog(inventory(snapshot)), `${id}:${mask}`).toThrow(/complete bound version/)
      }
      const rawFields = id === QUESTION_ID ? ['question', 'answer'] as const : ['difficulty', 'answer'] as const
      for (const field of rawFields) {
        const snapshot = lexicalSnapshot()
        Object.assign(snapshot.content.problems.find(row => row.contentId === id)!, { [field]: next[field] })
        expect(() => assertLexicalSource(lexicalSource(snapshot)), `${id}:${field}`).toThrow(/complete bound assessment/)
      }
    }
  })

  it('keeps every ordinary answer paired with compilation and every body paired with compilation', () => {
    const before = lexicalSnapshot(), after = lexicalSnapshot('after')
    for (const id of MUTABLE.filter(id => id !== QUESTION_ID && !REGRADED.includes(id))) {
      for (const field of ['answer', 'serializedAnswer'] as const) {
        const snapshot = lexicalSnapshot()
        const next = after.content.problems.find(row => row.contentId === id)!
        Object.assign(snapshot.content.problems.find(row => row.contentId === id)!, { [field]: next[field] })
        expect(() => assertLexicalPreparedCatalog(inventory(snapshot)), `${id}:${field}`).toThrow(/complete bound version/)
      }
    }
    for (const uid of BODY_IDS) {
      const contentId = `/${uid.replace(/^resources\//, '')}`
      for (const layer of ['text', 'serialized'] as const) {
        const rows = inventory(after)
        const old = inventory(before).find(row => row.contentId === contentId)!
        rows.find(row => row.contentId === contentId)![layer].body = old[layer].body
        expect(() => assertLexicalPreparedCatalog(rows), `${uid}:${layer}`).toThrow(/raw\/compiled pair/)
      }
    }
  })

  it.each(['title', 'type', 'difficulty', 'href', 'link', 'lessonContentId', 'unknown', 'access', 'order', 'sectionContentId', 'resource-owner'])(
    'freezes prepared %s independently of the selected payload fields', field => {
      const rows = inventory(lexicalSnapshot('after'))
      const target = field === 'resource-owner' ? rows.find(row => row.contentId === '/lexical-scope')!
        : ['access', 'order', 'sectionContentId'].includes(field) ? rows.find(row => row.contentId === `/${LESSON_IDS[0]}`)!
          : rows.find(row => row.contentId === MUTABLE[0])!
      target.metadata[field === 'resource-owner' ? 'lessonSlug' : field] = field === 'order' ? 10000 : 'foreign'
      expect(() => assertLexicalPreparedCatalog(rows)).toThrow()
    },
  )

  it('accounts for the exact 653 protected records and rejects representative raw/compiled drift', () => {
    const rows = inventory(lexicalSnapshot('after'))
    const selected = new Set([
      ...BODY_IDS.map(uid => `${uid.startsWith('resources/') ? 'resource' : 'lesson'}:/${uid.replace(/^resources\//, '')}`),
      ...MUTABLE.map(id => `problem:${id}`),
    ])
    const protectedRows = rows.filter(row => !selected.has(`${row.kind}:${row.contentId}`))
    expect(protectedRows).toHaveLength(653)
    expect(protectedRows).toEqual(inventory(lexicalSnapshot()).filter(row => !selected.has(`${row.kind}:${row.contentId}`)))
    const neighborLesson = rows.find(row => row.kind === 'lesson' && row.contentId.includes('/frozen-'))!
    const neighborProblem = rows.find(row => row.kind === 'problem' && row.contentId.includes('/frozen-problem-'))!
    for (const id of [...RETAINED, G3B_TASK.contentId, G3C_TASK.contentId, '/fixture-resource-0', '/js-track',
      '/js-track/core-fundamentals', neighborLesson.contentId, neighborProblem.contentId]) {
      for (const layer of ['text', 'serialized'] as const) {
        const copy = structuredClone(rows), target = copy.find(row => row.contentId === id)!
        const field = target.kind === 'problem' ? 'answer' : 'body'
        Object.assign(target[layer], { [field]: layer === 'text' ? 'foreign' : compileFixture('foreign') })
        expect(() => assertLexicalPreparedCatalog(copy), `${id}:${layer}`).toThrow()
      }
    }
  })

  it.each(['title', 'type', 'fixed-question', 'unapproved-grade', 'access', 'order', 'owner', 'resource-association', 'retained-pair', 'problem-order', 'lesson-order'])(
    'freezes source %s outside the exact accepted slots', variant => {
      const files = lexicalSource(lexicalSnapshot('after'))
      editSource(files, LESSON_IDS[0], lesson => {
        const problem = lesson.problems.find(row => row.id === 'understanding-hoisting')!
        if (variant === 'title') problem.title += ' changed'
        if (variant === 'type') problem.type = 'CODING'
        if (variant === 'fixed-question') problem.question += ' changed'
        if (variant === 'unapproved-grade') problem.difficulty = 'EASY'
        if (variant === 'access') lesson.access = 'PREMIUM'
        if (variant === 'order') lesson.order++
        if (variant === 'owner') lesson.id = '/foreign'
        if (variant === 'retained-pair') lesson.problems[0].answer += ' changed'
        if (variant === 'problem-order') lesson.problems.reverse()
      })
      if (variant === 'resource-association') editSource(files, LESSON_IDS[2], lesson => { lesson.resources = [] })
      if (variant === 'lesson-order') {
        const file = 'content/js-track/core-fundamentals/_lessons.json'
        const config = JSON.parse(files.get(file)!.toString('utf8'))
        config.lessons.reverse()
        files.set(file, Buffer.from(JSON.stringify(config)))
      }
      expect(() => assertLexicalSource(files)).toThrow()
    },
  )

  it.each(['binary', 'new-file', 'deleted-file', 'missing-body', 'foreign-resource', 'missing-assessment', 'duplicate-assessment', 'empty-answer'])(
    'rejects %s source drift', variant => {
      const files = lexicalSource(lexicalSnapshot())
      const opaque = 'resources/fixture-resource-0/opaque.bin'
      if (variant === 'binary') {
        const changed = Buffer.from([0xff, 0x81, 0x00])
        expect(changed.toString('utf8')).toBe(files.get(opaque)!.toString('utf8'))
        files.set(opaque, changed)
      }
      if (variant === 'new-file') files.set('resources/extra.bin', Buffer.from('extra'))
      if (variant === 'deleted-file') files.delete(opaque)
      if (variant === 'missing-body') files.delete(bodyPath(BODY_IDS[4]))
      if (variant === 'foreign-resource') files.set('resources/fixture-resource-0/page.mdx', Buffer.from('# Foreign'))
      if (['missing-assessment', 'duplicate-assessment', 'empty-answer'].includes(variant)) {
        editSource(files, LESSON_IDS[1], lesson => {
          if (variant === 'missing-assessment') lesson.problems.pop()
          if (variant === 'duplicate-assessment') lesson.problems.push({ ...lesson.problems[0] })
          if (variant === 'empty-answer') lesson.problems[0].answer = ''
        })
      }
      expect(() => assertLexicalSource(files)).toThrow()
    },
  )

  it.each(['missing', 'duplicate', 'new', 'renamed', 'native-missing'])('rejects %s prepared identity drift', variant => {
    const rows = inventory(lexicalSnapshot())
    const index = rows.findIndex(row => row.contentId === (variant === 'native-missing' ? G3C_TASK.contentId : MUTABLE[0]))
    if (variant === 'missing' || variant === 'native-missing') rows.splice(index, 1)
    if (variant === 'duplicate') rows.push(structuredClone(rows[index]))
    if (variant === 'new') rows.push({ ...structuredClone(rows[index]), contentId: '/foreign' })
    if (variant === 'renamed') rows[index].contentId = '/renamed'
    expect(() => assertLexicalPreparedCatalog(rows)).toThrow()
  })
})
