import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import { slugifyWithCounter } from '@sindresorhus/slugify'
import { toString } from 'mdast-util-to-string'
import slugify from 'slugify'

const parser = remark().use(remarkMdx).use(remarkGfm)
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const DEFAULT_CHANGE_CLASS = 'independent-in-place-text-v1'
export const STRUCTURAL_CHANGE_CLASS = 'existing-entity-structural-text-v1'
export const STRUCTURAL_PROFILE = 'ts-basics-g3a-minimum'
export const STRUCTURAL_LESSON_UID = 'js-track/typescript-introduction/ts-basics'

type DefaultChangeClass = typeof DEFAULT_CHANGE_CLASS
type StructuralChangeClass = typeof STRUCTURAL_CHANGE_CLASS
export type ChangeClass = DefaultChangeClass | StructuralChangeClass

export type ReleaseScopeOptions = {
  changeClass?: ChangeClass
  lesson?: string
}

const STRUCTURAL_CONFIG_PATH = 'content/js-track/typescript-introduction/_lessons.json'
const STRUCTURAL_LESSON_PATH = 'content/js-track/typescript-introduction/ts-basics/page.mdx'
const ALLOWED_CODE_LANGUAGES = new Set(['bash', 'javascript', 'js', 'json', 'text', 'typescript', 'ts'])
const PROBLEM_SLUGIFY_OPTIONS = { replacement: '-', lower: true, strict: true, trim: true }

export const digest = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex')

export function parseChangeClass(value: unknown): ChangeClass {
  const changeClass = value ?? DEFAULT_CHANGE_CLASS
  if (changeClass !== DEFAULT_CHANGE_CLASS && changeClass !== STRUCTURAL_CHANGE_CLASS) {
    throw new Error(`Unsupported content change class: ${String(changeClass)}`)
  }
  return changeClass
}

export function normalizeReleaseScopeOptions(options: ReleaseScopeOptions = {}): Required<ReleaseScopeOptions> {
  const changeClass = parseChangeClass(options.changeClass)
  const lesson = options.lesson ?? ''
  if (changeClass === DEFAULT_CHANGE_CLASS) {
    if (lesson) throw new Error(`--lesson is only supported with ${STRUCTURAL_CHANGE_CLASS}`)
    return { changeClass, lesson: '' }
  }
  if (lesson !== STRUCTURAL_LESSON_UID) {
    throw new Error(`${STRUCTURAL_CHANGE_CLASS} requires --lesson ${STRUCTURAL_LESSON_UID}`)
  }
  return { changeClass, lesson }
}

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

type ProblemConfig = {
  id: string
  title: string
  question: string
  answer: string
  type: string
  difficulty: string
  href: string
  contentId: string
  cardAnchor: string
}

type LessonConfig = {
  id: string
  title: string
  sourceUid: string
  contentId: string
  route: string
  bodyPath: string
  problems: ProblemConfig[]
}

type ParsedConfig = {
  metadata: unknown
  lessons: LessonConfig[]
}

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

function parseDetailedConfig(raw: Buffer, filename: string): ParsedConfig {
  const parsed: unknown = JSON.parse(raw.toString('utf8'))
  if (!isRecord(parsed) || !Array.isArray(parsed.lessons)) {
    throw new Error(`Invalid lesson configuration: ${filename}`)
  }
  const match = /^content\/([^/]+)\/([^/]+)\/_lessons\.json$/.exec(filename)
  if (!match) throw new Error(`Invalid lesson configuration path: ${filename}`)
  const [, course, section] = match
  const lessons: LessonConfig[] = []
  const metadataLessons = parsed.lessons.map((lesson) => {
    if (!isRecord(lesson) || typeof lesson.id !== 'string' ||
        !/^\/[a-z0-9-]+$/.test(lesson.id) || typeof lesson.title !== 'string' ||
        !Array.isArray(lesson.problems)) {
      throw new Error(`Invalid lesson identity/problems: ${filename}`)
    }
    const lessonSlug = lesson.id.slice(1)
    const sourceUid = `${course}/${section}/${lessonSlug}`
    const contentId = `/${sourceUid}`
    const route = `/courses/${sourceUid}`
    const problems = lesson.problems.map((problem) => {
      if (!isRecord(problem) || typeof problem.title !== 'string' ||
          typeof problem.question !== 'string' || typeof problem.answer !== 'string' ||
          typeof problem.type !== 'string' || typeof problem.difficulty !== 'string') {
        throw new Error(`Invalid problem contract: ${filename}`)
      }
      const problemId = typeof problem.id === 'string' && problem.id
        ? problem.id
        : slugify(problem.title, PROBLEM_SLUGIFY_OPTIONS)
      return {
        id: problemId,
        title: problem.title,
        question: problem.question,
        answer: problem.answer,
        type: problem.type,
        difficulty: problem.difficulty,
        href: typeof problem.href === 'string' ? problem.href : '',
        contentId: `${contentId}/${problemId}`,
        cardAnchor: slugify(problem.title, PROBLEM_SLUGIFY_OPTIONS),
      }
    })
    lessons.push({
      id: lesson.id,
      title: lesson.title,
      sourceUid,
      contentId,
      route,
      bodyPath: `${path.posix.dirname(filename)}/${lessonSlug}/page.mdx`,
      problems,
    })
    const sanitizedProblems = lesson.problems.map((problem) => {
      if (!isRecord(problem)) throw new Error(`Invalid problem contract: ${filename}`)
      const { answer, ...metadata } = problem
      return metadata
    })
    return { ...lesson, problems: sanitizedProblems }
  })
  return { metadata: { ...parsed, lessons: metadataLessons }, lessons }
}

export type AnchorEvidence = { text: string; id: string }
export type LinkEvidence = { text: string; href: string; kind: 'internal' | 'external-https' }
export type CodeBlockEvidence = { language: string; lines: number; inCodeGroup: boolean; hasMeta: boolean }
export type CodeGroupEvidence = { panels: CodeBlockEvidence[] }
export type MdxSurfaceEvidence = {
  h1: string[]
  h2: AnchorEvidence[]
  links: LinkEvidence[]
  codeBlocks: CodeBlockEvidence[]
  codeGroups: CodeGroupEvidence[]
  components: { name: 'Note' | 'CodeGroup'; count: number }[]
}
export type StructuralField =
  | { kind: 'lesson'; lesson: string; contentId: string; sourcePath: string; field: 'body' }
  | { kind: 'problem'; lesson: string; contentId: string; configPath: string; problemId: string; title: string; field: 'answer' }
export type StructuralSurfaceReport = {
  changeClass: StructuralChangeClass
  profile: typeof STRUCTURAL_PROFILE
  lesson: typeof STRUCTURAL_LESSON_UID
  allowedChangedFields: StructuralField[]
  changedSurfaces: {
    kind: 'lesson-body' | 'problem-answer'
    lesson: string
    contentId: string
    problemId?: string
    title?: string
    sourcePath: string
    field: 'body' | 'answer'
    beforeSha256: string
    afterSha256: string
    before: MdxSurfaceEvidence
    after: MdxSurfaceEvidence
  }[]
  anchorConflictProof: {
    checked: string
    fixedProblemCardAnchors: AnchorEvidence[]
    pairwiseCompatibleIds: string[]
  }
  externalHttpsDestinations: string[]
  limits: string[]
}

export type ScopeReport = {
  changedFiles: { path: string; beforeSha256: string; afterSha256: string }[]
  structural?: StructuralSurfaceReport
}

type SurfaceState = {
  label: string
  evidence: MdxSurfaceEvidence
  ids: Set<string>
}

type LessonState = {
  lesson: LessonConfig
  body: SurfaceState
  questions: SurfaceState[]
  answers: SurfaceState[]
  cardAnchors: AnchorEvidence[]
}

type Catalog = {
  routes: Map<string, Set<string>>
  selectedLesson: LessonState
}

function childrenOf(node: unknown): unknown[] {
  return isRecord(node) && Array.isArray(node.children) ? node.children : []
}

function codeEvidence(node: Record<string, unknown>, inCodeGroup: boolean): CodeBlockEvidence {
  if (typeof node.value !== 'string' || !node.value.trim()) {
    throw new Error('Empty code panel is not supported in the structural class')
  }
  if (typeof node.lang !== 'string' || !ALLOWED_CODE_LANGUAGES.has(node.lang)) {
    throw new Error(`Unsupported code fence language in structural class: ${String(node.lang)}`)
  }
  if (node.meta !== null && node.meta !== undefined) {
    throw new Error('Code fence metadata is not supported in the structural class')
  }
  return {
    language: node.lang,
    lines: node.value.split('\n').length,
    inCodeGroup,
    hasMeta: false,
  }
}

function validatePhrasingNode(node: unknown, label: string, links: LinkEvidence[]): void {
  if (!isRecord(node) || typeof node.type !== 'string') {
    throw new Error(`Unsupported MDX node in ${label}`)
  }
  switch (node.type) {
    case 'text':
    case 'inlineCode':
    case 'break':
      return
    case 'emphasis':
    case 'strong':
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, links))
      return
    case 'link': {
      if (typeof node.url !== 'string' || node.title !== null) {
        throw new Error(`Unsupported link form in ${label}`)
      }
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, links))
      links.push({ text: toString(node), href: node.url, kind: 'internal' })
      return
    }
    default:
      throw new Error(`Unsupported MDX node type in structural class: ${node.type} (${label})`)
  }
}

function validateFlowNode(
  node: unknown,
  label: string,
  evidence: MdxSurfaceEvidence,
  inCodeGroup = false,
): void {
  if (!isRecord(node) || typeof node.type !== 'string') {
    throw new Error(`Unsupported MDX node in ${label}`)
  }
  switch (node.type) {
    case 'mdxjsEsm':
      return
    case 'heading':
      if (typeof node.depth !== 'number' || node.depth < 1 || node.depth > 6) {
        throw new Error(`Unsupported heading depth in ${label}`)
      }
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links))
      return
    case 'paragraph':
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links))
      return
    case 'list':
      if (typeof node.ordered !== 'boolean') throw new Error(`Unsupported list form in ${label}`)
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
      return
    case 'listItem':
      if (node.checked !== null && node.checked !== undefined) {
        throw new Error(`Task-list items are not supported in ${label}`)
      }
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
      return
    case 'blockquote':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
      return
    case 'table':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
      return
    case 'tableRow':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
      return
    case 'tableCell':
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links))
      return
    case 'code':
      evidence.codeBlocks.push(codeEvidence(node, inCodeGroup))
      return
    case 'mdxJsxFlowElement': {
      const name = node.name
      const attributes = Array.isArray(node.attributes) ? node.attributes : []
      if (name === 'Note') {
        if (attributes.length) throw new Error(`Note attributes are not supported in ${label}`)
        evidence.components.push({ name: 'Note', count: 1 })
        childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence))
        return
      }
      if (name === 'CodeGroup') {
        if (attributes.length) throw new Error(`CodeGroup attributes are not supported in ${label}`)
        const panels = childrenOf(node)
        if (!panels.length) throw new Error(`CodeGroup requires at least one code panel in ${label}`)
        const group: CodeGroupEvidence = { panels: [] }
        for (const panel of panels) {
          if (!isRecord(panel) || panel.type !== 'code') {
            throw new Error(`CodeGroup may contain only code panels in ${label}`)
          }
          const code = codeEvidence(panel, true)
          evidence.codeBlocks.push(code)
          group.panels.push(code)
        }
        evidence.codeGroups.push(group)
        evidence.components.push({ name: 'CodeGroup', count: 1 })
        return
      }
      throw new Error(`Unsupported MDX component in structural class: ${String(name)} (${label})`)
    }
    default:
      throw new Error(`Unsupported MDX node type in structural class: ${node.type} (${label})`)
  }
}

function topLevelEsmValues(tree: unknown): string[] {
  if (!isRecord(tree)) return []
  return childrenOf(tree)
    .filter((node): node is Record<string, unknown> => isRecord(node) && node.type === 'mdxjsEsm')
    .map((node) => typeof node.value === 'string' ? node.value : '')
}

function headingEvidence(tree: unknown) {
  const h1: string[] = []
  const h2: AnchorEvidence[] = []
  const counter = slugifyWithCounter()
  function visitNode(node: unknown) {
    if (!isRecord(node)) return
    if (node.type === 'heading') {
      const text = toString(node)
      if (node.depth === 1) h1.push(text)
      if (node.depth === 2) h2.push({ text, id: counter(text) })
    }
    childrenOf(node).forEach(visitNode)
  }
  visitNode(tree)
  return { h1, h2 }
}

function emptyEvidence(): MdxSurfaceEvidence {
  return { h1: [], h2: [], links: [], codeBlocks: [], codeGroups: [], components: [] }
}

function summarizeMdx(markdown: string, label: string, allowMetadataExport: boolean): MdxSurfaceEvidence {
  const tree = parser.parse(markdown)
  const evidence = emptyEvidence()
  for (const child of childrenOf(tree)) validateFlowNode(child, label, evidence)
  const esmValues = topLevelEsmValues(tree)
  if (allowMetadataExport ? esmValues.length !== 1 : esmValues.length !== 0) {
    throw new Error(`Unsupported MDX import/export in ${label}`)
  }
  for (const value of esmValues) {
    if (!allowMetadataExport || !/^export\s+const\s+metadata\s*=/.test(value.trim())) {
      throw new Error(`Unsupported MDX import/export in ${label}`)
    }
  }
  const headings = headingEvidence(tree)
  evidence.h1 = headings.h1
  evidence.h2 = headings.h2
  evidence.components = [...new Map(evidence.components.map((item) => [item.name, {
    name: item.name,
    count: evidence.components.filter((component) => component.name === item.name).length,
  }])).values()]
  return evidence
}

function assertStructuralMdxSurface(
  before: string,
  after: string,
  label: string,
  allowMetadataExport: boolean,
) {
  if (!after.trim()) throw new Error(`Empty content is not supported in the structural class: ${label}`)
  const beforeTree = parser.parse(before)
  const afterTree = parser.parse(after)
  const beforeEsm = topLevelEsmValues(beforeTree)
  const afterEsm = topLevelEsmValues(afterTree)
  if (!isDeepStrictEqual(beforeEsm, afterEsm)) {
    throw new Error(`Metadata export/import surface changed in structural class: ${label}`)
  }
  const beforeEvidence = summarizeMdx(before, label, allowMetadataExport)
  const afterEvidence = summarizeMdx(after, label, allowMetadataExport)
  if (!isDeepStrictEqual(beforeEvidence.h1, afterEvidence.h1)) {
    throw new Error(`H1 text changed in structural class: ${label}`)
  }
  const afterH2 = new Set(afterEvidence.h2.map((heading) => heading.id))
  const missing = beforeEvidence.h2.filter((heading) => !afterH2.has(heading.id))
  if (missing.length) {
    throw new Error(`Existing H2 fragment IDs were not preserved in structural class: ${label}`)
  }
  return { before: beforeEvidence, after: afterEvidence }
}

function hrefEvidence(href: string, currentRoute: string, catalog: Catalog, label: string): LinkEvidence {
  if (!href || /[\u0000-\u001F\u007F\\]/.test(href) || /^\/\//.test(href)) {
    throw new Error(`Unsupported link destination in ${label}: ${href}`)
  }
  if (href.startsWith('#')) {
    assertFragment(currentRoute, href.slice(1), catalog, label)
    return { text: '', href, kind: 'internal' }
  }
  if (href.startsWith('/')) {
    const parsed = new URL(href, 'https://memoized.local')
    if (parsed.origin !== 'https://memoized.local' || parsed.search || /(^|\/)\.\.(\/|$)/.test(href)) {
      throw new Error(`Unsupported internal link destination in ${label}: ${href}`)
    }
    if (!catalog.routes.has(parsed.pathname)) {
      throw new Error(`Internal link target is not an existing source route in ${label}: ${href}`)
    }
    if (parsed.hash) assertFragment(parsed.pathname, parsed.hash.slice(1), catalog, label)
    return { text: '', href, kind: 'internal' }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    const parsed = new URL(href)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new Error(`External links in the structural class must be credential-free HTTPS: ${href}`)
    }
    return { text: '', href, kind: 'external-https' }
  }
  throw new Error(`Relative or ambiguous links are not supported in ${label}: ${href}`)
}

function assertFragment(route: string, fragment: string, catalog: Catalog, label: string) {
  let decoded: string
  try {
    decoded = decodeURIComponent(fragment)
  } catch {
    throw new Error(`Malformed link fragment in ${label}: ${fragment}`)
  }
  if (!decoded || !catalog.routes.get(route)?.has(decoded)) {
    throw new Error(`Internal link fragment is not a rendered anchor in ${label}: ${route}#${fragment}`)
  }
}

function validateLinks(evidence: MdxSurfaceEvidence, route: string, catalogs: Catalog[], label: string): LinkEvidence[] {
  const links: LinkEvidence[] = []
  for (const link of evidence.links) {
    let resolved: LinkEvidence | undefined
    for (const catalog of catalogs) {
      resolved = hrefEvidence(link.href, route, catalog, label)
    }
    links.push({ ...link, kind: resolved?.kind ?? 'internal' })
  }
  return links
}

function idsFrom(evidence: MdxSurfaceEvidence) {
  return new Set(evidence.h2.map((heading) => heading.id))
}

function state(label: string, markdown: string, allowMetadataExport: boolean): SurfaceState {
  const evidence = summarizeMdx(markdown, label, allowMetadataExport)
  return { label, evidence, ids: idsFrom(evidence) }
}

function looseHeadingIds(markdown: string): Set<string> {
  return idsFrom({ ...emptyEvidence(), ...headingEvidence(parser.parse(markdown)) })
}

function buildCatalog(files: Map<string, Buffer>, label: string): Catalog {
  const routes = new Map<string, Set<string>>()
  let selectedLesson: LessonState | undefined
  const addRoute = (route: string, ids: Iterable<string> = []) => {
    const existing = routes.get(route) ?? new Set<string>()
    for (const id of ids) existing.add(id)
    routes.set(route, existing)
  }
  for (const [filename, raw] of files) {
    const coursePage = /^content\/([^/]+)\/page\.mdx$/.exec(filename)
    if (coursePage) {
      addRoute(`/courses/${coursePage[1]}`, looseHeadingIds(raw.toString('utf8')))
    }
    const sectionPage = /^content\/([^/]+)\/([^/]+)\/page\.mdx$/.exec(filename)
    if (sectionPage) {
      addRoute(`/courses/${sectionPage[1]}/${sectionPage[2]}`, looseHeadingIds(raw.toString('utf8')))
    }
    const resourcePage = /^resources\/([^/]+)\/page\.mdx$/.exec(filename)
    if (resourcePage) {
      addRoute(`/resources/${resourcePage[1]}`, looseHeadingIds(raw.toString('utf8')))
    }
  }
  for (const [filename, raw] of files) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename)) continue
    const config = parseDetailedConfig(raw, filename)
    for (const lesson of config.lessons) {
      const bodyRaw = files.get(lesson.bodyPath)
      if (!bodyRaw) throw new Error(`Referenced body missing from payload: ${lesson.bodyPath}`)
      const cardAnchors = lesson.problems.map((problem) => ({ text: problem.title, id: problem.cardAnchor }))
      const ids = looseHeadingIds(bodyRaw.toString('utf8'))
      for (const problem of lesson.problems) {
        for (const id of looseHeadingIds(problem.question)) ids.add(id)
        for (const id of looseHeadingIds(problem.answer)) ids.add(id)
      }
      for (const anchor of cardAnchors) ids.add(anchor.id)
      addRoute(lesson.route, ids)
      if (lesson.sourceUid === STRUCTURAL_LESSON_UID) {
        const body = state(`${label} ${lesson.bodyPath}`, bodyRaw.toString('utf8'), true)
        const questions = lesson.problems.map((problem) =>
          state(`${label} ${lesson.sourceUid} question ${problem.id}`, problem.question, false))
        const answers = lesson.problems.map((problem) =>
          state(`${label} ${lesson.sourceUid} answer ${problem.id}`, problem.answer, false))
        selectedLesson = { lesson, body, questions, answers, cardAnchors }
      }
    }
  }
  if (!selectedLesson) throw new Error(`Selected structural lesson missing: ${STRUCTURAL_LESSON_UID}`)
  return { routes, selectedLesson }
}

function selectedLessonConfig(config: ParsedConfig, filename: string) {
  const lesson = config.lessons.find((item) => item.sourceUid === STRUCTURAL_LESSON_UID)
  if (!lesson) throw new Error(`Selected structural lesson missing in ${filename}`)
  if (lesson.problems.length !== 5 || lesson.problems.some((problem) => !problem.id)) {
    throw new Error(`${STRUCTURAL_CHANGE_CLASS} requires the existing five TS Basics problem records`)
  }
  return lesson
}

function assertNoPairwiseAnchorConflicts(
  base: LessonState,
  candidate: LessonState,
): StructuralSurfaceReport['anchorConflictProof'] {
  const groups: { name: string; variants: SurfaceState[] }[] = [
    { name: 'lesson body', variants: [base.body, candidate.body] },
    ...base.answers.map((answer, index) => ({
      name: `answer ${base.lesson.problems[index]?.id}`,
      variants: [answer, candidate.answers[index]],
    })),
  ]
  const fixed = base.cardAnchors
  const fixedIds = new Map<string, string>()
  for (const anchor of fixed) {
    if (fixedIds.has(anchor.id)) throw new Error(`Duplicate fixed problem-card anchor: ${anchor.id}`)
    fixedIds.set(anchor.id, anchor.text)
  }
  const compatible = new Set<string>()
  for (const group of groups) {
    for (const variant of group.variants) {
      for (const id of variant.ids) {
        if (fixedIds.has(id)) {
          throw new Error(`Structural heading anchor collides with problem-card anchor: ${id}`)
        }
        compatible.add(id)
      }
    }
  }
  for (let left = 0; left < groups.length; left += 1) {
    for (let right = left + 1; right < groups.length; right += 1) {
      for (const leftVariant of groups[left].variants) {
        for (const rightVariant of groups[right].variants) {
          for (const id of leftVariant.ids) {
            if (rightVariant.ids.has(id)) {
              throw new Error(`Structural heading anchors collide between ${groups[left].name} and ${groups[right].name}: ${id}`)
            }
          }
        }
      }
    }
  }
  return {
    checked: 'Pairwise proof over base/candidate lesson body plus each base/candidate selected answer, with all fixed problem-card anchors included.',
    fixedProblemCardAnchors: fixed,
    pairwiseCompatibleIds: [...compatible].sort(),
  }
}

function structuralScope(baseRoot: string, candidateRoot: string, lesson: string): ScopeReport {
  normalizeReleaseScopeOptions({ changeClass: STRUCTURAL_CHANGE_CLASS, lesson })
  const before = payloadFiles(baseRoot)
  const after = payloadFiles(candidateRoot)
  if (!isDeepStrictEqual([...before.keys()], [...after.keys()])) {
    throw new Error('Structural publishing cannot add, remove or move payload files')
  }
  const selectedBeforeRaw = before.get(STRUCTURAL_CONFIG_PATH)
  const selectedAfterRaw = after.get(STRUCTURAL_CONFIG_PATH)
  if (!selectedBeforeRaw || !selectedAfterRaw) {
    throw new Error(`Selected structural lesson config missing: ${STRUCTURAL_CONFIG_PATH}`)
  }
  const selectedBeforeConfig = parseDetailedConfig(selectedBeforeRaw, STRUCTURAL_CONFIG_PATH)
  const selectedAfterConfig = parseDetailedConfig(selectedAfterRaw, STRUCTURAL_CONFIG_PATH)
  const selectedBefore = selectedLessonConfig(selectedBeforeConfig, STRUCTURAL_CONFIG_PATH)
  const selectedAfter = selectedLessonConfig(selectedAfterConfig, STRUCTURAL_CONFIG_PATH)
  if (!isDeepStrictEqual(selectedBeforeConfig.metadata, selectedAfterConfig.metadata)) {
    throw new Error(`Metadata, question contract, identity or ordering change: ${STRUCTURAL_CONFIG_PATH}`)
  }
  selectedBeforeConfig.lessons.forEach((baselineLesson, lessonIndex) => {
    const candidateLesson = selectedAfterConfig.lessons[lessonIndex]
    if (!candidateLesson || baselineLesson.sourceUid !== candidateLesson.sourceUid) {
      throw new Error(`Metadata, question contract, identity or ordering change: ${STRUCTURAL_CONFIG_PATH}`)
    }
    if (baselineLesson.sourceUid === STRUCTURAL_LESSON_UID) return
    baselineLesson.problems.forEach((problem, problemIndex) => {
      if (problem.answer !== candidateLesson.problems[problemIndex]?.answer) {
        throw new Error(`Only TS Basics answers may change in ${STRUCTURAL_CONFIG_PATH}`)
      }
    })
  })
  for (const [filename, raw] of before) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename) || filename === STRUCTURAL_CONFIG_PATH) continue
    const candidate = after.get(filename)!
    if (!raw.equals(candidate)) {
      throw new Error(`File is outside the supported structural class: ${filename}`)
    }
  }
  for (const [filename, raw] of before) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename)) continue
    const baseline = parseDetailedConfig(raw, filename)
    const candidate = parseDetailedConfig(after.get(filename)!, filename)
    if (!isDeepStrictEqual(baseline.metadata, candidate.metadata)) {
      throw new Error(`Metadata, question contract, identity or ordering change: ${filename}`)
    }
  }

  const baseCatalog = buildCatalog(before, 'base')
  const candidateCatalog = buildCatalog(after, 'candidate')
  const changedFiles: ScopeReport['changedFiles'] = []
  const changedSurfaces: StructuralSurfaceReport['changedSurfaces'] = []

  const addChangedFile = (filename: string, oldBody: Buffer, newBody: Buffer) => {
    changedFiles.push({ path: filename, beforeSha256: digest(oldBody), afterSha256: digest(newBody) })
  }

  for (const [filename, oldBody] of before) {
    const newBody = after.get(filename)!
    if (oldBody.equals(newBody)) continue
    if (filename !== STRUCTURAL_CONFIG_PATH && filename !== STRUCTURAL_LESSON_PATH) {
      throw new Error(`File is outside the supported structural class: ${filename}`)
    }
    addChangedFile(filename, oldBody, newBody)
  }

  if (!before.get(STRUCTURAL_LESSON_PATH)) throw new Error(`Selected structural lesson body missing: ${STRUCTURAL_LESSON_PATH}`)
  const beforeBody = before.get(STRUCTURAL_LESSON_PATH)!.toString('utf8')
  const afterBody = after.get(STRUCTURAL_LESSON_PATH)!.toString('utf8')
  const bodyEvidence = assertStructuralMdxSurface(beforeBody, afterBody, STRUCTURAL_LESSON_PATH, true)
  bodyEvidence.before.links = validateLinks(bodyEvidence.before, selectedBefore.route, [baseCatalog, candidateCatalog], STRUCTURAL_LESSON_PATH)
  bodyEvidence.after.links = validateLinks(bodyEvidence.after, selectedBefore.route, [baseCatalog, candidateCatalog], STRUCTURAL_LESSON_PATH)
  if (beforeBody !== afterBody) {
    changedSurfaces.push({
      kind: 'lesson-body', lesson: STRUCTURAL_LESSON_UID, contentId: selectedBefore.contentId,
      sourcePath: STRUCTURAL_LESSON_PATH, field: 'body',
      beforeSha256: digest(beforeBody), afterSha256: digest(afterBody),
      before: bodyEvidence.before, after: bodyEvidence.after,
    })
  }

  selectedBefore.problems.forEach((problem, index) => {
    const candidate = selectedAfter.problems[index]
    if (!candidate || problem.id !== candidate.id) {
      throw new Error(`Selected structural answer identity changed: ${problem.id}`)
    }
    const evidence = assertStructuralMdxSurface(
      problem.answer,
      candidate.answer,
      `${STRUCTURAL_CONFIG_PATH} answer ${problem.id}`,
      false,
    )
    evidence.before.links = validateLinks(evidence.before, selectedBefore.route, [baseCatalog, candidateCatalog], `${problem.id} answer`)
    evidence.after.links = validateLinks(evidence.after, selectedBefore.route, [baseCatalog, candidateCatalog], `${problem.id} answer`)
    if (problem.answer !== candidate.answer) {
      changedSurfaces.push({
        kind: 'problem-answer', lesson: STRUCTURAL_LESSON_UID, contentId: problem.contentId,
        problemId: problem.id, title: problem.title, sourcePath: STRUCTURAL_CONFIG_PATH,
        field: 'answer', beforeSha256: digest(problem.answer), afterSha256: digest(candidate.answer),
        before: evidence.before, after: evidence.after,
      })
    }
  })

  const anchorConflictProof = assertNoPairwiseAnchorConflicts(baseCatalog.selectedLesson, candidateCatalog.selectedLesson)
  const allowedChangedFields: StructuralField[] = [
    { kind: 'lesson', lesson: STRUCTURAL_LESSON_UID, contentId: selectedBefore.contentId, sourcePath: STRUCTURAL_LESSON_PATH, field: 'body' },
    ...selectedBefore.problems.map((problem): StructuralField => ({
      kind: 'problem', lesson: STRUCTURAL_LESSON_UID, contentId: problem.contentId,
      configPath: STRUCTURAL_CONFIG_PATH, problemId: problem.id, title: problem.title, field: 'answer',
    })),
  ]
  const externalHttpsDestinations = [...new Set(changedSurfaces.flatMap((surface) =>
    [...surface.before.links, ...surface.after.links]
      .filter((link) => link.kind === 'external-https')
      .map((link) => link.href)))].sort()

  return {
    changedFiles,
    structural: {
      changeClass: STRUCTURAL_CHANGE_CLASS,
      profile: STRUCTURAL_PROFILE,
      lesson: STRUCTURAL_LESSON_UID,
      allowedChangedFields,
      changedSurfaces,
      anchorConflictProof,
      externalHttpsDestinations,
      limits: [
        'Eligibility and compatibility only; pedagogical correctness, free-feedback sufficiency and human approval are not established.',
        'External HTTPS destinations are syntax-checked and recorded for review, not semantically verified.',
        'Only the selected TS Basics body and its existing five answer fields are writable in this profile.',
        'Local fragment links must resolve in both base and candidate source catalogs; links to newly introduced anchors are rejected in this minimum profile.',
        'Recovery plans must retain every H2 anchor present in the current base source. Literal reversal that removes published anchors fails closed; use an explicitly reviewed compatible recovery source instead.',
        'Same-field generated navigation and reader hash behavior still require real reader evidence outside this machine scope check.',
      ],
    },
  }
}

/** Scope is stricter than ordinary MDX validity; semantic independence still needs review. */
export function assertInPlaceScope(
  baseRoot: string,
  candidateRoot: string,
  options: ReleaseScopeOptions = {},
): ScopeReport {
  const normalized = normalizeReleaseScopeOptions(options)
  if (normalized.changeClass === STRUCTURAL_CHANGE_CLASS) {
    return structuralScope(baseRoot, candidateRoot, normalized.lesson)
  }
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
