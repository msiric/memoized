import path from 'node:path'
import type fs from 'node:fs'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PracticePublicationBinding } from '@/lib/practice-publication'
import { assertInPlaceScope, assertSameMdxSurface, normalizeReleaseScopeOptions, parseChangeClass, payloadFiles } from './scope'
import {
  ALL_UNITS, ASSESSMENTS, EXPECTED_LESSONS, TC, expectedIds, editSource,
  practiceBinding, practiceSnapshot, sourcePayload, rawHash, virtualPayloadFs,
  compileFixture, expectedSourceHash, valueHash, RETAINED_ANCHOR_CASES, retainedPracticeSourceFixture,
  PROMISE_DIAGRAM_CASE, promiseDiagramSourceFixture,
  CANONICAL_NEIGHBOR_CASES, canonicalNeighborSourceFixture,
} from './practice-fixtures'

type FsModule = typeof fs & { default: typeof fs }
const state = vi.hoisted(() => ({
  binding: undefined as PracticePublicationBinding | undefined,
  fs: undefined as typeof fs | undefined,
  retained: undefined as Record<string, { beforeBodySha256: string; ids: readonly string[] }> | undefined,
  diagram: undefined as (Omit<typeof PROMISE_DIAGRAM_CASE, 'beforeBodySha256'> & { beforeBodySha256: string }) | undefined,
}))
vi.mock('@/lib/practice-publication-binding', () => ({
  get REVIEWED_PRACTICE_BINDING() { return state.binding },
}))
vi.mock('@/lib/practice-publication', async original => {
  const actual = await original<typeof import('@/lib/practice-publication')>()
  return {
    ...actual,
    get PRACTICE_RETAINED_BODY_CARDS() { return state.retained ?? actual.PRACTICE_RETAINED_BODY_CARDS },
    get PRACTICE_PROMISE_DIAGRAM() { return state.diagram ?? actual.PRACTICE_PROMISE_DIAGRAM },
  }
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

const options = { changeClass: 'existing-practice-batch-v1' } as const
const baseRoot = path.join(process.cwd(), '.virtual-practice-base')
const nextRoot = path.join(process.cwd(), '.virtual-practice-next')
const roots = new Map<string, Map<string, Buffer>>()
beforeEach(async () => {
  state.binding = practiceBinding()
  state.retained = undefined
  state.diagram = undefined
  roots.clear()
  roots.set(baseRoot, sourcePayload(practiceSnapshot()))
  roots.set(nextRoot, sourcePayload(practiceSnapshot('after')))
  const original = await vi.importActual<FsModule>('node:fs')
  state.fs = virtualPayloadFs(original.default, roots)
})

describe('canonical public lesson routes without invented source-directory aliases', () => {
  function install(target: (typeof CANONICAL_NEIGHBOR_CASES)[number]) {
    const fixture = canonicalNeighborSourceFixture(target)
    state.binding = fixture.binding
    roots.set(baseRoot, fixture.before)
    roots.set(nextRoot, fixture.after)
    return fixture
  }

  it('represents source identities and derived public slugs as separate fixture fields', () => {
    for (const target of CANONICAL_NEIGHBOR_CASES) {
      const fixture = canonicalNeighborSourceFixture(target)
      for (const snapshot of [fixture.snapshots.before, fixture.snapshots.after]) {
        expect(snapshot.content.lessons).toHaveLength(120)
        expect(snapshot.content.problems).toHaveLength(508)
        expect(snapshot.content.lessons.find(item => item.contentId === `/${target.sourceUid}`)).toMatchObject({
          contentId: `/${target.sourceUid}`, slug: target.publicSlug, href: target.publicHref, title: target.title,
        })
      }
      const section = target.sourceUid.split('/').slice(0, 2).join('/')
      const config = JSON.parse(fixture.before.get(`content/${section}/_lessons.json`)!.toString('utf8'))
      expect(config.lessons.find((item: { title: string }) => item.title === target.title).id).toBe('/security')
      expect(fixture.before.has(`content/${target.sourceUid}/page.mdx`)).toBe(true)
      expect(fixture.before.has(`content/${section}/${target.publicSlug}/page.mdx`)).toBe(false)
    }
  })

  it.each(CANONICAL_NEIGHBOR_CASES)('accepts the existing canonical $publicHref neighbor link in both versions', target => {
    const fixture = install(target)
    const forward = scope()
    const body = forward.structural!.changedSurfaces.find(item => item.lesson === fixture.linkingUid && item.field === 'body')!
    for (const version of [body.before, body.after]) {
      expect(version.links.map(item => item.href)).toEqual([target.publicHref, `${target.publicHref}#security-reference`])
      expect(version.links.every(item => item.kind === 'internal')).toBe(true)
    }
    expect(assertInPlaceScope(nextRoot, baseRoot, options).structural!.profile).toBe('platform-practice-consistency-2026-09')
  })

  it.each(CANONICAL_NEIGHBOR_CASES)('rejects the fake public alias derived only from $sourceUid', target => {
    const fixture = install(target)
    const file = `content/${fixture.linkingUid}/page.mdx`
    for (const [root, version] of [[baseRoot, 'before'], [nextRoot, 'after']] as const) {
      const body = roots.get(root)!.get(file)!.toString('utf8').replaceAll(target.publicHref, `/courses/${target.sourceUid}`)
      roots.get(root)!.set(file, Buffer.from(body))
      state.binding!.lessons.find(item => item.uid === fixture.linkingUid)!.body[version] = {
        rawSha256: rawHash(body), serializedSha256: valueHash(compileFixture(body)),
      }
    }
    expect(scope).toThrow(/Internal link target is not an existing source route/)
  })
})

describe('one body-only Promise diagram with explicit synthetic before-hash binding', () => {
  const uid = PROMISE_DIAGRAM_CASE.lesson
  const file = `content/${uid}/page.mdx`
  const image = (url: string, alt: string = PROMISE_DIAGRAM_CASE.alt, title = '') => `![${alt}](${url}${title})`

  function install() {
    const fixture = promiseDiagramSourceFixture()
    roots.set(baseRoot, fixture.before)
    roots.set(nextRoot, fixture.after)
    state.binding = fixture.binding
    state.diagram = fixture.diagram
  }

  function changeBody(version: 'before' | 'after', change: (body: string) => string) {
    const root = version === 'before' ? baseRoot : nextRoot
    const body = change(roots.get(root)!.get(file)!.toString('utf8'))
    roots.get(root)!.set(file, Buffer.from(body))
    state.binding!.lessons.find(item => item.uid === uid)!.body[version] = {
      rawSha256: rawHash(body), serializedSha256: valueHash(compileFixture(body)),
    }
    if (version === 'before') state.diagram!.beforeBodySha256 = rawHash(body)
  }

  it('pins the production lesson, original body hash, two URLs and exact alt independently', async () => {
    const actual = await vi.importActual<typeof import('@/lib/practice-publication')>('@/lib/practice-publication')
    expect(actual.PRACTICE_PROMISE_DIAGRAM).toEqual(PROMISE_DIAGRAM_CASE)
  })

  it('retains the exact old/new image in forward, no-op and reverse source inspection without fetching it', () => {
    install()
    const beforeBinding = structuredClone(state.binding)
    const forward = scope()
    const body = forward.structural!.changedSurfaces.find(item => item.lesson === uid && item.field === 'body')!
    expect(body.before.images).toEqual([{ url: PROMISE_DIAGRAM_CASE.beforeUrl, alt: PROMISE_DIAGRAM_CASE.alt }])
    expect(body.after.images).toEqual([{ url: PROMISE_DIAGRAM_CASE.afterUrl, alt: PROMISE_DIAGRAM_CASE.alt }])
    expect(forward.structural!.externalHttpsDestinations).toEqual([
      PROMISE_DIAGRAM_CASE.beforeUrl, PROMISE_DIAGRAM_CASE.afterUrl,
    ].sort())
    expect(assertInPlaceScope(nextRoot, nextRoot, options).changedFiles).toEqual([])
    const reverse = assertInPlaceScope(nextRoot, baseRoot, options)
    const recovery = reverse.structural!.changedSurfaces.find(item => item.lesson === uid && item.field === 'body')!
    expect(recovery.before.images).toEqual(body.after.images)
    expect(recovery.after.images).toEqual(body.before.images)
    expect(state.binding).toEqual(beforeBinding)
  })

  it('does not grant image permission when the pinned original hash differs', () => {
    install()
    state.diagram!.beforeBodySha256 = 'f'.repeat(64)
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it('rejects altered body bytes before image validation if no complete version matches', () => {
    install()
    roots.get(nextRoot)!.set(file, Buffer.concat([roots.get(nextRoot)!.get(file)!, Buffer.from('\n')]))
    expect(scope).toThrow(/Unreviewed practice body/)
  })

  it.each(['before', 'after'] as const)('rejects the other version URL inside the bound %s body', version => {
    install()
    const expected = version === 'before' ? PROMISE_DIAGRAM_CASE.beforeUrl : PROMISE_DIAGRAM_CASE.afterUrl
    const wrong = version === 'before' ? PROMISE_DIAGRAM_CASE.afterUrl : PROMISE_DIAGRAM_CASE.beforeUrl
    changeBody(version, body => body.replace(expected, wrong))
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it.each([
    'https://example.test/promises.png',
    `${PROMISE_DIAGRAM_CASE.afterUrl}?variant=unreviewed`,
  ])('rejects another HTTPS image destination even in a bound body: %s', url => {
    install()
    changeBody('after', body => body.replace(PROMISE_DIAGRAM_CASE.afterUrl, url))
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it('requires the exact alt text rather than accepting an arbitrary image description', () => {
    install()
    changeBody('after', body => body.replace(`![${PROMISE_DIAGRAM_CASE.alt}]`, '![Different diagram]'))
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it('requires a null title and rejects a nonempty supplied image title', () => {
    install()
    changeBody('after', body => body.replace(
      image(PROMISE_DIAGRAM_CASE.afterUrl), image(PROMISE_DIAGRAM_CASE.afterUrl, PROMISE_DIAGRAM_CASE.alt, ' "Named title"'),
    ))
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it('accepts an empty Markdown title only as the real parser-normalized null value', () => {
    install()
    const markdown = image(PROMISE_DIAGRAM_CASE.afterUrl, PROMISE_DIAGRAM_CASE.alt, ' ""')
    const paragraph = remark().use(remarkMdx).use(remarkGfm).parse(markdown).children[0]
    if (paragraph.type !== 'paragraph' || paragraph.children[0].type !== 'image') throw new Error('Expected the actual image AST')
    expect(paragraph.children[0].title).toBeNull()
    changeBody('after', body => body.replace(image(PROMISE_DIAGRAM_CASE.afterUrl), markdown))
    expect(scope().structural!.profile).toBe('platform-practice-consistency-2026-09')
  })

  it.each(['missing', 'duplicate'])('rejects a %s rendered image despite valid complete after hashes', variant => {
    install()
    changeBody('after', body => variant === 'missing'
      ? body.replace(image(PROMISE_DIAGRAM_CASE.afterUrl), '')
      : `${body}\n\n${image(PROMISE_DIAGRAM_CASE.afterUrl)}\n`)
    expect(scope).toThrow(/must be retained exactly once/)
  })

  it.each(['question', 'answer'] as const)('does not lend the body permission to the same lesson %s', field => {
    install()
    editSource(roots.get(nextRoot)!, uid, lesson => {
      const item = lesson.problems[0]
      item[field] += `\n\n${image(PROMISE_DIAGRAM_CASE.afterUrl)}\n`
      const bound = state.binding!.lessons.find(item => item.uid === uid)!.assessments[0].after
      if (field === 'question') {
        bound.questionSha256 = rawHash(item.question)
        bound.serializedQuestionSha256 = valueHash(compileFixture(item.question))
      } else {
        bound.answerSha256 = rawHash(item.answer)
        bound.serializedAnswerSha256 = valueHash(compileFixture(item.answer))
      }
    })
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it('does not lend the image permission to another otherwise bound practice lesson body', () => {
    install()
    const otherUid = 'js-track/advanced-concepts/functional-programming'
    const otherFile = `content/${otherUid}/page.mdx`
    const body = roots.get(nextRoot)!.get(otherFile)!.toString('utf8') + `\n\n${image(PROMISE_DIAGRAM_CASE.afterUrl)}\n`
    roots.get(nextRoot)!.set(otherFile, Buffer.from(body))
    state.binding!.lessons.find(item => item.uid === otherUid)!.body.after = {
      rawSha256: rawHash(body), serializedSha256: valueHash(compileFixture(body)),
    }
    expect(scope).toThrow(/Only the exact bound Promise diagram/)
  })

  it.each(['img', 'Image'])('does not admit a JSX %s component alongside the authorized Markdown image', component => {
    install()
    changeBody('after', body => `${body}\n\n<${component} src="${PROMISE_DIAGRAM_CASE.afterUrl}" alt="${PROMISE_DIAGRAM_CASE.alt}" />\n`)
    expect(scope).toThrow(/Unsupported MDX component|Unsupported MDX node/)
  })

  it('does not change the older independent-in-place prohibition on adding a new image surface', () => {
    const before = '# Unchanged lesson\n\nA paragraph.\n'
    expect(() => assertSameMdxSurface(before, `${before}\n${image(PROMISE_DIAGRAM_CASE.afterUrl)}\n`, 'old profile'))
      .toThrow(/Unsupported MDX structure/)
  })
})

describe('three retained body/protected-theory-card destinations with explicit synthetic hash bindings', () => {
  function install(target: (typeof RETAINED_ANCHOR_CASES)[number] = RETAINED_ANCHOR_CASES[0]) {
    const fixture = retainedPracticeSourceFixture(target)
    roots.set(baseRoot, fixture.before)
    roots.set(nextRoot, fixture.after)
    state.binding = fixture.binding
    state.retained = fixture.retained
    return target
  }

  function changeBoundAfterBody(uid: (typeof RETAINED_ANCHOR_CASES)[number]['uid'], change: (body: string) => string) {
    const file = `content/${uid}/page.mdx`
    const body = change(roots.get(nextRoot)!.get(file)!.toString('utf8'))
    roots.get(nextRoot)!.set(file, Buffer.from(body))
    state.binding!.lessons.find(item => item.uid === uid)!.body.after = {
      rawSha256: rawHash(body), serializedSha256: valueHash(compileFixture(body)),
    }
  }

  it('keeps the production exception whitelist at the three literal lesson/ID pairs', async () => {
    const actual = await vi.importActual<typeof import('@/lib/practice-publication')>('@/lib/practice-publication')
    expect(Object.entries(actual.PRACTICE_RETAINED_BODY_CARDS).map(([uid, entry]) => [uid, entry!.ids]))
      .toEqual(RETAINED_ANCHOR_CASES.map(item => [item.uid, [item.id]]))
    for (const entry of Object.values(actual.PRACTICE_RETAINED_BODY_CARDS)) {
      expect(entry!.beforeBodySha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it.each(RETAINED_ANCHOR_CASES)('retains exactly the existing $uid#$id destination forward and in reverse', target => {
    install(target)
    const before = sourcePayload(practiceSnapshot())
    expect(roots.get(baseRoot)!.size).toBe(before.size)
    const forward = scope()
    const reverse = assertInPlaceScope(nextRoot, baseRoot, options)
    for (const report of [forward, reverse]) {
      expect(report.structural!.anchorConflictProof.fixedReaderAnchors
        .some(item => item.id === `${target.uid}#${target.id}`)).toBe(true)
      expect(report.structural!.allowedChangedFields.filter(item => item.field === 'assessment')).toHaveLength(29)
      expect(report.structural!.allowedChangedFields.some(item => item.contentId === `/${target.uid}/${target.id}`)).toBe(false)
    }
  })

  it('rejects a wrong static original-body hash even when the body is otherwise bound', () => {
    const target = install()
    state.retained![target.uid].beforeBodySha256 = 'f'.repeat(64)
    expect(scope).toThrow(/collides with fixed reader anchor/)
  })

  it('rejects different body bytes before the retained-ID exception can run', () => {
    const target = install()
    const file = `content/${target.uid}/page.mdx`
    roots.get(nextRoot)!.set(file, Buffer.concat([roots.get(nextRoot)!.get(file)!, Buffer.from('\n')]))
    expect(scope).toThrow(/Unreviewed practice body/)
  })

  it.each(['new-card-id', 'reader-id'])('rejects an additional %s collision in an explicitly bound after body', variant => {
    const target = install()
    const heading = variant === 'reader-id' ? 'Practice Problems' : 'Synthetic currying-and-partial-application'
    changeBoundAfterBody(target.uid, body => `${body}\n\n## ${heading}\n\nNot a retained destination.\n`)
    expect(scope).toThrow(/collides with fixed reader anchor/)
  })

  it('rejects a changed protected theory card before considering the body exception', () => {
    const target = install()
    editSource(roots.get(nextRoot)!, target.uid, lesson => {
      lesson.problems.find(item => item.id === target.id)!.answer += '\nForeign change.'
    })
    expect(scope).toThrow(/Unreviewed practice source metadata, neighbors or payload inventory/)
  })

  it('does not lend the exception to an unchanged protected CODING card', () => {
    const target = install()
    for (const root of [baseRoot, nextRoot]) editSource(roots.get(root)!, target.uid, lesson => {
      lesson.problems.find(item => item.id === target.id)!.type = 'CODING'
    })
    state.binding!.protectedSourceSha256 = expectedSourceHash(roots.get(baseRoot)!)
    expect(scope).toThrow(/collides with fixed reader anchor/)
  })

  it('rejects a selected assessment even when it is unchanged THEORY in both source states', () => {
    const target = install()
    const id = 'currying-and-partial-application'
    const before = practiceSnapshot().content.problems.find(item => item.contentId === `/${target.uid}/${id}`)!
    for (const root of [baseRoot, nextRoot]) editSource(roots.get(root)!, target.uid, lesson => {
      lesson.problems.find(item => item.id === target.id)!.title = 'Distinct Frozen Comparison'
      const selected = lesson.problems.find(item => item.id === id)!
      Object.assign(selected, {
        title: target.title, type: 'THEORY', question: before.question, answer: before.answer,
      })
    })
    state.binding!.protectedSourceSha256 = expectedSourceHash(roots.get(baseRoot)!)
    expect(scope).toThrow(/collides with fixed reader anchor/)
  })

  it.each(['question', 'answer'] as const)('does not lend the body exception to a selected %s heading', field => {
    const target = install()
    editSource(roots.get(nextRoot)!, target.uid, lesson => {
      const item = lesson.problems[0]
      item[field] += `\n\n## ${target.title}\n\nThis is not the retained body.\n`
      const bound = state.binding!.lessons.find(entry => entry.uid === target.uid)!.assessments.find(entry => entry.id === item.id)!
      if (field === 'question') {
        bound.after.questionSha256 = rawHash(item.question)
        bound.after.serializedQuestionSha256 = valueHash(compileFixture(item.question))
      } else {
        bound.after.answerSha256 = rawHash(item.answer)
        bound.after.serializedAnswerSha256 = valueHash(compileFixture(item.answer))
      }
    })
    expect(scope).toThrow(/collides with fixed reader anchor|anchors collide/)
  })

  it('requires the destination to remain in both bound body variants', () => {
    const target = install()
    changeBoundAfterBody(target.uid, body => body.replace(`## ${target.title}\n`, 'Retained prose without its heading.\n'))
    expect(scope).toThrow(/Existing H2 fragment IDs were not preserved/)
  })
})
const scope = () => assertInPlaceScope(baseRoot, nextRoot, options)

describe('practice scope integration over complete virtual source trees', () => {
  it('keeps the new class closed to lesson and unknown capability selection', () => {
    expect(parseChangeClass(options.changeClass)).toBe(options.changeClass)
    expect(normalizeReleaseScopeOptions(options)).toEqual({ ...options, lesson: '' })
    for (const lesson of [TC, '/all', '*', 'all', 'js-track/core-fundamentals/data-types']) {
      expect(() => normalizeReleaseScopeOptions({ ...options, lesson })).toThrow(/does not accept a lesson override/)
    }
    expect(() => parseChangeClass('existing-practice-batch-v2')).toThrow(/Unsupported/)
  })

  it('walks raw binary payloads and grants exactly 17 bodies plus 29 whole assessments', () => {
    const walked = payloadFiles(baseRoot)
    expect(walked.get('resources/fixture-resource-0/opaque.bin')).toEqual(Buffer.from([0xff, 0x80, 0x00]))
    expect(walked.size).toBe(roots.get(baseRoot)!.size)
    const report = scope()
    expect(report.structural).toMatchObject({
      changeClass: options.changeClass, profile: 'platform-practice-consistency-2026-09', lesson: '',
    })
    expect(report.addition).toBeUndefined()
    const allowed = report.structural!.allowedChangedFields.map(item => `${item.field}:${item.contentId}`).sort()
    expect(allowed).toEqual([
      ...EXPECTED_LESSONS.map(uid => `body:/${uid}`), ...ASSESSMENTS.map(id => `assessment:${id}`),
    ].sort())
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'body')).toHaveLength(17)
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'question')).toHaveLength(24)
    expect(report.structural!.changedSurfaces.filter(item => item.field === 'answer')).toHaveLength(29)
    expect(report.structural!.anchorConflictProof.fixedReaderAnchors
      .filter(item => item.id.endsWith('#practice-problems'))).toHaveLength(17)
  })

  it('supports forward, no-op and reverse without changing the complete binding', () => {
    const binding = structuredClone(state.binding)
    const forward = scope()
    expect(forward.changedFiles.length).toBeGreaterThan(17)
    expect(assertInPlaceScope(nextRoot, nextRoot, options).changedFiles).toEqual([])
    expect(assertInPlaceScope(baseRoot, baseRoot, options).changedFiles).toEqual([])
    expect(assertInPlaceScope(nextRoot, baseRoot, options).structural!.allowedChangedFields).toEqual(forward.structural!.allowedChangedFields)
    expect(state.binding).toEqual(binding)
  })

  it('accepts one representative complete body/assessment mixture per lesson, not 2^46 global states', () => {
    const units = new Set<string>()
    for (const [index, uid] of EXPECTED_LESSONS.entries()) {
      if (index % 2 === 0) units.add(`body:${uid}`)
      const id = expectedIds(uid)[0]
      if (index % 2 !== 0) units.add(`assessment:/${uid}/${id}`)
    }
    roots.set(nextRoot, sourcePayload(practiceSnapshot(units)))
    const forward = scope()
    expect(forward.structural!.changedSurfaces.filter(item => item.field === 'body')).toHaveLength(9)
    expect(forward.structural!.changedSurfaces.filter(item => item.field === 'answer')).toHaveLength(8)
    expect(assertInPlaceScope(nextRoot, baseRoot, options).structural!.profile).toBe('platform-practice-consistency-2026-09')
    expect(units.size).toBe(17)
    expect(ALL_UNITS).toHaveLength(46)
  })

  it.each(['missing-binding', 'binary', 'neighbor-file', 'unlisted-file', 'unlisted-assessment', 'source-owner'])(
    'rejects %s before producing an eligible scope', variant => {
      const next = roots.get(nextRoot)!
      if (variant === 'missing-binding') state.binding = undefined
      if (variant === 'binary') next.set('resources/fixture-resource-0/opaque.bin', Buffer.from([0xff, 0x81, 0x00]))
      if (variant === 'neighbor-file') next.set('content/js-track/page.mdx', Buffer.from('# Changed course'))
      if (variant === 'unlisted-file') next.set('resources/extra.bin', Buffer.from([0x01]))
      if (variant === 'unlisted-assessment') editSource(next, TC, lesson => { lesson.problems.push({ ...lesson.problems[0], id: 'foreign' }) })
      if (variant === 'source-owner') editSource(next, TC, lesson => { lesson.id = '/foreign-owner' })
      expect(scope).toThrow()
    },
  )

  it.each([
    '\n{arbitraryExecution()}\n',
    '\nimport Unknown from "unknown"\n',
    '\n<Unknown />\n',
    '\n<Note title="runtime-attribute">\n\nText.\n\n</Note>\n',
  ])('still checks reader surface after an explicitly synthetic body rebinding: %s', suffix => {
    const uid = 'js-track/advanced-concepts/generators'
    const file = `content/${uid}/page.mdx`
    const next = roots.get(nextRoot)!
    const body = next.get(file)!.toString('utf8') + suffix
    next.set(file, Buffer.from(body))
    state.binding!.lessons.find(item => item.uid === uid)!.body.after.rawSha256 = rawHash(body)
    expect(scope).toThrow(/Unsupported|not supported/)
  })

  it('checks cross-surface anchors after explicitly synthetic assessment rebinding', () => {
    const uid = 'js-track/advanced-concepts/generators'
    const next = roots.get(nextRoot)!
    editSource(next, uid, lesson => {
      lesson.problems[0].question += '\n\n## Foundation\n'
      state.binding!.lessons.find(item => item.uid === uid)!.assessments[0].after.questionSha256 =
        rawHash(lesson.problems[0].question)
    })
    expect(scope).toThrow(/anchors collide/)
  })
})
