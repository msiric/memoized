import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'

const parser = remark().use(remarkMdx).use(remarkGfm)
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const digest = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex')

function structure(value: unknown, heading = false): unknown {
  if (Array.isArray(value)) return value.map((item) => structure(item, heading))
  if (!isRecord(value)) return value
  const inHeading = heading || value.type === 'heading'
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'position' && key !== 'data')
    .map(([key, item]) => [
      key,
      key === 'value' && (
        value.type === 'code' ||
        (!inHeading && (value.type === 'text' || value.type === 'inlineCode'))
      ) ? '[editable text]' : structure(item, inHeading),
    ]))
}

export function assertSameMdxSurface(before: string, after: string, label: string) {
  if (!after.trim()) throw new Error(`Empty content is not an in-place repair: ${label}`)
  const candidate = parser.parse(after)
  function rejectEmptyCode(value: unknown): void {
    if (Array.isArray(value)) return value.forEach(rejectEmptyCode)
    if (!isRecord(value)) return
    if (value.type === 'code' && (typeof value.value !== 'string' || !value.value.trim())) {
      throw new Error(`Empty code panel is not an in-place repair: ${label}`)
    }
    if (value.children) rejectEmptyCode(value.children)
  }
  rejectEmptyCode(candidate)
  if (!isDeepStrictEqual(structure(parser.parse(before)), structure(candidate))) {
    throw new Error(`Unsupported MDX structure/runtime/navigation change: ${label}`)
  }
}

function payloadFiles(root: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>()
  function walk(relative: string) {
    const full = path.join(root, relative)
    const stat = fs.lstatSync(full)
    if (stat.isSymbolicLink()) throw new Error(`Symlink in content payload: ${relative}`)
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(full).sort()) walk(path.join(relative, child))
    } else if (stat.isFile()) {
      files.set(relative.split(path.sep).join('/'), fs.readFileSync(full))
    } else {
      throw new Error(`Unsupported payload entry: ${relative}`)
    }
  }
  walk('content')
  walk('resources')
  return files
}

type ConfigView = { metadata: unknown; answers: string[]; bodyPaths: string[] }

function configView(raw: Buffer, filename: string): ConfigView {
  const parsed: unknown = JSON.parse(raw.toString('utf8'))
  if (!isRecord(parsed) || !Array.isArray(parsed.lessons)) {
    throw new Error(`Invalid lesson configuration: ${filename}`)
  }
  const answers: string[] = []
  const bodyPaths: string[] = []
  const lessons = parsed.lessons.map((lesson) => {
    if (!isRecord(lesson) || typeof lesson.id !== 'string' ||
        !/^\/[a-z0-9-]+$/.test(lesson.id) || !Array.isArray(lesson.problems)) {
      throw new Error(`Invalid lesson identity/problems: ${filename}`)
    }
    bodyPaths.push(`${path.posix.dirname(filename)}/${lesson.id.slice(1)}/page.mdx`)
    if (lesson.resources !== undefined) {
      if (!Array.isArray(lesson.resources)) throw new Error(`Invalid resources: ${filename}`)
      for (const resource of lesson.resources) {
        if (!isRecord(resource) || typeof resource.id !== 'string' ||
            !/^\/[a-z0-9-]+$/.test(resource.id)) {
          throw new Error(`Invalid resource identity: ${filename}`)
        }
        bodyPaths.push(`resources/${resource.id.slice(1)}/page.mdx`)
      }
    }
    const problems = lesson.problems.map((problem) => {
      if (!isRecord(problem) || typeof problem.answer !== 'string') {
        throw new Error(`Invalid problem answer: ${filename}`)
      }
      const { answer, ...metadata } = problem
      answers.push(answer)
      return metadata
    })
    return { ...lesson, problems }
  })
  return { metadata: { ...parsed, lessons }, answers, bodyPaths }
}

export type ScopeReport = {
  changedFiles: { path: string; beforeSha256: string; afterSha256: string }[]
}

/** Scope is stricter than ordinary MDX validity; semantic independence still needs review. */
export function assertInPlaceScope(baseRoot: string, candidateRoot: string): ScopeReport {
  const before = payloadFiles(baseRoot)
  const after = payloadFiles(candidateRoot)
  if (!isDeepStrictEqual([...before.keys()], [...after.keys()])) {
    throw new Error('In-place publishing cannot add, remove or move payload files')
  }
  const editableBodies = new Set<string>()
  for (const [filename, raw] of before) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename)) continue
    const baseline = configView(raw, filename)
    const candidate = configView(after.get(filename)!, filename)
    if (!isDeepStrictEqual(baseline.metadata, candidate.metadata)) {
      throw new Error(`Metadata, question contract, identity or ordering change: ${filename}`)
    }
    baseline.bodyPaths.forEach((body) => {
      if (!before.has(body)) throw new Error(`Referenced body missing from payload: ${body}`)
      editableBodies.add(body)
    })
    baseline.answers.forEach((answer, index) => {
      if (answer !== candidate.answers[index]) {
        assertSameMdxSurface(answer, candidate.answers[index], `${filename} answer ${index + 1}`)
      }
    })
  }
  const changedFiles: ScopeReport['changedFiles'] = []
  for (const [filename, oldBody] of before) {
    const newBody = after.get(filename)!
    if (oldBody.equals(newBody)) continue
    if (/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename)) {
      // The complete configuration comparison above permits answer text only.
    } else if (editableBodies.has(filename)) {
      assertSameMdxSurface(oldBody.toString('utf8'), newBody.toString('utf8'), filename)
    } else {
      throw new Error(`File is outside the supported in-place class: ${filename}`)
    }
    changedFiles.push({ path: filename, beforeSha256: digest(oldBody), afterSha256: digest(newBody) })
  }
  return { changedFiles }
}
