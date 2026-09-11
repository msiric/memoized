import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { STRUCTURAL_CHANGE_CLASS, STRUCTURAL_LESSON_UID, assertInPlaceScope, assertSameMdxSurface, normalizeReleaseScopeOptions } from './scope'

const roots: string[] = []
const body = "export const metadata = { title: 'Example' }\n\n# Example\n\nExplain this value.\n\n```js\nconsole.log(1)\n```\n"
const answer = 'A short answer.\n\n```js\n1 + 1\n```\n'
const config = {
  lessons: [{
    id: '/example', title: 'Example', description: 'Description', order: 1, access: 'FREE',
    problems: [{ title: 'Question', question: 'Explain this.', answer, type: 'THEORY', difficulty: 'EASY', href: '' }],
    resources: [{ id: '/reference', title: 'Reference', description: 'Reference', order: 1, href: '/resources/reference' }],
  }],
}
const configPath = 'content/course/section/_lessons.json'
const lessonPath = 'content/course/section/example/page.mdx'
const structuralConfigPath = 'content/js-track/typescript-introduction/_lessons.json'
const structuralLessonPath = 'content/js-track/typescript-introduction/ts-basics/page.mdx'

const structuralBody = `export const metadata = { title: 'TS Basics' }

# TS Basics

This is the baseline overview.

<Note>
See [Basic Types](/courses/js-track/typescript-introduction/basic-types).
</Note>

## First Pass

Start with the compile-time model.

\`\`\`typescript
const user: { name: string } = { name: 'Ada' }
\`\`\`
`

const structuralAnswer = (index: number) => `Answer ${index}.

\`\`\`typescript
const value${index}: number = ${index}
\`\`\`
`

const structuralProblems = [
  ['typescript-vs-javascript', 'TypeScript vs JavaScript', 'EASY'],
  ['why-typescript-the-value-proposition', 'Why TypeScript: The Value Proposition', 'EASY'],
  ['type-erasure-ts-types-disappear-at-runtime', 'Type Erasure: TS Types Disappear at Runtime', 'EASY'],
  ['structural-type-system-types-compare-by-shape', 'Structural Type System: Types Compare by Shape', 'MEDIUM'],
  ['typescripts-intentional-unsoundness', "TypeScript's Intentional Unsoundness", 'HARD'],
].map(([id, title, difficulty], index) => ({
  id, title, difficulty,
  question: `${title}?`,
  answer: structuralAnswer(index + 1),
  type: 'THEORY',
  href: '',
}))

const structuralConfig = {
  lessons: [
    {
      id: '/ts-basics',
      title: 'TS Basics',
      description: 'Learn TypeScript fundamentals and setup.',
      order: 1,
      access: 'PREMIUM',
      problems: structuralProblems,
    },
    {
      id: '/basic-types',
      title: 'Basic Types',
      description: 'Master fundamental TypeScript types and type inference.',
      order: 2,
      access: 'PREMIUM',
      problems: [{
        id: 'primitive-types',
        title: 'Primitive Types',
        difficulty: 'EASY',
        question: 'Name a primitive.',
        answer: 'A primitive answer.',
        type: 'THEORY',
        href: '',
      }],
    },
  ],
}

function fixture() {
  const parent = path.join(process.cwd(), '.content-release-test-work')
  fs.mkdirSync(parent, { recursive: true })
  const root = fs.mkdtempSync(path.join(parent, 'scope-'))
  roots.push(root)
  for (const [file, contents] of [
    [configPath, JSON.stringify(config)],
    [lessonPath, body],
    ['content/course/page.mdx', '# Course\n'],
    ['content/course/section/page.mdx', '# Section\n'],
    ['resources/reference/page.mdx', body],
    ['resources/intro/page.mdx', '# References\n'],
  ]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), contents)
  }
  return root
}

function writeFixtureFile(root: string, file: string, contents: string) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
  fs.writeFileSync(path.join(root, file), contents)
}

function structuralFixture() {
  const root = fixture()
  fs.rmSync(path.join(root, 'content'), { recursive: true })
  fs.rmSync(path.join(root, 'resources'), { recursive: true })
  for (const [file, contents] of [
    ['content/js-track/page.mdx', '# JS Track\n\n## Overview\n'],
    ['content/js-track/typescript-introduction/page.mdx', '# TypeScript Introduction\n\n## Lessons\n'],
    [structuralConfigPath, JSON.stringify(structuralConfig, null, 2)],
    [structuralLessonPath, structuralBody],
    ['content/js-track/typescript-introduction/basic-types/page.mdx', "export const metadata = { title: 'Basic Types' }\n\n# Basic Types\n\n## Primitives\n"],
    ['resources/reference/page.mdx', '# Reference\n\n## Details\n'],
  ]) writeFixtureFile(root, file, contents)
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true })
  fs.rmSync(path.join(process.cwd(), '.content-release-test-work'), { recursive: true, force: true })
})

describe('independent in-place source scope', () => {
  it('allows shape-preserving prose/code and answer repairs without changing metadata', () => {
    const base = fixture(), next = fixture()
    fs.writeFileSync(path.join(next, lessonPath), body.replace('this value', 'the value').replace('console.log(1)', 'console.log(2)'))
    const candidate = structuredClone(config)
    candidate.lessons[0].problems[0].answer = answer.replace('1 + 1', '2 + 2')
    fs.writeFileSync(path.join(next, configPath), JSON.stringify(candidate, null, 2))
    expect(assertInPlaceScope(base, next).changedFiles.map((file) => file.path)).toEqual([configPath, lessonPath])
  })

  it.each([
    ['title', 'Different'], ['description', 'Different'], ['order', 2],
    ['access', 'PREMIUM'], ['id', '/renamed'],
  ])('rejects lesson metadata change %s', (field, value) => {
    const base = fixture(), next = fixture()
    const candidate = { lessons: [{ ...config.lessons[0], [field]: value }] }
    fs.writeFileSync(path.join(next, configPath), JSON.stringify(candidate))
    expect(() => assertInPlaceScope(base, next)).toThrow(/Metadata/)
  })

  it('rejects changed questions and resource associations', () => {
    const base = fixture(), next = fixture()
    const candidate = structuredClone(config)
    candidate.lessons[0].problems[0].question = 'A different task.'
    fs.writeFileSync(path.join(next, configPath), JSON.stringify(candidate))
    expect(() => assertInPlaceScope(base, next)).toThrow(/Metadata/)
    candidate.lessons[0].problems[0].question = config.lessons[0].problems[0].question
    candidate.lessons[0].resources = []
    fs.writeFileSync(path.join(next, configPath), JSON.stringify(candidate))
    expect(() => assertInPlaceScope(base, next)).toThrow(/Metadata/)
  })

  it('rejects added or removed payloads, including a referenced missing resource', () => {
    const base = fixture(), next = fixture()
    fs.writeFileSync(path.join(next, 'resources/new.mdx'), '# New')
    expect(() => assertInPlaceScope(base, next)).toThrow(/add, remove or move/)
    fs.unlinkSync(path.join(next, 'resources/new.mdx'))
    fs.unlinkSync(path.join(next, 'resources/reference/page.mdx'))
    expect(() => assertInPlaceScope(base, next)).toThrow(/add, remove or move/)
  })

  it('rejects missing referenced bodies even when both trees have the same missing file', () => {
    const base = fixture(), next = fixture()
    fs.unlinkSync(path.join(base, 'resources/reference/page.mdx'))
    fs.unlinkSync(path.join(next, 'resources/reference/page.mdx'))
    expect(() => assertInPlaceScope(base, next)).toThrow(/Referenced body missing/)
  })

  it('rejects symlinks and course/section/intro changes', () => {
    const base = fixture(), next = fixture()
    fs.writeFileSync(path.join(next, 'content/course/page.mdx'), '# Altered')
    expect(() => assertInPlaceScope(base, next)).toThrow(/outside the supported/)
    fs.writeFileSync(path.join(next, 'content/course/page.mdx'), '# Course\n')
    fs.symlinkSync(path.join(base, lessonPath), path.join(next, 'resources/link.mdx'))
    expect(() => assertInPlaceScope(base, next)).toThrow(/Symlink/)
  })
})

describe('unchanged MDX runtime and navigation surface', () => {
  it.each([
    body.replace('# Example', '# New heading'),
    body.replace("title: 'Example'", "title: 'Changed'"),
    body.replace('```js', '```ts'),
    body.replace('```js', "```js {{ title: 'New panel' }}"),
    body + '\n<NewComponent />\n',
    body + '\n{process.env.SECRET}\n',
    body.replace('Explain this value.', '[Explain this value.](/new-target)'),
    body.replace('Explain this value.', '![Image](/new.svg)'),
    body + '\nimport X from "./new.js"\n',
    body.replace('console.log(1)', ''),
  ])('rejects unsupported surface changes', (candidate) => {
    expect(() => assertSameMdxSurface(body, candidate, 'fixture')).toThrow()
  })

  it('retains existing components but rejects changed attributes', () => {
    const source = '<Note tone="info">Some text.</Note>\n'
    expect(() => assertSameMdxSurface(source, source.replace('Some', 'Updated'), 'fixture')).not.toThrow()
    expect(() => assertSameMdxSurface(source, source.replace('info', 'warning'), 'fixture')).toThrow(/Unsupported/)
  })

  it('does not call structure approval a correctness test for fenced JavaScript', () => {
    expect(() => assertSameMdxSurface(body, body.replace('console.log(1)', 'throw new Error("intentional")'), 'fixture')).not.toThrow()
  })
})

describe('existing entity structural text source scope', () => {
  it('requires the explicit TS Basics lesson option and rejects default lesson use', () => {
    expect(normalizeReleaseScopeOptions({ changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID })).toEqual({
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })
    expect(() => normalizeReleaseScopeOptions({ changeClass: STRUCTURAL_CHANGE_CLASS })).toThrow(/requires --lesson/)
    expect(() => normalizeReleaseScopeOptions({ changeClass: STRUCTURAL_CHANGE_CLASS, lesson: 'js-track/typescript-introduction/basic-types' })).toThrow(/requires --lesson/)
    expect(() => normalizeReleaseScopeOptions({ lesson: STRUCTURAL_LESSON_UID })).toThrow(/--lesson is only supported/)
    expect(() => normalizeReleaseScopeOptions({ changeClass: 'unknown' as never })).toThrow(/Unsupported content change class/)
  })

  it('allows selected TS Basics body structure and existing five answers with review evidence', () => {
    const base = structuralFixture(), next = structuralFixture()
    fs.writeFileSync(path.join(next, structuralLessonPath), structuralBody.replace(
      'Start with the compile-time model.',
      'Start with the compile-time model.\n\n## Practice Stop\n\nTry [the first card](#typescript-vs-javascript) after this setup.',
    ))
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems = candidate.lessons[0].problems.map((problem, index) => ({
      ...problem,
      answer: `${problem.answer}\n## Answer ${index + 1} Detail\n\nThis adds reviewed structure${index === 0 ? ' with [the TypeScript docs](https://www.typescriptlang.org/docs/).' : '.'}\n`,
    }))
    fs.writeFileSync(path.join(next, structuralConfigPath), JSON.stringify(candidate, null, 2))
    const report = assertInPlaceScope(base, next, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })
    expect(report.changedFiles.map((file) => file.path)).toEqual([structuralConfigPath, structuralLessonPath])
    expect(report.structural?.profile).toBe('ts-basics-g3a-minimum')
    expect(report.structural?.allowedChangedFields).toHaveLength(6)
    expect(report.structural?.changedSurfaces.map((surface) => surface.kind)).toEqual([
      'lesson-body',
      'problem-answer',
      'problem-answer',
      'problem-answer',
      'problem-answer',
      'problem-answer',
    ])
    expect(report.structural?.anchorConflictProof.fixedProblemCardAnchors.map((anchor) => anchor.id)).toContain('typescript-vs-javascript')
    expect(report.structural?.externalHttpsDestinations).toEqual(['https://www.typescriptlang.org/docs/'])
    expect(report.structural?.changedSurfaces[0].after.h2.map((heading) => heading.id)).toContain('practice-stop')
  })

  it('rejects non-selected answers, lesson bodies and metadata/question changes', () => {
    const base = structuralFixture(), next = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[1].problems[0].answer = 'Changed outside the selected lesson.'
    fs.writeFileSync(path.join(next, structuralConfigPath), JSON.stringify(candidate, null, 2))
    expect(() => assertInPlaceScope(base, next, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Only TS Basics answers/)

    const bodyChange = structuralFixture()
    fs.writeFileSync(path.join(bodyChange, 'content/js-track/typescript-introduction/basic-types/page.mdx'), '# Changed\n')
    expect(() => assertInPlaceScope(base, bodyChange, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/outside the supported structural class/)

    const metadataChange = structuralFixture()
    fs.writeFileSync(path.join(metadataChange, structuralLessonPath), structuralBody.replace('TS Basics', 'Changed'))
    expect(() => assertInPlaceScope(base, metadataChange, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Metadata export/)

    const questionChange = structuralFixture()
    const changedQuestion = structuredClone(structuralConfig)
    changedQuestion.lessons[0].problems[0].question = 'Different question?'
    fs.writeFileSync(path.join(questionChange, structuralConfigPath), JSON.stringify(changedQuestion, null, 2))
    expect(() => assertInPlaceScope(base, questionChange, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Metadata, question contract/)
  })

  it('rejects unsupported MDX forms, link targets and anchor collisions', () => {
    const base = structuralFixture()
    for (const candidateBody of [
      structuralBody.replace('<Note>', '<Note tone="info">'),
      `${structuralBody}\n<iframe src="https://example.com" />\n`,
      `${structuralBody}\n{process.env.SECRET}\n`,
      `${structuralBody}\n![diagram](/x.svg)\n`,
      `${structuralBody}\n[bad](javascript:alert(1))\n`,
      `${structuralBody}\n[missing](/courses/js-track/typescript-introduction/missing)\n`,
      `${structuralBody}\n[future](#new-heading)\n\n## New Heading\n`,
    ]) {
      const next = structuralFixture()
      fs.writeFileSync(path.join(next, structuralLessonPath), candidateBody)
      expect(() => assertInPlaceScope(base, next, {
        changeClass: STRUCTURAL_CHANGE_CLASS,
        lesson: STRUCTURAL_LESSON_UID,
      })).toThrow()
    }

    const colliding = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].answer += '\n## First Pass\n\nCollides with the body anchor.\n'
    fs.writeFileSync(path.join(colliding, structuralConfigPath), JSON.stringify(candidate, null, 2))
    expect(() => assertInPlaceScope(base, colliding, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/anchors collide/)
  })

  it.each([
    ['Note', '<Note>\n\nexport const extra = 1\n\n</Note>\n'],
    ['nested Note', '<Note>\n\n<Note>\n\nexport const extra = 1\n\n</Note>\n\n</Note>\n'],
    ['Note import', '<Note>\n\nimport extra from "./unused.js"\n\n</Note>\n'],
    ['Note initializer', '<Note>\n\nexport const extra = (() => { throw new Error("unsafe initializer") })()\n\n</Note>\n'],
  ])('rejects nested ESM in a %s in both the body and answers', (_, nestedEsm) => {
    const base = structuralFixture()
    const bodyCandidate = structuralFixture()
    fs.writeFileSync(path.join(bodyCandidate, structuralLessonPath), structuralBody + '\n' + nestedEsm)
    expect(() => assertInPlaceScope(base, bodyCandidate, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Nested MDX imports\/exports/)

    const answerCandidate = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].answer += '\n' + nestedEsm
    fs.writeFileSync(path.join(answerCandidate, structuralConfigPath), JSON.stringify(candidate, null, 2))
    expect(() => assertInPlaceScope(base, answerCandidate, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Nested MDX imports\/exports/)
  })

  it('does not confuse non-executable quoted or listed export text with ESM', () => {
    const base = structuralFixture(), next = structuralFixture()
    fs.writeFileSync(path.join(next, structuralLessonPath), `${structuralBody}\n> export const extra = 1\n\n- export const another = 2\n`)
    expect(() => assertInPlaceScope(base, next, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).not.toThrow()
  })

  it.each([
    ['duplicate suffix', '## Checkpoint\n\n## Checkpoint\n\n## Checkpoint 2\n', /Duplicate generated H2 anchor/],
    ['empty slug', '## \u{1F600}\n\n## \u{1F600}\n', /Empty generated H2 anchor/],
  ])('rejects %s heading IDs within each body or answer before set conversion', (_, headings, message) => {
    const base = structuralFixture()
    const bodyCandidate = structuralFixture()
    fs.writeFileSync(path.join(bodyCandidate, structuralLessonPath), `${structuralBody}\n${headings}`)
    expect(() => assertInPlaceScope(base, bodyCandidate, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(message)

    const answerCandidate = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].answer += '\n' + headings
    fs.writeFileSync(path.join(answerCandidate, structuralConfigPath), JSON.stringify(candidate, null, 2))
    expect(() => assertInPlaceScope(base, answerCandidate, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(message)
  })

  it('reserves the actual practice section in the anchor catalog and collision proof', () => {
    const base = structuralFixture()
    const linked = structuralFixture()
    fs.writeFileSync(path.join(linked, structuralLessonPath), `${structuralBody}\n[Go to practice](#practice-problems).\n`)
    const report = assertInPlaceScope(base, linked, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })
    expect(report.structural?.anchorConflictProof.fixedReaderAnchors.map(anchor => anchor.id)).toContain('practice-problems')

    const bodyCollision = structuralFixture()
    fs.writeFileSync(path.join(bodyCollision, structuralLessonPath), `${structuralBody}\n## Practice Problems\n\nA competing destination.\n`)
    expect(() => assertInPlaceScope(base, bodyCollision, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/collides with fixed reader anchor/)

    const answerCollision = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].answer += '\n## Practice Problems\n\nA competing destination.\n'
    fs.writeFileSync(path.join(answerCollision, structuralConfigPath), JSON.stringify(candidate, null, 2))
    expect(() => assertInPlaceScope(base, answerCollision, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/collides with fixed reader anchor/)
  })

  it('also reserves headings in unchanged question text', () => {
    const base = structuralFixture(), next = structuralFixture()
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].question = '## Question Context\n\nExplain the original concept.'
    for (const root of [base, next]) {
      fs.writeFileSync(path.join(root, structuralConfigPath), JSON.stringify(candidate, null, 2))
    }
    fs.writeFileSync(path.join(next, structuralLessonPath), `${structuralBody}\n## Question Context\n\nA competing destination.\n`)
    expect(() => assertInPlaceScope(base, next, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/collides with fixed reader anchor/)
  })

  it('fails closed on literal reversal that drops published anchors but allows compatible recovery retaining them', () => {
    const base = structuralFixture()
    const published = structuralFixture()
    const publishedBody = structuralBody.replace(
      'Start with the compile-time model.',
      'Start with the compile-time model.\n\n## Practice Stop\n\nThis published anchor must survive recovery plans.',
    )
    fs.writeFileSync(path.join(published, structuralLessonPath), publishedBody)

    expect(() => assertInPlaceScope(base, published, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).not.toThrow()

    expect(() => assertInPlaceScope(published, base, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Existing H2 fragment IDs were not preserved/)

    const compatibleRecovery = structuralFixture()
    fs.writeFileSync(path.join(compatibleRecovery, structuralLessonPath), structuralBody.replace(
      'Start with the compile-time model.',
      'Recovered baseline wording.\n\n## Practice Stop\n\nThe recovery source keeps the published anchor.',
    ))
    expect(() => assertInPlaceScope(published, compatibleRecovery, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).not.toThrow()
  })

  it('rejects new local fragment links to anchors that are absent from the old state', () => {
    const base = structuralFixture()
    const bodyToNewAnswerAnchor = structuralFixture()
    fs.writeFileSync(path.join(bodyToNewAnswerAnchor, structuralLessonPath), `${structuralBody}\nSee [the new answer section](#new-answer-target).\n`)
    const candidate = structuredClone(structuralConfig)
    candidate.lessons[0].problems[0].answer += '\n## New Answer Target\n\nThis target is new in another field.\n'
    fs.writeFileSync(path.join(bodyToNewAnswerAnchor, structuralConfigPath), JSON.stringify(candidate, null, 2))

    expect(() => assertInPlaceScope(base, bodyToNewAnswerAnchor, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Internal link fragment is not a rendered anchor/)
  })

  it('rejects CodeGroup prose, unsupported languages and code metadata', () => {
    const base = structuralFixture()
    for (const candidateBody of [
      `${structuralBody}\n<CodeGroup>\n\nNot a code panel.\n\n</CodeGroup>\n`,
      `${structuralBody}\n\`\`\`ruby\nputs 'no'\n\`\`\`\n`,
      `${structuralBody}\n\`\`\`typescript {{ title: 'Panel' }}\nconst x = 1\n\`\`\`\n`,
    ]) {
      const next = structuralFixture()
      fs.writeFileSync(path.join(next, structuralLessonPath), candidateBody)
      expect(() => assertInPlaceScope(base, next, {
        changeClass: STRUCTURAL_CHANGE_CLASS,
        lesson: STRUCTURAL_LESSON_UID,
      })).toThrow()
    }

    const valid = structuralFixture()
    fs.writeFileSync(path.join(valid, structuralLessonPath), `${structuralBody}\n<CodeGroup>\n\n\`\`\`typescript\nconst x = 1\n\`\`\`\n\n\`\`\`javascript\nconst x = 1\n\`\`\`\n\n</CodeGroup>\n`)
    expect(() => assertInPlaceScope(base, valid, {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      lesson: STRUCTURAL_LESSON_UID,
    })).not.toThrow()
  })

  it.each([
    ['typescript', 'typescript'],
    ['ts', 'typescript'],
    ['js', 'javascript'],
    ['json', 'bash'],
    ['text', 'json'],
  ])('rejects CodeGroup panels %s/%s with indistinguishable rendered labels', (first, second) => {
    const base = structuralFixture(), next = structuralFixture()
    const group = `\n<CodeGroup>\n\n\`\`\`${first}\n"first"\n\`\`\`\n\n\`\`\`${second}\n"second"\n\`\`\`\n\n</CodeGroup>\n`
    fs.writeFileSync(path.join(next, structuralLessonPath), structuralBody + group)
    expect(() => assertInPlaceScope(base, next, {
      changeClass: STRUCTURAL_CHANGE_CLASS, lesson: STRUCTURAL_LESSON_UID,
    })).toThrow(/Duplicate rendered CodeGroup panel label/)
  })
})
