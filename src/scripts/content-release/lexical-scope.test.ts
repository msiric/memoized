import path from 'node:path'
import type fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LexicalPublicationBinding } from '@/lib/lexical-publication'
import {
  assertInPlaceScope, normalizeReleaseScopeOptions, parseChangeClass, payloadFiles,
} from './scope'
import {
  ALL_UNITS, BODY_IDS, EXPECTED_HEADING_IDS, LESSON_IDS, MUTABLE, QUESTION_ID,
  REGRADED, bodyPath, hash, lexicalBinding, lexicalSnapshot, lexicalSource,
  syntheticRemaps, valueHash, type Version,
} from './lexical-fixtures'
import { compileFixture, editSource, virtualPayloadFs } from './practice-fixtures'

type FsModule = typeof fs & { default: typeof fs }
const state = vi.hoisted(() => ({
  binding: undefined as LexicalPublicationBinding | undefined,
  fs: undefined as typeof fs | undefined,
  remaps: undefined as ReturnType<typeof syntheticRemaps> | undefined,
}))
vi.mock('@/lib/lexical-publication-binding', () => ({
  get REVIEWED_LEXICAL_BINDING() { return state.binding },
}))
vi.mock('@/lib/lexical-publication', async original => {
  const actual = await original<typeof import('@/lib/lexical-publication')>()
  return { ...actual, get LEXICAL_REMAPS() { return state.remaps ?? actual.LEXICAL_REMAPS } }
})
vi.mock('node:fs', async original => {
  const actual = await original<FsModule>()
  return { ...actual, default: new Proxy(actual.default, {
    get(target, key) {
      if (key === 'lstatSync' || key === 'readFileSync' || key === 'readdirSync') {
        return (...args: unknown[]) => Reflect.apply(state.fs?.[key] ?? target[key], target, args)
      }
      return Reflect.get(target, key)
    },
  }) }
})
vi.mock('@/lib/g7-contracts', async original => {
  const actual = await original<typeof import('@/lib/g7-contracts')>()
  return (await import('./g7-fixtures')).bindSyntheticG7(actual)
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

const options = { changeClass: 'existing-lexical-batch-v1' } as const
const root = (version: Version) => path.join(process.cwd(), `.virtual-lexical-${version}`)
const roots = new Map<string, Map<string, Buffer>>()
const scope = (from: Version = 'before', to: Version = 'after') => assertInPlaceScope(root(from), root(to), options)
beforeEach(async () => {
  state.binding = lexicalBinding()
  state.remaps = syntheticRemaps()
  roots.clear()
  for (const version of ['before', 'after', 'recovery'] as const) roots.set(root(version), lexicalSource(lexicalSnapshot(version)))
  const original = await vi.importActual<FsModule>('node:fs')
  state.fs = virtualPayloadFs(original.default, roots)
})

function changeBody(uid: (typeof BODY_IDS)[number], version: Version, transform: (body: string) => string) {
  const files = roots.get(root(version))!
  const file = bodyPath(uid)
  const changed = transform(files.get(file)!.toString('utf8'))
  files.set(file, Buffer.from(changed))
  const body = state.binding!.bodies.find(body => body.uid === uid)!
  if (version === 'recovery' && !body.recovery) throw new Error('Only remapped bodies have independent recovery bindings')
  Object.assign(body[version]!, { rawSha256: hash(changed), serializedSha256: valueHash(compileFixture(changed)) })
}

function changeAnswer(id: string, transform: (answer: string) => string) {
  const parts = id.slice(1).split('/')
  editSource(roots.get(root('after'))!, parts.slice(0, -1).join('/'), lesson => {
    const problem = lesson.problems.find(problem => problem.id === parts.at(-1))!
    problem.answer = transform(problem.answer)
    const binding = state.binding!.assessments.find(item => item.contentId === id)!
    binding.after.answerSha256 = hash(problem.answer)
    binding.after.serializedAnswerSha256 = valueHash(compileFixture(problem.answer))
  })
}

describe('lexical source selection and exact legacy fragment ownership', () => {
  it('pins the actual two production legacy body hashes and mappings independently of synthetic mocks', async () => {
    const actual = await vi.importActual<typeof import('@/lib/lexical-publication')>('@/lib/lexical-publication')
    expect(actual.LEXICAL_REMAPS).toEqual({
      'js-track/core-fundamentals/scope-and-hoisting': {
        beforeSha256: 'd36b0071776cf35e92622b1d559a7df79a20778c915325c4c11c634e588e9f91',
        oldId: 'temporal-dead-zone-tdz', newId: 'binding-initialization-and-the-tdz', title: 'Binding Initialization and the TDZ',
      },
      'js-track/core-fundamentals/scope-chain': {
        beforeSha256: '5b459488db8dcd9b8b138b1d896fcde163cd3fdc662b5ddeb1aeb56ef6937f31',
        oldId: 'variable-shadowing', newId: 'shadowing-and-first-binding-lookup', title: 'Shadowing and First-Binding Lookup',
      },
    })
  })

  it('rejects overrides while preserving the existing class-selection contract', () => {
    expect(normalizeReleaseScopeOptions(options)).toEqual({ ...options, lesson: '' })
    for (const lesson of [LESSON_IDS[0], '/all', '*', 'resources/lexical-scope']) {
      expect(() => normalizeReleaseScopeOptions({ ...options, lesson })).toThrow(/does not accept a lesson override/)
    }
    expect(() => parseChangeClass('existing-lexical-batch-v2')).toThrow(/Unsupported/)
    for (const value of ['independent-in-place-text-v1', 'existing-entity-structural-text-v1',
      'single-unit-additive-task-v1', 'existing-assessment-update-v1', 'existing-practice-batch-v1']) {
      expect(parseChangeClass(value)).toBe(value)
    }
    expect(normalizeReleaseScopeOptions()).toEqual({ changeClass: 'independent-in-place-text-v1', lesson: '' })
    expect(() => normalizeReleaseScopeOptions({ lesson: LESSON_IDS[0] })).toThrow(/--lesson/)
  })

  it('walks complete raw source and authorizes only five bodies, ten ordinary groups and three calibrated groups', () => {
    expect(payloadFiles(root('before')).get('resources/fixture-resource-0/opaque.bin')).toEqual(Buffer.from([0xff, 0x80, 0x00]))
    const report = scope()
    expect(report.structural).toMatchObject({ changeClass: options.changeClass, profile: 'g7-scope-lookup-closures-2026-09', lesson: '' })
    expect(report.addition).toBeUndefined()
    expect(report.changedFiles.map(item => item.path).sort()).toEqual([
      'content/js-track/core-fundamentals/_lessons.json', ...BODY_IDS.map(bodyPath),
    ].sort())
    expect(report.structural!.allowedChangedFields.map(item => `${item.field}:${item.contentId}`).sort()).toEqual([
      ...BODY_IDS.map(uid => `body:/${uid.replace(/^resources\//, '')}`),
      ...MUTABLE.map(id => `${REGRADED.includes(id) ? 'calibrated-assessment' : 'assessment'}:${id}`),
    ].sort())
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'body')).toHaveLength(5)
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'answer')).toHaveLength(13)
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'question')).toMatchObject([{ contentId: QUESTION_ID }])
    expect(report.structural!.anchorConflictProof.fixedProblemCardAnchors).toHaveLength(15)
    expect(report.structural!.anchorConflictProof.fixedReaderAnchors.filter(item => item.id.endsWith('#practice-problems'))).toHaveLength(3)
    const bodies = report.structural!.changedSurfaces.filter(item => item.field === 'body')
    expect(bodies.flatMap(item => item.before.h2)).toHaveLength(26)
    expect(bodies.flatMap(item => item.after.h2)).toHaveLength(26)
    for (const uid of BODY_IDS) {
      const body = bodies.find(item => item.lesson === uid)!
      expect(body.before.h2.map(item => item.id)).toEqual(EXPECTED_HEADING_IDS[uid])
      const remap = state.remaps![uid as keyof ReturnType<typeof syntheticRemaps>]
      expect(body.after.h2.map(item => item.id)).toEqual(EXPECTED_HEADING_IDS[uid].map(id => id === remap?.oldId ? remap.newId : id))
    }
  })

  it('accepts both no-ops, compatible recovery and a repeated forward transition without broadening the binding', () => {
    const binding = structuredClone(state.binding)
    expect(scope('before', 'before').changedFiles).toEqual([])
    expect(scope('after', 'after').changedFiles).toEqual([])
    expect(scope('after', 'recovery').structural!.allowedChangedFields).toHaveLength(18)
    expect(scope('recovery', 'after').structural!.allowedChangedFields).toHaveLength(18)
    expect(scope('recovery', 'recovery').changedFiles).toEqual([])
    expect(state.binding).toEqual(binding)
  })

  it('rejects literal after-to-original reversal because the new public targets would disappear', () => {
    expect(() => scope('after', 'before')).toThrow(/Existing H2 fragment IDs were not preserved/)
  })

  it('permits complete-unit mixtures without assuming all 18 rows switch together', () => {
    const selected = new Set(ALL_UNITS.filter((_, index) => index % 2 === 0))
    roots.set(root('after'), lexicalSource(lexicalSnapshot(selected)))
    const report = scope()
    expect(report.structural!.allowedChangedFields).toHaveLength(18)
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'body')).toHaveLength(3)
  })

  it.each(LESSON_IDS.slice(0, 2))('does not extend the %s collision exception to near-matching original bytes', uid => {
    changeBody(uid, 'before', body => `${body}\n`)
    expect(() => scope()).toThrow(/H2 fragment IDs|collides with fixed reader anchor/)
  })

  it('does not accept a wrong pinned legacy hash even when the complete source body binding is valid', () => {
    state.remaps![LESSON_IDS[0]].beforeSha256 = 'f'.repeat(64)
    expect(() => scope()).toThrow(/H2 fragment IDs|collides with fixed reader anchor/)
  })

  it('does not admit the old colliding heading in an otherwise new bound body', () => {
    changeBody(LESSON_IDS[0], 'after', body => body.replace('## Binding Initialization and the TDZ', '## Temporal Dead Zone (TDZ)'))
    expect(() => scope()).toThrow(/Unapproved lexical heading destinations|collides/)
  })

  it.each(BODY_IDS)('retains every required H2 destination in %s', uid => {
    changeBody(uid, 'after', body => body.replace(/^## .+\n/m, 'Removed a required destination.\n'))
    expect(() => scope()).toThrow(/H2 fragment IDs|Unapproved lexical heading destinations/)
  })
})

describe('lexical reader grammar and link boundaries survive explicit synthetic rebinding', () => {
  it('accepts supported headings, tables, bare Note and CodeGroup with links valid in both versions', () => {
    changeBody('resources/lexical-scope', 'after', body => `${body}

### Optional lookup

| Name | Value |
| --- | --- |
| x | 1 |

<Note>

Use the [existing card](/courses/js-track/core-fundamentals/closures#closure-capture-reference-vs-value).

</Note>

<CodeGroup>

\`\`\`js
console.log(1)
\`\`\`

</CodeGroup>
`)
    const report = scope()
    const resource = report.structural!.changedSurfaces.find(item => item.lesson === 'resources/lexical-scope')!
    expect(resource.after.components).toEqual([{ name: 'Note', count: 1 }, { name: 'CodeGroup', count: 1 }])
    expect(resource.after.links).toMatchObject([{ kind: 'internal' }])
    expect(resource.after.codeBlocks).toMatchObject([{ language: 'js', hasMeta: false, inCodeGroup: true }])
  })

  it.each([
    '\n{executeSomething()}\n',
    '\nimport Unknown from "unknown"\n',
    '\n<Unknown />\n',
    '\n<Note title="unexpected">\n\nText.\n\n</Note>\n',
    '\n<CodeGroup title="unexpected">\n\n```js\nconsole.log(1)\n```\n\n</CodeGroup>\n',
    '\n<CodeGroup>\n\nNot code.\n\n</CodeGroup>\n',
    '\n```js title="unapproved"\nconsole.log(1)\n```\n',
    '\n```python\nprint(1)\n```\n',
    '\n![Image](https://example.test/image.png)\n',
    '\n<h2 id="new-runtime-id">New heading</h2>\n',
    '\n- [x] Completed\n',
  ])('rejects unsupported candidate grammar: %s', suffix => {
    changeBody('resources/lexical-scope', 'after', body => body + suffix)
    expect(() => scope()).toThrow(/Unsupported|not supported|Only (the )?exact|Metadata export\/import|CodeGroup may contain only code/)
  })

  it.each(['metadata', 'h1', 'h2-title', 'extra-h2', 'duplicate-h2'])('rejects %s drift despite bound body hashes', variant => {
    changeBody('resources/lexical-scope', 'after', body => {
      if (variant === 'metadata') return body.replace('Frozen synthetic metadata', 'Unapproved metadata')
      if (variant === 'h1') return body.replace('# Lexical Scope\n', '# Different resource\n')
      if (variant === 'h2-title') return body.replace('## Core Concepts', '## core concepts')
      return `${body}\n## ${variant === 'extra-h2' ? 'Unapproved Section' : 'Core Concepts'}\n\nText.\n`
    })
    expect(() => scope()).toThrow(/Metadata|H1|heading destinations|Duplicate/)
  })

  it('keeps resource eligibility at exactly the two named records', () => {
    roots.get(root('after'))!.set('resources/fixture-resource-3/page.mdx', Buffer.from('# Changed unrelated resource\n'))
    expect(() => scope()).toThrow(/metadata, retained pairs, neighbors or payload inventory/)
  })

  it.each([
    '/courses/js-track/core-fundamentals/scope-and-hoisting#binding-initialization-and-the-tdz',
    '/courses/js-track/core-fundamentals/scope-chain#shadowing-and-first-binding-lookup',
  ])('rejects a cross-row dependency on a new-only body target: %s', href => {
    changeBody('resources/closure-fundamentals', 'after', body => `${body}\nSee [new-only body](${href}).\n`)
    expect(() => scope()).toThrow(/not a rendered anchor/)
  })

  it.each([
    '#optional-lookup', '/resources/unlisted', '/resources/lexical-scope?mode=other',
    '../scope-chain', 'http://example.test/reference', '//example.test/reference',
    'https://user:password@example.test/reference',
  ])('rejects unverified or unsupported link destination %s', href => {
    changeBody('resources/lexical-scope', 'after', body => `${body}\n### Optional lookup\n\n[Reference](${href})\n`)
    expect(() => scope()).toThrow(/link|HTTPS|anchor/)
  })

  it.each(['## Variable Shadowing', '# Question title'])('does not lend body heading exceptions to an assessment: %s', heading => {
    const id = '/js-track/core-fundamentals/scope-chain/variable-shadowing'
    changeAnswer(id, answer => `${answer}\n${heading}\n\nNot a body heading.\n`)
    expect(() => scope()).toThrow(/H3 or deeper|H1 text changed|collides/)
  })

  it('rejects unreviewed raw bytes before considering a structurally harmless body', () => {
    const files = roots.get(root('after'))!
    const file = bodyPath('resources/lexical-scope')
    files.set(file, Buffer.concat([files.get(file)!, Buffer.from('\n')]))
    expect(() => scope()).toThrow(/Unreviewed lexical body/)
  })
})
