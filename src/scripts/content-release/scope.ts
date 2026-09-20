import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { remark } from 'remark'
import remarkMdx from 'remark-mdx'
import remarkGfm from 'remark-gfm'
import { slugifyWithCounter } from '@sindresorhus/slugify'
import { toString } from 'mdast-util-to-string'
import { PRACTICE_PROBLEMS_PREFIX } from '@/constants'
import { contentSlug } from '@/lib/content-slug'
import { getPanelTitle } from '@/lib/code-panel-title'
import { G3B_CARD_ORDER, G3B_LESSON_CONTENT_ID, G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_BODY_DESCRIPTION, G3C_BODY_TITLE, G3C_HEADINGS, G3C_LESSON_CONTENT_ID, G3C_LESSON_UID, G3C_OLD_TASK_IDS, G3C_TASK } from '@/lib/g3c-task'
import { G3C_CONFIG_PATH, G3C_LEGACY_BODY_SHA256, G3C_LESSON_METADATA, G3C_OLD_CONTRACTS } from '@/lib/g3c-publication'
import { staticHeading } from '@/mdx/static-headings.mjs'
import {
  G7_CHANGE_CLASS, G7_PROFILE, G7_DATA_TYPES, G7_TYPE_COERCION, G7_CONFIG_PATH,
  G7_CONTRACTS, assertG7Body, assertG7SourceLesson, isG7Lesson, requireG7Binding,
  g7ValueHash, type G7LessonUid,
} from '@/lib/g7-contracts'
import { assertG3bSourceTask, assertG3cSourceTask, G3B_CONFIG_PATH } from './catalog'
import {
  PRACTICE_CHANGE_CLASS, PRACTICE_PROFILE, PRACTICE_RETAINED_BODY_CARDS, PRACTICE_PROMISE_DIAGRAM,
  isPracticeAssessment, requirePracticeBinding, practiceValueHash,
} from '@/lib/practice-publication'
import { assertPracticeSource } from './practice-boundaries'

const parser = remark().use(remarkMdx).use(remarkGfm)
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const DEFAULT_CHANGE_CLASS = 'independent-in-place-text-v1'
export const STRUCTURAL_CHANGE_CLASS = 'existing-entity-structural-text-v1'
export const STRUCTURAL_PROFILE = 'ts-basics-g3a-minimum'
export const STRUCTURAL_LESSON_UID = 'js-track/typescript-introduction/ts-basics'
export const ADDITIVE_CHANGE_CLASS = 'single-unit-additive-task-v1'
export const ADDITIVE_PROFILE = 'g3b-native-task-minimum'
export const G3C_ADDITIVE_PROFILE = 'g3c-native-task-minimum'

type DefaultChangeClass = typeof DEFAULT_CHANGE_CLASS
type StructuralChangeClass = typeof STRUCTURAL_CHANGE_CLASS
export type ChangeClass = DefaultChangeClass | StructuralChangeClass | typeof ADDITIVE_CHANGE_CLASS | typeof G7_CHANGE_CLASS | typeof PRACTICE_CHANGE_CLASS

export type ReleaseScopeOptions = {
  changeClass?: ChangeClass
  lesson?: string
}

const STRUCTURAL_CONFIG_PATH = 'content/js-track/typescript-introduction/_lessons.json'
const STRUCTURAL_LESSON_PATH = 'content/js-track/typescript-introduction/ts-basics/page.mdx'
const ALLOWED_CODE_LANGUAGES = new Set(['bash', 'javascript', 'js', 'json', 'text', 'typescript', 'ts'])
const G3C_CODE_LANGUAGES = new Set([...ALLOWED_CODE_LANGUAGES, 'jsx', 'tsx', 'css', 'html'])
const PRACTICE_CODE_LANGUAGES = new Set([...G3C_CODE_LANGUAGES, 'sh'])
type SurfacePolicy = {
  g3c?: boolean
  g7?: G7LessonUid
  practice?: boolean
  legacySha256?: string
  disclosureLabel?: string
  promiseDiagram?: { beforeSha256: string; afterSha256: string }
  imageUrl?: string
}

function answerSurfacePolicy(g3c: boolean, problemId: string): SurfacePolicy {
  if (!g3c) return {}
  return {
    g3c: true,
    legacySha256: G3C_OLD_CONTRACTS.find(item => item.id === problemId)?.answerSha256,
    disclosureLabel: problemId === G3C_TASK.id ? 'Open the complete reference files' : undefined,
  }
}

export const digest = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex')

export function parseChangeClass(value: unknown): ChangeClass {
  const changeClass = value ?? DEFAULT_CHANGE_CLASS
  if (changeClass !== DEFAULT_CHANGE_CLASS && changeClass !== STRUCTURAL_CHANGE_CLASS &&
      changeClass !== ADDITIVE_CHANGE_CLASS && changeClass !== G7_CHANGE_CLASS && changeClass !== PRACTICE_CHANGE_CLASS) {
    throw new Error(`Unsupported content change class: ${String(changeClass)}`)
  }
  return changeClass
}

export function normalizeReleaseScopeOptions(options: ReleaseScopeOptions = {}): Required<ReleaseScopeOptions> {
  const changeClass = parseChangeClass(options.changeClass)
  const lesson = options.lesson ?? ''
  if (changeClass === PRACTICE_CHANGE_CLASS) {
    if (lesson) throw new Error('The reviewed practice batch does not accept a lesson override')
    return { changeClass, lesson: '' }
  }
  if (changeClass === DEFAULT_CHANGE_CLASS) {
    if (lesson) throw new Error('--lesson is only supported with an explicit structural, additive or assessment change class')
    return { changeClass, lesson: '' }
  }
  const expectedLessons = changeClass === G7_CHANGE_CLASS ? [G7_DATA_TYPES, G7_TYPE_COERCION] : changeClass === ADDITIVE_CHANGE_CLASS
    ? [G3B_LESSON_UID, G3C_LESSON_UID] : [STRUCTURAL_LESSON_UID]
  if (!expectedLessons.includes(lesson)) {
    throw new Error(`${changeClass} requires --lesson ${expectedLessons.join(' or ')}`)
  }
  return { changeClass, lesson }
}

function structure(value: unknown, heading = false): unknown {
  if (Array.isArray(value)) return value.map((item) => structure(item, heading))
  if (!isRecord(value)) return value
  const inHeading = heading || value.type === 'heading' ||
    ((value.type === 'mdxJsxFlowElement' || value.type === 'mdxJsxTextElement') && value.name === 'h2')
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

export function payloadFiles(root: string): Map<string, Buffer> {
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
    const route = `/courses/${course}/${section}/${contentSlug(lesson.title)}`
    const problems = lesson.problems.map((problem) => {
      if (!isRecord(problem) || typeof problem.title !== 'string' ||
          typeof problem.question !== 'string' || typeof problem.answer !== 'string' ||
          typeof problem.type !== 'string' || typeof problem.difficulty !== 'string') {
        throw new Error(`Invalid problem contract: ${filename}`)
      }
      const problemId = typeof problem.id === 'string' && problem.id
        ? problem.id
        : contentSlug(problem.title)
      return {
        id: problemId,
        title: problem.title,
        question: problem.question,
        answer: problem.answer,
        type: problem.type,
        difficulty: problem.difficulty,
        href: typeof problem.href === 'string' ? problem.href : '',
        contentId: `${contentId}/${problemId}`,
        cardAnchor: contentSlug(problem.title),
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
  components: { name: 'Note' | 'CodeGroup' | 'details'; count: number }[]
  images?: { url: string; alt: string }[]
}
export type StructuralField =
  | { kind: 'lesson'; lesson: string; contentId: string; sourcePath: string; field: 'body' }
  | { kind: 'problem'; lesson: string; contentId: string; configPath: string; problemId: string; title: string; field: 'answer' }
  | { kind: 'problem'; lesson: string; contentId: string; configPath: string; problemId: string; title: string; field: 'assessment' }
export type StructuralSurfaceReport = {
  changeClass: StructuralChangeClass | typeof ADDITIVE_CHANGE_CLASS | typeof G7_CHANGE_CLASS | typeof PRACTICE_CHANGE_CLASS
  profile: typeof STRUCTURAL_PROFILE | typeof ADDITIVE_PROFILE | typeof G3C_ADDITIVE_PROFILE | typeof G7_PROFILE | typeof PRACTICE_PROFILE
  lesson: string
  allowedChangedFields: StructuralField[]
  changedSurfaces: {
    kind: 'lesson-body' | 'problem-answer' | 'problem-question'
    lesson: string
    contentId: string
    problemId?: string
    title?: string
    sourcePath: string
    field: 'body' | 'answer' | 'question'
    beforeSha256: string
    afterSha256: string
    before: MdxSurfaceEvidence
    after: MdxSurfaceEvidence
  }[]
  anchorConflictProof: {
    checked: string
    fixedProblemCardAnchors: AnchorEvidence[]
    fixedReaderAnchors: AnchorEvidence[]
    pairwiseCompatibleIds: string[]
  }
  externalHttpsDestinations: string[]
  limits: string[]
}

export type ScopeReport = {
  changedFiles: { path: string; beforeSha256: string; afterSha256: string }[]
  structural?: StructuralSurfaceReport
  assessment?: { bindingSha256: string; sourceLessonBeforeSha256: string; sourceLessonAfterSha256: string }
  addition?: {
    contentId: string
    questionSha256: string
    answerSha256: string
    question: MdxSurfaceEvidence
    answer: MdxSurfaceEvidence
  }
}

type SurfaceState = {
  label: string
  sha256: string
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

function codeEvidence(node: Record<string, unknown>, inCodeGroup: boolean, policy: SurfacePolicy, label: string): CodeBlockEvidence {
  if (typeof node.value !== 'string' || !node.value.trim()) {
    throw new Error(`Empty code panel is not supported in the structural class: ${label}`)
  }
  const legacyLanguage = policy.legacySha256 && (node.lang == null || node.lang === 'python' || node.lang === 'plaintext' ||
    policy.practice && (node.lang === 'http' || node.lang === 'jsonc'))
  const languages = policy.practice ? PRACTICE_CODE_LANGUAGES : policy.g3c ? G3C_CODE_LANGUAGES : ALLOWED_CODE_LANGUAGES
  if (!legacyLanguage && (typeof node.lang !== 'string' ||
      !languages.has(node.lang))) {
    throw new Error(`Unsupported code fence language in structural class: ${String(node.lang)} (${label})`)
  }
  const legacyMeta = policy.g7 === G7_TYPE_COERCION &&
    policy.legacySha256 === G7_CONTRACTS[G7_TYPE_COERCION].bodySha256 &&
    typeof node.meta === 'string' && /^\{\{ title: '(Questions|Answers)', exec: false \}\}$/.test(node.meta)
  if (node.meta !== null && node.meta !== undefined && !legacyMeta) {
    throw new Error(`Code fence metadata is not supported in the structural class: ${label}`)
  }
  return {
    language: typeof node.lang === 'string' ? node.lang : '',
    lines: node.value.split('\n').length,
    inCodeGroup,
    hasMeta: Boolean(legacyMeta),
  }
}

function literalG3cHeading(node: Record<string, unknown>, label: string): AnchorEvidence {
  // remark parses a standalone single-line JSX heading as text JSX inside a
  // paragraph; the reader's MDX pipeline promotes it to flow JSX before rehype.
  const heading = staticHeading(node.type === 'mdxJsxTextElement'
    ? { ...node, type: 'mdxJsxFlowElement' } : node)
  if (!heading || !Object.hasOwn(G3C_HEADINGS, heading.id) ||
      heading.title !== G3C_HEADINGS[heading.id as keyof typeof G3C_HEADINGS]) {
    throw new Error(`Only exact static G3C h2 ID/title pairs with one literal id and plain text are supported: ${label}`)
  }
  return { text: heading.title, id: heading.id }
}

function literalHeading(node: Record<string, unknown>, label: string, policy: SurfacePolicy): AnchorEvidence {
  if (!policy.g7 && !policy.practice) return literalG3cHeading(node, label)
  const heading = staticHeading(node.type === 'mdxJsxTextElement' ? { ...node, type: 'mdxJsxFlowElement' } : node)
  if (!heading) throw new Error(`G7 h2 requires one literal id and plain text: ${label}`)
  return { id: heading.id, text: heading.title }
}

function validatePhrasingNode(node: unknown, label: string, links: LinkEvidence[], policy: SurfacePolicy = {}): void {
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
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, links, policy))
      return
    case 'link': {
      if (typeof node.url !== 'string' || node.title !== null) {
        throw new Error(`Unsupported link form in ${label}`)
      }
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, links, policy))
      links.push({ text: toString(node), href: node.url, kind: 'internal' })
      return
    }
    case 'image':
      if (!policy.practice || !policy.imageUrl || node.url !== policy.imageUrl ||
          node.alt !== PRACTICE_PROMISE_DIAGRAM.alt || node.title !== null) {
        throw new Error(`Only the exact bound Promise diagram is supported: ${label}`)
      }
      links.push({ text: PRACTICE_PROMISE_DIAGRAM.alt, href: policy.imageUrl, kind: 'external-https' })
      return
    default:
      throw new Error(`Unsupported MDX node type in structural class: ${node.type} (${label})`)
  }
}

function validateFlowNode(
  node: unknown,
  label: string,
  evidence: MdxSurfaceEvidence,
  inCodeGroup = false,
  policy: SurfacePolicy = {},
): void {
  if (!isRecord(node) || typeof node.type !== 'string') {
    throw new Error(`Unsupported MDX node in ${label}`)
  }
  switch (node.type) {
    case 'mdxjsEsm':
      throw new Error(`Nested MDX imports/exports are not supported in ${label}`)
    case 'heading':
      if (typeof node.depth !== 'number' || node.depth < 1 || node.depth > 6) {
        throw new Error(`Unsupported heading depth in ${label}`)
      }
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links, policy))
      return
    case 'paragraph': {
      const children = childrenOf(node)
      const onlyChild = children[0]
      if ((policy.g3c || policy.g7 || policy.practice) && children.length === 1 && isRecord(onlyChild) &&
          onlyChild.type === 'mdxJsxTextElement' && onlyChild.name === 'h2') {
        literalHeading(onlyChild, label, policy)
        return
      }
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links, policy))
      return
    }
    case 'list':
      if (typeof node.ordered !== 'boolean') throw new Error(`Unsupported list form in ${label}`)
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
      return
    case 'listItem':
      if (node.checked !== null && node.checked !== undefined) {
        throw new Error(`Task-list items are not supported in ${label}`)
      }
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
      return
    case 'blockquote':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
      return
    case 'table':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
      return
    case 'tableRow':
      childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
      return
    case 'tableCell':
      childrenOf(node).forEach((child) => validatePhrasingNode(child, label, evidence.links, policy))
      return
    case 'code':
      evidence.codeBlocks.push(codeEvidence(node, inCodeGroup, policy, label))
      return
    case 'mdxJsxFlowElement': {
      const name = node.name
      const attributes = Array.isArray(node.attributes) ? node.attributes : []
      if (name === 'h2' && (policy.g3c || policy.g7 || policy.practice)) {
        literalHeading(node, label, policy)
        return
      }
      if (name === 'details' && policy.g3c && policy.disclosureLabel) {
        const [first, ...contents] = childrenOf(node)
        const summary = isRecord(first) && first.type === 'paragraph' && childrenOf(first).length === 1
          ? childrenOf(first)[0] : first
        const text = childrenOf(summary)
        if (attributes.length || !isRecord(summary) ||
            !['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(String(summary.type)) ||
            summary.name !== 'summary' || !Array.isArray(summary.attributes) || summary.attributes.length ||
            text.length !== 1 || !isRecord(text[0]) || text[0].type !== 'text' ||
            text[0].value !== policy.disclosureLabel || !contents.length ||
            evidence.components.some(component => component.name === 'details')) {
          throw new Error(`Only one attribute-free G3C file disclosure with its exact plain-text summary is supported: ${label}`)
        }
        evidence.components.push({ name: 'details', count: 1 })
        contents.forEach(child => validateFlowNode(child, label, evidence, false, { ...policy, disclosureLabel: undefined }))
        return
      }
      if (name === 'Note') {
        if (attributes.length) throw new Error(`Note attributes are not supported in ${label}`)
        evidence.components.push({ name: 'Note', count: 1 })
        childrenOf(node).forEach((child) => validateFlowNode(child, label, evidence, false, policy))
        return
      }
      if (name === 'CodeGroup') {
        if (attributes.length) throw new Error(`CodeGroup attributes are not supported in ${label}`)
        const panels = childrenOf(node)
        if (!panels.length) throw new Error(`CodeGroup requires at least one code panel in ${label}`)
        const group: CodeGroupEvidence = { panels: [] }
        const panelLabels = new Set<string>()
        for (const panel of panels) {
          if (!isRecord(panel) || panel.type !== 'code') {
            throw new Error(`CodeGroup may contain only code panels in ${label}`)
          }
          const code = codeEvidence(panel, true, policy, label)
          const legacyTitle = code.hasMeta && typeof panel.meta === 'string'
            ? /title: '(Questions|Answers)'/.exec(panel.meta)?.[1] : undefined
          const panelLabel = getPanelTitle({ language: code.language, title: legacyTitle })
          if (panelLabels.has(panelLabel)) {
            throw new Error(`Duplicate rendered CodeGroup panel label in ${label}: ${panelLabel}`)
          }
          panelLabels.add(panelLabel)
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

function headingEvidence(tree: unknown, policy: SurfacePolicy = {}) {
  const h1: string[] = []
  const h2: AnchorEvidence[] = []
  const counter = slugifyWithCounter()
  function visitNode(node: unknown, parent?: unknown) {
    if (!isRecord(node)) return
    if (node.type === 'heading') {
      const text = toString(node)
      if (node.depth === 1) h1.push(text)
      if (node.depth === 2) h2.push({ text, id: counter(text) })
    }
    if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'h2') {
      if (node.type === 'mdxJsxTextElement' &&
          (!isRecord(parent) || parent.type !== 'paragraph' || childrenOf(parent).length !== 1)) {
        throw new Error('A literal G3C h2 must be a standalone heading, not inline phrasing')
      }
      h2.push(literalHeading(node, 'heading inventory', policy))
    }
    childrenOf(node).forEach(child => visitNode(child, node))
  }
  visitNode(tree)
  return { h1, h2 }
}

function emptyEvidence(): MdxSurfaceEvidence {
  return { h1: [], h2: [], links: [], codeBlocks: [], codeGroups: [], components: [] }
}

function summarizeMdx(markdown: string, label: string, allowMetadataExport: boolean, requestedPolicy: SurfacePolicy = {}): MdxSurfaceEvidence {
  const rawSha256 = digest(markdown)
  const imageUrl = allowMetadataExport && requestedPolicy.promiseDiagram
    ? rawSha256 === requestedPolicy.promiseDiagram.beforeSha256 ? PRACTICE_PROMISE_DIAGRAM.beforeUrl
      : rawSha256 === requestedPolicy.promiseDiagram.afterSha256 ? PRACTICE_PROMISE_DIAGRAM.afterUrl : undefined
    : undefined
  const policy = {
    ...requestedPolicy,
    legacySha256: requestedPolicy.legacySha256 === rawSha256 ? requestedPolicy.legacySha256 : undefined,
    imageUrl,
  }
  const tree = parser.parse(markdown)
  const evidence = emptyEvidence()
  const esmValues = topLevelEsmValues(tree)
  if (allowMetadataExport ? esmValues.length !== 1 : esmValues.length !== 0) {
    throw new Error(`Unsupported MDX import/export in ${label}`)
  }
  for (const value of esmValues) {
    if (!allowMetadataExport || !/^export\s+const\s+metadata\s*=/.test(value.trim())) {
      throw new Error(`Unsupported MDX import/export in ${label}`)
    }
  }
  for (const child of childrenOf(tree)) {
    if (isRecord(child) && child.type === 'mdxjsEsm') continue
    validateFlowNode(child, label, evidence, false, policy)
  }
  if (requestedPolicy.promiseDiagram) {
    let images = 0
    const countImages = (node: unknown) => {
      if (isRecord(node) && node.type === 'image') images++
      for (const child of childrenOf(node)) countImages(child)
    }
    countImages(tree)
    if (!imageUrl || images !== 1) throw new Error(`The bound Promise diagram must be retained exactly once: ${label}`)
    evidence.images = [{ url: imageUrl, alt: PRACTICE_PROMISE_DIAGRAM.alt }]
  }
  const headings = headingEvidence(tree, policy)
  evidence.h1 = headings.h1
  evidence.h2 = headings.h2
  if (policy.g3c && !policy.legacySha256) {
    if (allowMetadataExport) {
      assertG3cBodyMetadata(tree, label)
      if (!isDeepStrictEqual(evidence.h1, [G3C_BODY_TITLE]) ||
          !isDeepStrictEqual(evidence.h2, Object.entries(G3C_HEADINGS).map(([id, text]) => ({ id, text })))) {
        throw new Error(`G3C requires the exact approved body H1 and nine heading destinations: ${label}`)
      }
    } else if (evidence.h1.length || evidence.h2.length) {
      throw new Error(`G3C question/answer sections must use H3 or deeper, not H1/H2: ${label}`)
    }
  }
  if (policy.g7 && !policy.legacySha256 && allowMetadataExport) {
    const contract = G7_CONTRACTS[policy.g7]
    assertG3cBodyMetadata(tree, label, contract.bodyMetadata)
    if (!isDeepStrictEqual(evidence.h1, [contract.bodyMetadata.title]) ||
        !isDeepStrictEqual(evidence.h2, contract.headings.map(({ id, title }) => ({ id, text: title })))) {
      throw new Error(`G7 requires the approved body H1 and exact heading ID/title pairs: ${label}`)
    }
  }
  evidence.components = [...new Map(evidence.components.map((item) => [item.name, {
    name: item.name,
    count: evidence.components.filter((component) => component.name === item.name).length,
  }])).values()]
  return evidence
}

function assertG3cBodyMetadata(
  tree: unknown,
  label: string,
  expected = { title: G3C_BODY_TITLE, description: G3C_BODY_DESCRIPTION },
) {
  const esm = childrenOf(tree).find(node => isRecord(node) && node.type === 'mdxjsEsm')
  const program = isRecord(esm) && isRecord(esm.data) ? esm.data.estree : undefined
  const statements = isRecord(program) && Array.isArray(program.body) ? program.body : []
  const statement = statements[0]
  const declaration = isRecord(statement) ? statement.declaration : undefined
  const declarations = isRecord(declaration) && Array.isArray(declaration.declarations) ? declaration.declarations : []
  const variable = declarations[0]
  const object = isRecord(variable) ? variable.init : undefined
  const properties = isRecord(object) && Array.isArray(object.properties) ? object.properties : []
  const values: Record<string, unknown> = {}
  if (statements.length !== 1 || !isRecord(statement) || statement.type !== 'ExportNamedDeclaration' ||
      !isRecord(declaration) || declaration.type !== 'VariableDeclaration' || declaration.kind !== 'const' ||
      declarations.length !== 1 || !isRecord(variable) || !isRecord(variable.id) ||
      variable.id.type !== 'Identifier' || variable.id.name !== 'metadata' ||
      !isRecord(object) || object.type !== 'ObjectExpression' || properties.length !== 2) {
    throw new Error(`G3C requires only the approved static metadata export: ${label}`)
  }
  for (const property of properties) {
    if (!isRecord(property) || property.type !== 'Property' || property.kind !== 'init' ||
        property.computed || property.method || property.shorthand || !isRecord(property.key) ||
        !isRecord(property.value) || property.value.type !== 'Literal' || typeof property.value.value !== 'string') {
      throw new Error(`G3C metadata must contain only static title/description strings: ${label}`)
    }
    const key = property.key.type === 'Identifier' ? property.key.name : property.key.value
    if (typeof key !== 'string' || Object.hasOwn(values, key)) throw new Error(`Duplicate G3C metadata property: ${label}`)
    values[key] = property.value.value
  }
  if (!isDeepStrictEqual(values, expected)) {
    throw new Error(`Unapproved G3C body metadata: ${label}`)
  }
}

function assertStructuralMdxSurface(
  before: string,
  after: string,
  label: string,
  allowMetadataExport: boolean,
  policy: SurfacePolicy = {},
) {
  if (!after.trim()) throw new Error(`Empty content is not supported in the structural class: ${label}`)
  const beforeTree = parser.parse(before)
  const afterTree = parser.parse(after)
  const beforeEsm = topLevelEsmValues(beforeTree)
  const afterEsm = topLevelEsmValues(afterTree)
  if (!policy.g3c && !policy.g7 && !isDeepStrictEqual(beforeEsm, afterEsm)) {
    throw new Error(`Metadata export/import surface changed in structural class: ${label}`)
  }
  const beforeEvidence = summarizeMdx(before, label, allowMetadataExport, policy)
  const afterEvidence = summarizeMdx(after, label, allowMetadataExport, policy)
  if (!policy.g3c && !policy.g7 && !isDeepStrictEqual(beforeEvidence.h1, afterEvidence.h1)) {
    throw new Error(`H1 text changed in structural class: ${label}`)
  }
  const afterH2 = new Set(afterEvidence.h2.map((heading) => heading.id))
  const missing = beforeEvidence.h2.filter((heading) => !afterH2.has(heading.id))
  // G7's complete body bindings admit only its exact approved heading mapping,
  // including the two explicit Coercion legacy destinations on recovery.
  if (missing.length && !(policy.g7 && allowMetadataExport)) {
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

function idsFrom(evidence: MdxSurfaceEvidence, label?: string) {
  const ids = new Set<string>()
  for (const heading of evidence.h2) {
    if (label && !heading.id) throw new Error(`Empty generated H2 anchor in ${label}`)
    if (label && ids.has(heading.id)) throw new Error(`Duplicate generated H2 anchor in ${label}: ${heading.id}`)
    ids.add(heading.id)
  }
  return ids
}

function state(label: string, markdown: string, allowMetadataExport: boolean, policy: SurfacePolicy = {}): SurfaceState {
  const evidence = summarizeMdx(markdown, label, allowMetadataExport, policy)
  return { label, sha256: digest(markdown), evidence, ids: idsFrom(evidence, label) }
}

function looseHeadingIds(markdown: string, policy: SurfacePolicy = {}): Set<string> {
  return idsFrom({ ...emptyEvidence(), ...headingEvidence(parser.parse(markdown), policy) })
}

function promiseDiagramPolicy(contract?: ReturnType<typeof requirePracticeBinding>['lessons'][number]) {
  return contract?.uid === PRACTICE_PROMISE_DIAGRAM.lesson &&
    contract.body.before.rawSha256 === PRACTICE_PROMISE_DIAGRAM.beforeBodySha256
    ? { beforeSha256: contract.body.before.rawSha256, afterSha256: contract.body.after.rawSha256 }
    : undefined
}

function buildCatalog(
  files: Map<string, Buffer>,
  label: string,
  selectedUid = STRUCTURAL_LESSON_UID,
  practiceBinding?: ReturnType<typeof requirePracticeBinding>['lessons'][number],
  sharedRoutes?: Catalog['routes'],
): Catalog {
  const routes = sharedRoutes ?? new Map<string, Set<string>>()
  let selectedLesson: LessonState | undefined
  const addRoute = (route: string, ids: Iterable<string> = []) => {
    const existing = routes.get(route) ?? new Set<string>()
    for (const id of ids) existing.add(id)
    routes.set(route, existing)
  }
  for (const [filename, raw] of files) {
    if (sharedRoutes) break
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
      const g7 = isG7Lesson(lesson.sourceUid) ? lesson.sourceUid : undefined
      if (!sharedRoutes) {
        const ids = looseHeadingIds(bodyRaw.toString('utf8'), { g7 })
        for (const problem of lesson.problems) {
          for (const id of looseHeadingIds(problem.question, { g7 })) ids.add(id)
          for (const id of looseHeadingIds(problem.answer, { g7 })) ids.add(id)
        }
        for (const anchor of cardAnchors) ids.add(anchor.id)
        if (lesson.problems.length) ids.add(PRACTICE_PROBLEMS_PREFIX.slice(1))
        addRoute(lesson.route, ids)
      }
      if (lesson.sourceUid === selectedUid) {
        const g3c = selectedUid === G3C_LESSON_UID
        const practice = Boolean(practiceBinding)
        const body = state(`${label} ${lesson.bodyPath}`, bodyRaw.toString('utf8'), true,
          g7 ? { g7, practice, legacySha256: G7_CONTRACTS[g7].bodySha256 } : practiceBinding
            ? { practice, legacySha256: practiceBinding.body.before.rawSha256, promiseDiagram: promiseDiagramPolicy(practiceBinding) }
            : g3c ? { g3c, legacySha256: G3C_LEGACY_BODY_SHA256 } : {})
        const questions = lesson.problems.map((problem) =>
          state(`${label} ${lesson.sourceUid} question ${problem.id}`, problem.question, false, {
            g3c, g7, practice,
            legacySha256: practiceBinding
              ? practiceBinding.assessments.find(item => item.id === problem.id)?.before.questionSha256 ?? digest(problem.question)
              : undefined,
            disclosureLabel: g3c && problem.id === G3C_TASK.id ? 'Open the complete starter files' : undefined,
          }))
        const answers = lesson.problems.map((problem) =>
          state(`${label} ${lesson.sourceUid} answer ${problem.id}`, problem.answer, false,
            g7 ? { g7, practice, legacySha256: G7_CONTRACTS[g7].problems.find(item => item.id === problem.id)?.answerSha256 }
              : practiceBinding ? {
                practice,
                // The batch's protected-source hash already freezes every unselected answer.
                legacySha256: practiceBinding.assessments.find(item => item.id === problem.id)?.before.answerSha256 ?? digest(problem.answer),
              }
                : answerSurfacePolicy(g3c, problem.id)))
        selectedLesson = { lesson, body, questions, answers, cardAnchors }
      }
    }
  }
  if (!selectedLesson) throw new Error(`Selected structural lesson missing: ${selectedUid}`)
  return { routes, selectedLesson }
}

function selectedLessonConfig(config: ParsedConfig, filename: string, selectedUid = STRUCTURAL_LESSON_UID) {
  const lesson = config.lessons.find((item) => item.sourceUid === selectedUid)
  if (!lesson) throw new Error(`Selected structural lesson missing in ${filename}`)
  if (selectedUid === G3B_LESSON_UID) {
    if (![3, 4].includes(lesson.problems.length) ||
        lesson.problems.some((problem, index) => problem.contentId !== G3B_CARD_ORDER[index])) {
      throw new Error('G3B requires the three unchanged cards and only the optional fourth canonical task')
    }
  } else if (selectedUid === G3C_LESSON_UID) {
    const ids = [...G3C_OLD_TASK_IDS, G3C_TASK.id]
    if (![5, 6].includes(lesson.problems.length) || lesson.problems.some((problem, index) => problem.id !== ids[index])) {
      throw new Error('G3C requires the five unchanged cards and only the optional sixth canonical task')
    }
  } else if (lesson.problems.length !== 5 || lesson.problems.some((problem) => !problem.id)) {
    throw new Error(`${STRUCTURAL_CHANGE_CLASS} requires the existing five TS Basics problem records`)
  }
  return lesson
}

function assertNoPairwiseAnchorConflicts(
  base: LessonState,
  candidate: LessonState,
  g7?: G7LessonUid,
  variableQuestions = false,
  retainedBodyCards?: { ids: readonly string[]; beforeSha256: string; afterSha256: string },
): StructuralSurfaceReport['anchorConflictProof'] {
  const groups: { name: string; variants: SurfaceState[] }[] = [
    { name: 'lesson body', variants: [base.body, candidate.body] },
    ...candidate.answers.map((answer, index) => ({
      name: `answer ${candidate.lesson.problems[index]?.id}`,
      variants: base.answers[index] ? [base.answers[index], answer] : [answer],
    })),
    ...(g7 || variableQuestions ? candidate.questions.map((question, index) => ({
      name: `question ${candidate.lesson.problems[index]?.id}`,
      variants: [base.questions[index], question],
    })) : []),
  ]
  const fixed = [
    { text: 'Practice Problems', id: PRACTICE_PROBLEMS_PREFIX.slice(1) },
    ...candidate.cardAnchors,
    ...(g7 || variableQuestions ? [] : candidate.questions.flatMap((question) => question.evidence.h2)),
  ]
  const fixedIds = new Map<string, string>()
  for (const anchor of fixed) {
    if (!anchor.id) throw new Error('Empty fixed reader anchor')
    if (fixedIds.has(anchor.id)) throw new Error(`Duplicate fixed reader anchor: ${anchor.id}`)
    fixedIds.set(anchor.id, anchor.text)
  }
  const compatible = new Set<string>()
  for (const group of groups) {
    for (const variant of group.variants) {
      for (const id of variant.ids) {
        if (fixedIds.has(id)) {
          const oldCard = base.lesson.problems.find(problem => problem.cardAnchor === id)
          const nextCard = candidate.lesson.problems.find(problem => problem.cardAnchor === id)
          const retainedBodyCard = group.name === 'lesson body' && retainedBodyCards?.ids.includes(id) &&
            [retainedBodyCards.beforeSha256, retainedBodyCards.afterSha256].includes(variant.sha256) &&
            base.body.ids.has(id) && candidate.body.ids.has(id) &&
            oldCard?.type === 'THEORY' && nextCard?.type === 'THEORY' &&
            !isPracticeAssessment(oldCard.contentId) && isDeepStrictEqual(oldCard, nextCard)
          const legacyBody = g7 === G7_TYPE_COERCION && group.name === 'lesson body' &&
            variant.sha256 === G7_CONTRACTS[G7_TYPE_COERCION].bodySha256
          const legacyIds = ['truthy-and-falsy-values', 'the-operators-dual-nature']
          const collisions = [...variant.ids].filter(value => fixedIds.has(value)).sort()
          if (!retainedBodyCard &&
              (!legacyBody || !isDeepStrictEqual(collisions, [...legacyIds].sort()) || !legacyIds.includes(id))) {
            throw new Error(`Structural heading anchor collides with fixed reader anchor: ${id}`)
          }
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
    checked: 'Pairwise proof over individually nonempty/unique base/candidate heading IDs, with the practice heading, problem cards and unchanged question headings reserved.',
    fixedProblemCardAnchors: candidate.cardAnchors,
    fixedReaderAnchors: fixed,
    pairwiseCompatibleIds: [...compatible].sort(),
  }
}

function structuralScope(baseRoot: string, candidateRoot: string, lesson: string, changeClass: StructuralChangeClass | typeof ADDITIVE_CHANGE_CLASS): ScopeReport {
  normalizeReleaseScopeOptions({ changeClass, lesson })
  const additive = changeClass === ADDITIVE_CHANGE_CLASS
  const g3c = additive && lesson === G3C_LESSON_UID
  const nativeTask = g3c ? G3C_TASK : G3B_TASK
  const taskName = g3c ? 'G3C' : 'G3B'
  const configPath = g3c ? G3C_CONFIG_PATH : additive ? G3B_CONFIG_PATH : STRUCTURAL_CONFIG_PATH
  const lessonPath = additive ? `content/${lesson}/page.mdx` : STRUCTURAL_LESSON_PATH
  const before = payloadFiles(baseRoot)
  const after = payloadFiles(candidateRoot)
  if (!isDeepStrictEqual([...before.keys()], [...after.keys()])) {
    throw new Error('Structural publishing cannot add, remove or move payload files')
  }
  const beforeG3b = validateKnownSourceTask(before)
  const afterG3b = validateKnownSourceTask(after)
  const beforeG3c = validateKnownG3cSourceTask(before)
  const afterG3c = validateKnownG3cSourceTask(after)
  if ((g3c || beforeG3c || afterG3c) && (!beforeG3b || !afterG3b)) {
    throw new Error('G3C requires the complete retained G3B task in both catalogs')
  }
  if ((g3c || beforeG3b) && !isDeepStrictEqual(beforeG3b, afterG3b)) {
    throw new Error('The retained G3B task is immutable; recovery must keep its complete record')
  }
  if ((!g3c || beforeG3c) && !isDeepStrictEqual(beforeG3c, afterG3c)) {
    throw new Error('The retained G3C task is immutable; creation requires its exact selected profile')
  }
  const beforeTask = g3c ? beforeG3c : beforeG3b
  const afterTask = g3c ? afterG3c : afterG3b
  if (beforeTask && !isDeepStrictEqual(beforeTask, afterTask)) {
    throw new Error(`The retained ${taskName} task is immutable; recovery must keep its complete record`)
  }
  const selectedBeforeRaw = before.get(configPath)
  const selectedAfterRaw = after.get(configPath)
  if (!selectedBeforeRaw || !selectedAfterRaw) {
    throw new Error(`Selected structural lesson config missing: ${configPath}`)
  }
  const selectedBeforeConfig = parseDetailedConfig(selectedBeforeRaw, configPath)
  const selectedAfterConfig = parseDetailedConfig(selectedAfterRaw, configPath)
  const selectedBefore = selectedLessonConfig(selectedBeforeConfig, configPath, lesson)
  const selectedAfter = selectedLessonConfig(selectedAfterConfig, configPath, lesson)
  if (additive && !beforeTask && afterTask) {
    const metadata = selectedAfterConfig.metadata as { lessons: { id: string; problems: unknown[] }[] }
    metadata.lessons.find(item => item.id === selectedAfter.id)!.problems.pop()
  }
  if (!isDeepStrictEqual(selectedBeforeConfig.metadata, selectedAfterConfig.metadata)) {
    throw new Error(`Metadata, question contract, identity or ordering change: ${configPath}`)
  }
  selectedBeforeConfig.lessons.forEach((baselineLesson, lessonIndex) => {
    const candidateLesson = selectedAfterConfig.lessons[lessonIndex]
    if (!candidateLesson || baselineLesson.sourceUid !== candidateLesson.sourceUid) {
      throw new Error(`Metadata, question contract, identity or ordering change: ${configPath}`)
    }
    if (baselineLesson.sourceUid === lesson) return
    baselineLesson.problems.forEach((problem, problemIndex) => {
      if (problem.answer !== candidateLesson.problems[problemIndex]?.answer) {
        throw new Error(`Only ${additive ? taskName : 'TS Basics'} answers may change in ${configPath}`)
      }
    })
  })
  for (const [filename, raw] of before) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename) || filename === configPath) continue
    const candidate = after.get(filename)!
    if (!raw.equals(candidate)) {
      throw new Error(`File is outside the supported structural class: ${filename}`)
    }
  }
  for (const [filename, raw] of before) {
    if (!/^content\/[^/]+\/[^/]+\/_lessons\.json$/.test(filename)) continue
    if (filename === configPath) continue
    const baseline = parseDetailedConfig(raw, filename)
    const candidate = parseDetailedConfig(after.get(filename)!, filename)
    if (!isDeepStrictEqual(baseline.metadata, candidate.metadata)) {
      throw new Error(`Metadata, question contract, identity or ordering change: ${filename}`)
    }
  }

  const baseCatalog = buildCatalog(before, 'base', lesson)
  const candidateCatalog = buildCatalog(after, 'candidate', lesson)
  if (additive && !beforeTask) {
    for (const surface of [baseCatalog.selectedLesson.body, ...baseCatalog.selectedLesson.answers]) {
      validateLinks(surface.evidence, selectedBefore.route, [baseCatalog], surface.label)
    }
  }
  // Creation precedes all dependent old-field writes, so this one card exists
  // in every admitted mixed state. No other candidate-only anchor is admitted.
  if (additive && afterTask) baseCatalog.routes.get(selectedBefore.route)!.add(nativeTask.id)
  const changedFiles: ScopeReport['changedFiles'] = []
  const changedSurfaces: StructuralSurfaceReport['changedSurfaces'] = []

  const addChangedFile = (filename: string, oldBody: Buffer, newBody: Buffer) => {
    changedFiles.push({ path: filename, beforeSha256: digest(oldBody), afterSha256: digest(newBody) })
  }

  for (const [filename, oldBody] of before) {
    const newBody = after.get(filename)!
    if (oldBody.equals(newBody)) continue
    if (filename !== configPath && filename !== lessonPath) {
      throw new Error(`File is outside the supported structural class: ${filename}`)
    }
    addChangedFile(filename, oldBody, newBody)
  }
  if (g3c && changedFiles.length && !afterTask) {
    throw new Error('G3C authored changes require the complete canonical task before dependent writes')
  }

  if (!before.get(lessonPath)) throw new Error(`Selected structural lesson body missing: ${lessonPath}`)
  const beforeBody = before.get(lessonPath)!.toString('utf8')
  const afterBody = after.get(lessonPath)!.toString('utf8')
  const bodyEvidence = assertStructuralMdxSurface(beforeBody, afterBody, lessonPath, true,
    g3c ? { g3c, legacySha256: G3C_LEGACY_BODY_SHA256 } : {})
  bodyEvidence.before.links = validateLinks(bodyEvidence.before, selectedBefore.route, [baseCatalog, candidateCatalog], lessonPath)
  bodyEvidence.after.links = validateLinks(bodyEvidence.after, selectedBefore.route, [baseCatalog, candidateCatalog], lessonPath)
  if (beforeBody !== afterBody) {
    changedSurfaces.push({
      kind: 'lesson-body', lesson, contentId: selectedBefore.contentId,
      sourcePath: lessonPath, field: 'body',
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
      `${configPath} answer ${problem.id}`,
      false,
      answerSurfacePolicy(g3c, problem.id),
    )
    evidence.before.links = validateLinks(evidence.before, selectedBefore.route, [baseCatalog, candidateCatalog], `${problem.id} answer`)
    evidence.after.links = validateLinks(evidence.after, selectedBefore.route, [baseCatalog, candidateCatalog], `${problem.id} answer`)
    if (problem.answer !== candidate.answer) {
      changedSurfaces.push({
        kind: 'problem-answer', lesson, contentId: problem.contentId,
        problemId: problem.id, title: problem.title, sourcePath: configPath,
        field: 'answer', beforeSha256: digest(problem.answer), afterSha256: digest(candidate.answer),
        before: evidence.before, after: evidence.after,
      })
    }
  })

  const nativeSurfaces = additive && afterTask ? {
    answer: candidateCatalog.selectedLesson.answers[g3c ? 5 : 3].evidence,
    question: candidateCatalog.selectedLesson.questions[g3c ? 5 : 3].evidence,
  } : undefined
  if (nativeSurfaces) {
    nativeSurfaces.answer.links = validateLinks(nativeSurfaces.answer, selectedBefore.route, [baseCatalog, candidateCatalog], `${taskName} free answer`)
    nativeSurfaces.question.links = validateLinks(nativeSurfaces.question, selectedBefore.route, [baseCatalog, candidateCatalog], `${taskName} question`)
  }
  const anchorConflictProof = assertNoPairwiseAnchorConflicts(baseCatalog.selectedLesson, candidateCatalog.selectedLesson)
  const allowedChangedFields: StructuralField[] = [
    { kind: 'lesson', lesson, contentId: selectedBefore.contentId, sourcePath: lessonPath, field: 'body' },
    ...selectedBefore.problems.filter(problem => problem.contentId !== nativeTask.contentId).map((problem): StructuralField => ({
      kind: 'problem', lesson, contentId: problem.contentId,
      configPath, problemId: problem.id, title: problem.title, field: 'answer',
    })),
  ]
  const reviewedLinks = [
    ...changedSurfaces.flatMap(surface => [...surface.before.links, ...surface.after.links]),
    ...(nativeSurfaces ? [...nativeSurfaces.answer.links, ...nativeSurfaces.question.links] : []),
  ]
  const externalHttpsDestinations = [...new Set(reviewedLinks
    .filter(link => link.kind === 'external-https').map(link => link.href))].sort()

  return {
    changedFiles,
    ...(additive && !beforeTask && afterTask && nativeSurfaces ? { addition: {
      contentId: nativeTask.contentId, questionSha256: digest(selectedAfter.problems.at(-1)!.question), answerSha256: digest(afterTask.answer),
      ...nativeSurfaces,
    } } : {}),
    structural: {
      changeClass,
      profile: g3c ? G3C_ADDITIVE_PROFILE : additive ? ADDITIVE_PROFILE : STRUCTURAL_PROFILE,
      lesson,
      allowedChangedFields,
      changedSurfaces,
      anchorConflictProof,
      externalHttpsDestinations,
      limits: [
        'Eligibility and compatibility only; pedagogical correctness, free-feedback sufficiency and human approval are not established.',
        'External HTTPS destinations are syntax-checked and recorded for review, not semantically verified.',
        g3c ? 'Only the selected G3C body, five old answers and the complete canonical sixth task are writable. Both retained native tasks are immutable. Final full-question/setup binding and independent review are required.'
          : additive ? 'Only the selected G3B body, three old answers and the complete canonical fourth task are writable; the retained task is immutable.' : 'Only the selected TS Basics body and its existing five answer fields are writable in this profile.',
        additive ? 'Only the canonical new task card may be a candidate-only link target, after complete creation. All other links must resolve in both source catalogs.' : 'Local fragment links must resolve in both base and candidate source catalogs; links to newly introduced anchors are rejected in this minimum profile.',
        g3c ? 'Only hash-frozen legacy body/answers may use the legacy fence exceptions. Restoring that exact body also restores its legacy export/H1 pair; this is compatibility, not quality endorsement.'
          : 'Recovery plans must retain every H2 anchor present in the current base source. Literal reversal that removes published anchors fails closed; use an explicitly reviewed compatible recovery source instead.',
        'Same-field generated navigation and reader hash behavior still require real reader evidence outside this machine scope check.',
      ],
    },
  }
}

function validateKnownSourceTask(files: Map<string, Buffer>) {
  let task: ReturnType<typeof assertG3bSourceTask> | undefined
  for (const [filename, raw] of files) {
    const match = /^content\/([^/]+)\/([^/]+)\/_lessons\.json$/.exec(filename)
    if (!match) continue
    const config = JSON.parse(raw.toString('utf8'))
    for (const lesson of config.lessons ?? []) {
      for (const problem of lesson.problems ?? []) {
        if (problem.id !== G3B_TASK.id && problem.title !== G3B_TASK.title &&
            (typeof problem.title !== 'string' || contentSlug(problem.title) !== G3B_TASK.slug)) continue
        if (task) throw new Error('Duplicate G3B source task identity')
        task = assertG3bSourceTask(problem, `/${match[1]}/${match[2]}${lesson.id}`)
        const selected = parseDetailedConfig(raw, filename).lessons.find(item => item.contentId === G3B_LESSON_CONTENT_ID)
        if (!selected || !isDeepStrictEqual(selected.problems.map(item => item.contentId), [...G3B_CARD_ORDER])) {
          throw new Error('G3B requires exactly the three old cards followed by its one native task')
        }
      }
    }
  }
  return task
}

function validateKnownG3cSourceTask(files: Map<string, Buffer>) {
  let task: ReturnType<typeof assertG3cSourceTask> | undefined
  for (const [filename, raw] of files) {
    const match = /^content\/([^/]+)\/([^/]+)\/_lessons\.json$/.exec(filename)
    if (!match) continue
    const config = JSON.parse(raw.toString('utf8'))
    for (const lesson of config.lessons ?? []) {
      const contentId = `/${match[1]}/${match[2]}${lesson.id}`
      if (contentId === G3C_LESSON_CONTENT_ID) {
        const { problems, ...metadata } = lesson
        if (!isDeepStrictEqual(metadata, G3C_LESSON_METADATA) || !Array.isArray(problems) ||
            ![5, 6].includes(problems.length)) throw new Error('G3C canonical lesson metadata and five old tasks must be preserved')
        G3C_OLD_CONTRACTS.forEach((contract, index) => {
          const problem = problems[index]
          if (!isRecord(problem) || typeof problem.question !== 'string' || typeof problem.answer !== 'string') {
            throw new Error('Missing G3C old question/answer')
          }
          const { question, answer: _answer, ...problemMetadata } = problem
          if (digest(question) !== contract.questionSha256 || !isDeepStrictEqual(problemMetadata, {
            id: contract.id, title: contract.title, difficulty: contract.difficulty, type: 'THEORY', href: '',
          })) throw new Error('G3C old question contract, identity, metadata or ordering changed')
        })
        if (problems.length === 6 && problems[5]?.id !== G3C_TASK.id) {
          throw new Error('Only the exact G3C source-sixth task is permitted')
        }
      }
      for (const problem of lesson.problems ?? []) {
        if (problem.id !== G3C_TASK.id && problem.title !== G3C_TASK.title &&
            (typeof problem.title !== 'string' || contentSlug(problem.title) !== G3C_TASK.slug)) continue
        if (task) throw new Error('Duplicate G3C source task identity')
        task = assertG3cSourceTask(problem, contentId)
        if (lesson.problems.length !== 6 || lesson.problems[5] !== problem) {
          throw new Error('G3C requires exactly five old cards followed by its native task')
        }
      }
    }
  }
  return task
}

function g7Scope(baseRoot: string, candidateRoot: string, lesson: G7LessonUid): ScopeReport {
  const binding = requireG7Binding(lesson)
  const contract = G7_CONTRACTS[lesson]
  const before = payloadFiles(baseRoot)
  const after = payloadFiles(candidateRoot)
  const lessonPath = `content/${lesson}/page.mdx`
  if (!isDeepStrictEqual([...before.keys()], [...after.keys()])) {
    throw new Error('G7 cannot add, remove or move payload files')
  }
  for (const validate of [validateKnownSourceTask, validateKnownG3cSourceTask]) {
    const retained = validate(before)
    if (!retained || !isDeepStrictEqual(retained, validate(after))) {
      throw new Error('G7 requires both complete immutable retained G3B/G3C tasks')
    }
  }
  const changedFiles: ScopeReport['changedFiles'] = []
  for (const [filename, raw] of before) {
    const next = after.get(filename)!
    if (raw.equals(next)) continue
    if (filename !== G7_CONFIG_PATH && filename !== lessonPath) {
      throw new Error(`File is outside the selected G7 lesson: ${filename}`)
    }
    changedFiles.push({ path: filename, beforeSha256: digest(raw), afterSha256: digest(next) })
  }
  function config(files: Map<string, Buffer>) {
    const raw = files.get(G7_CONFIG_PATH)
    if (!raw) throw new Error('Missing G7 configuration')
    const parsed: unknown = JSON.parse(raw.toString('utf8'))
    if (!isRecord(parsed) || !Array.isArray(parsed.lessons)) throw new Error('Invalid G7 configuration')
    const selected = parsed.lessons.filter(item => isRecord(item) && item.id === contract.metadata.id)
    if (selected.length !== 1) throw new Error('G7 requires exactly one selected existing lesson')
    assertG7SourceLesson(selected[0], lesson)
    return {
      selected: selected[0],
      other: { ...parsed, lessons: parsed.lessons.map(item => item === selected[0] ? null : item) },
    }
  }
  const beforeConfig = config(before), afterConfig = config(after)
  if (!isDeepStrictEqual(beforeConfig.other, afterConfig.other)) {
    throw new Error('G7 permits changes only to the selected lesson object, not its shared configuration neighbors')
  }
  const beforeBody = before.get(lessonPath)?.toString('utf8')
  const afterBody = after.get(lessonPath)?.toString('utf8')
  if (!beforeBody || !afterBody) throw new Error('Missing G7 body')
  assertG7Body(beforeBody, lesson)
  assertG7Body(afterBody, lesson)
  const baseCatalog = buildCatalog(before, 'base', lesson)
  const candidateCatalog = buildCatalog(after, 'candidate/recovery', lesson)
  const selectedBefore = baseCatalog.selectedLesson.lesson
  const selectedAfter = candidateCatalog.selectedLesson.lesson
  const catalogs = [baseCatalog, candidateCatalog]
  const changedSurfaces: StructuralSurfaceReport['changedSurfaces'] = []
  const recordSurface = (
    oldText: string, nextText: string, field: 'body' | 'question' | 'answer',
    contentId: string, policy: SurfacePolicy, problem?: ProblemConfig,
  ) => {
    const sourcePath = field === 'body' ? lessonPath : G7_CONFIG_PATH
    const label = `${sourcePath}:${problem?.id ?? 'body'}:${field}`
    const evidence = assertStructuralMdxSurface(oldText, nextText, label, field === 'body', policy)
    evidence.before.links = validateLinks(evidence.before, selectedBefore.route, catalogs, label)
    evidence.after.links = validateLinks(evidence.after, selectedBefore.route, catalogs, label)
    if (oldText !== nextText) changedSurfaces.push({
      kind: field === 'body' ? 'lesson-body' : field === 'question' ? 'problem-question' : 'problem-answer',
      lesson, contentId, sourcePath, field, ...(problem ? { problemId: problem.id, title: problem.title } : {}),
      beforeSha256: digest(oldText), afterSha256: digest(nextText),
      before: evidence.before, after: evidence.after,
    })
  }
  recordSurface(beforeBody, afterBody, 'body', selectedBefore.contentId, { g7: lesson, legacySha256: contract.bodySha256 })
  selectedBefore.problems.forEach((problem, index) => {
    const next = selectedAfter.problems[index]
    recordSurface(problem.question, next.question, 'question', problem.contentId, { g7: lesson }, problem)
    recordSurface(problem.answer, next.answer, 'answer', problem.contentId,
      { g7: lesson, legacySha256: contract.problems[index].answerSha256 }, problem)
  })
  const anchorConflictProof = assertNoPairwiseAnchorConflicts(baseCatalog.selectedLesson, candidateCatalog.selectedLesson, lesson)
  return {
    changedFiles,
    assessment: {
      bindingSha256: g7ValueHash(binding),
      sourceLessonBeforeSha256: g7ValueHash(beforeConfig.selected),
      sourceLessonAfterSha256: g7ValueHash(afterConfig.selected),
    },
    structural: {
      changeClass: G7_CHANGE_CLASS, profile: G7_PROFILE, lesson,
      allowedChangedFields: [
        { kind: 'lesson', lesson, contentId: selectedBefore.contentId, sourcePath: lessonPath, field: 'body' },
        ...selectedBefore.problems.map((problem): StructuralField => ({
          kind: 'problem', lesson, contentId: problem.contentId, configPath: G7_CONFIG_PATH,
          problemId: problem.id, title: problem.title,
          field: contract.changedQuestions.includes(problem.id) ? 'assessment' : 'answer',
        })),
      ],
      changedSurfaces, anchorConflictProof,
      externalHttpsDestinations: [...new Set(changedSurfaces.flatMap(surface => [...surface.before.links, ...surface.after.links])
        .filter(link => link.kind === 'external-https').map(link => link.href))].sort(),
      limits: [
        'One existing G7 lesson only, with exact reviewed complete source and compiled bindings. No new identities.',
        'Changed question/answer/type records are indivisible conditional updates; other answers and the body remain independent.',
        'Only the exact retained Coercion body hash may collide with its two named question cards before or during recovery. Candidate IDs are unique.',
        'Old shared Coercion fragments intentionally become question-card destinations; recovery restores the legacy ambiguity.',
        'Links must resolve in both catalogs. Eligibility is not semantic, browser, database, search, progress or owner-acceptance evidence.',
      ],
    },
  }
}

export function assertKnownSourceCatalog(root: string) {
  const files = payloadFiles(root)
  const g3b = validateKnownSourceTask(files)
  const g3c = validateKnownG3cSourceTask(files)
  if (g3c && !g3b) throw new Error('G3C requires the complete retained G3B task')
  return g3b
}

function practiceScope(baseRoot: string, candidateRoot: string): ScopeReport {
  const binding = requirePracticeBinding()
  const before = payloadFiles(baseRoot), after = payloadFiles(candidateRoot)
  assertPracticeSource(before)
  assertPracticeSource(after)
  if (!isDeepStrictEqual([...before.keys()], [...after.keys()])) {
    throw new Error('The practice batch cannot add, remove or move payload files')
  }
  for (const validate of [validateKnownSourceTask, validateKnownG3cSourceTask]) {
    const retained = validate(before)
    if (!retained || !isDeepStrictEqual(retained, validate(after))) {
      throw new Error('The practice batch must retain the complete G3B/G3C tasks')
    }
  }
  const allowedPaths = new Set(binding.lessons.flatMap(({ uid }) => [
    `content/${uid}/page.mdx`, `content/${uid.split('/').slice(0, 2).join('/')}/_lessons.json`,
  ]))
  const changedFiles: ScopeReport['changedFiles'] = []
  for (const [filename, bytes] of before) {
    const next = after.get(filename)!
    if (bytes.equals(next)) continue
    if (!allowedPaths.has(filename)) throw new Error(`File is outside the reviewed practice batch: ${filename}`)
    changedFiles.push({ path: filename, beforeSha256: digest(bytes), afterSha256: digest(next) })
  }
  const changedSurfaces: StructuralSurfaceReport['changedSurfaces'] = []
  const allowedChangedFields: StructuralField[] = []
  const proofs: { lesson: string; proof: StructuralSurfaceReport['anchorConflictProof'] }[] = []
  let beforeRoutes: Catalog['routes'] | undefined
  let afterRoutes: Catalog['routes'] | undefined
  for (const contract of binding.lessons) {
    const lesson = contract.uid
    const bodyPath = `content/${lesson}/page.mdx`
    const configPath = `content/${lesson.split('/').slice(0, 2).join('/')}/_lessons.json`
    const baseCatalog = buildCatalog(before, 'base practice', lesson, contract, beforeRoutes)
    const candidateCatalog = buildCatalog(after, 'candidate/recovery practice', lesson, contract, afterRoutes)
    beforeRoutes = baseCatalog.routes
    afterRoutes = candidateCatalog.routes
    const oldLesson = baseCatalog.selectedLesson
    const nextLesson = candidateCatalog.selectedLesson
    const g7 = isG7Lesson(lesson) ? lesson : undefined
    const recordSurface = (
      oldText: string, nextText: string, field: 'body' | 'question' | 'answer',
      legacySha256: string, problem?: ProblemConfig,
    ) => {
      const sourcePath = field === 'body' ? bodyPath : configPath
      const label = `${sourcePath}:${problem?.id ?? 'body'}:${field}`
      const policy = {
        practice: true, g7, legacySha256,
        ...(field === 'body' ? { promiseDiagram: promiseDiagramPolicy(contract) } : {}),
      }
      const evidence = assertStructuralMdxSurface(oldText, nextText, label, field === 'body', policy)
      evidence.before.links = validateLinks(evidence.before, oldLesson.lesson.route, [baseCatalog, candidateCatalog], label)
      evidence.after.links = validateLinks(evidence.after, oldLesson.lesson.route, [baseCatalog, candidateCatalog], label)
      if (oldText !== nextText) changedSurfaces.push({
        kind: field === 'body' ? 'lesson-body' : field === 'question' ? 'problem-question' : 'problem-answer',
        lesson, contentId: problem?.contentId ?? `/${lesson}`, sourcePath, field,
        ...(problem ? { problemId: problem.id, title: problem.title } : {}),
        beforeSha256: digest(oldText), afterSha256: digest(nextText),
        before: evidence.before, after: evidence.after,
      })
    }
    recordSurface(before.get(bodyPath)!.toString('utf8'), after.get(bodyPath)!.toString('utf8'), 'body', contract.body.before.rawSha256)
    allowedChangedFields.push({ kind: 'lesson', lesson, contentId: `/${lesson}`, sourcePath: bodyPath, field: 'body' })
    for (const assessment of contract.assessments) {
      const oldProblem = oldLesson.lesson.problems.find(problem => problem.id === assessment.id)
      const nextProblem = nextLesson.lesson.problems.find(problem => problem.id === assessment.id)
      if (!oldProblem || !nextProblem) throw new Error('Missing bound practice assessment surface')
      recordSurface(oldProblem.question, nextProblem.question, 'question', assessment.before.questionSha256, oldProblem)
      recordSurface(oldProblem.answer, nextProblem.answer, 'answer', assessment.before.answerSha256, oldProblem)
      allowedChangedFields.push({
        kind: 'problem', lesson, contentId: oldProblem.contentId, configPath,
        problemId: oldProblem.id, title: oldProblem.title, field: 'assessment',
      })
    }
    const retained = PRACTICE_RETAINED_BODY_CARDS[lesson]
    const retainedBodyCards = retained?.beforeBodySha256 === contract.body.before.rawSha256
      ? { ids: retained.ids, beforeSha256: retained.beforeBodySha256, afterSha256: contract.body.after.rawSha256 }
      : undefined
    proofs.push({ lesson, proof: assertNoPairwiseAnchorConflicts(oldLesson, nextLesson, g7, true, retainedBodyCards) })
  }
  const qualify = (lesson: string, anchor: AnchorEvidence): AnchorEvidence =>
    ({ text: anchor.text, id: `${lesson}#${anchor.id}` })
  return {
    changedFiles,
    assessment: {
      bindingSha256: practiceValueHash(binding),
      sourceLessonBeforeSha256: practiceValueHash([...before].map(([file, bytes]) => [file, digest(bytes)])),
      sourceLessonAfterSha256: practiceValueHash([...after].map(([file, bytes]) => [file, digest(bytes)])),
    },
    structural: {
      changeClass: PRACTICE_CHANGE_CLASS, profile: PRACTICE_PROFILE, lesson: '',
      allowedChangedFields, changedSurfaces,
      anchorConflictProof: {
        checked: 'Each selected lesson independently, including every before/after question, answer and body combination. IDs in this aggregate are lesson-qualified.',
        fixedProblemCardAnchors: proofs.flatMap(({ lesson, proof }) => proof.fixedProblemCardAnchors.map(anchor => qualify(lesson, anchor))),
        fixedReaderAnchors: proofs.flatMap(({ lesson, proof }) => proof.fixedReaderAnchors.map(anchor => qualify(lesson, anchor))),
        pairwiseCompatibleIds: proofs.flatMap(({ lesson, proof }) => proof.pairwiseCompatibleIds.map(id => `${lesson}#${id}`)),
      },
      externalHttpsDestinations: [...new Set(changedSurfaces.flatMap(surface => [...surface.before.links, ...surface.after.links])
        .filter(link => link.kind === 'external-https').map(link => link.href))].sort(),
      limits: [
        'Only the exact 17 bound lessons and 29 complete existing assessment groups. Exactly 24 reviewed type changes; no new identities.',
        'All other source and compiled catalog payloads are frozen, including published Data Types and retained G3B/G3C tasks.',
        'A question, answer, type and both compiled fields are one conditional row update. Body and assessment recovery remain independent.',
        'The exact Coercion legacy-fragment exception remains scoped to its original body hash and two existing IDs.',
        'Three unchanged body/theory-card ambiguities remain at their existing destinations: pure-functions, well-known-symbols, registering-a-service-worker. Only the exact bound body versions and unchanged protected theory cards qualify.',
        'The one existing Promise diagram is retained with its exact alt text. The original before body keeps its old URL; the bound candidate uses the verified canonical MDN image URL. No other image surface is admitted.',
        'Eligibility is not correctness, pedagogy, browser, database, progress, independent review or production acceptance.',
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
  if (normalized.changeClass === PRACTICE_CHANGE_CLASS) return practiceScope(baseRoot, candidateRoot)
  if (normalized.changeClass === G7_CHANGE_CLASS) {
    if (!isG7Lesson(normalized.lesson)) throw new Error('Unsupported G7 lesson')
    return g7Scope(baseRoot, candidateRoot, normalized.lesson)
  }
  if (normalized.changeClass !== DEFAULT_CHANGE_CLASS) {
    return structuralScope(baseRoot, candidateRoot, normalized.lesson, normalized.changeClass)
  }
  const before = payloadFiles(baseRoot)
  const after = payloadFiles(candidateRoot)
  const beforeTask = validateKnownSourceTask(before)
  const afterTask = validateKnownSourceTask(after)
  const beforeG3c = validateKnownG3cSourceTask(before)
  const afterG3c = validateKnownG3cSourceTask(after)
  if (!isDeepStrictEqual(beforeG3c, afterG3c)) {
    throw new Error('The G3C task is immutable outside its approved creation')
  }
  if ((beforeG3c || afterG3c) && (!beforeTask || !afterTask)) {
    throw new Error('G3C requires the complete retained G3B task')
  }
  if (!isDeepStrictEqual(beforeTask, afterTask)) {
    throw new Error('The G3B task is immutable outside its approved creation')
  }
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
