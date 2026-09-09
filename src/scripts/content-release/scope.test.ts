import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertInPlaceScope, assertSameMdxSurface } from './scope'

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

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memoized-release-scope-'))
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

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true })
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
