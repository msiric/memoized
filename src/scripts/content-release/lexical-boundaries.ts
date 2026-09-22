import {
  LEXICAL_BODIES, LEXICAL_BODY_UIDS, LEXICAL_CONFIG_PATH, LEXICAL_QUESTION_ID,
  isLexicalAssessment, isLexicalRegrade, lexicalBodyVersions,
  lexicalRawHash, lexicalValueHash, requireLexicalBinding,
  type LexicalAssessmentBinding, type LexicalBodyUid,
} from '@/lib/lexical-publication'
import { assertCompiledMdx } from '@/lib/mdx-result'
import { catalogMap, type InventoryRow } from './catalog'

type SourceAssessment = { question: string; answer: string; difficulty: string }
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
function sourceUnits(files: Map<string, Buffer>) {
  const bodies = new Map<LexicalBodyUid, string>()
  const assessments = new Map<string, SourceAssessment>()
  const protectedFiles = [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([filename, bytes]) => {
    const uid = LEXICAL_BODY_UIDS.find(uid => LEXICAL_BODIES[uid].sourcePath === filename)
    if (uid) {
      bodies.set(uid, bytes.toString('utf8'))
      return { path: filename, sha256: lexicalRawHash('[bound lexical body]') }
    }
    if (filename !== LEXICAL_CONFIG_PATH) return { path: filename, sha256: lexicalRawHash(bytes) }
    const parsed: unknown = JSON.parse(bytes.toString('utf8'))
    if (!record(parsed) || !Array.isArray(parsed.lessons)) throw new Error('Invalid lexical source configuration')
    const lessons = parsed.lessons.map(lesson => {
      if (!record(lesson) || typeof lesson.id !== 'string' || !Array.isArray(lesson.problems)) {
        throw new Error('Invalid lexical source lesson')
      }
      const problems = lesson.problems.map(problem => {
        if (!record(problem) || typeof problem.id !== 'string') throw new Error('Invalid lexical source assessment')
        const contentId = `/js-track/core-fundamentals${lesson.id}/${problem.id}`
        if (!isLexicalAssessment(contentId)) return problem
        const { question, answer, difficulty } = problem
        if (typeof question !== 'string' || !question.trim() || typeof answer !== 'string' || !answer.trim() ||
            typeof difficulty !== 'string' || problem.type !== 'THEORY') throw new Error('Incomplete lexical assessment')
        if (assessments.has(contentId)) throw new Error('Duplicate lexical assessment')
        assessments.set(contentId, { question, answer, difficulty })
        return {
          ...problem, answer: null,
          ...(contentId === LEXICAL_QUESTION_ID ? { question: null } : {}),
          ...(isLexicalRegrade(contentId) ? { difficulty: null } : {}),
        }
      })
      return { ...lesson, problems }
    })
    return { path: filename, sha256: lexicalValueHash({ ...parsed, lessons }) }
  })
  if (bodies.size !== 5 || assessments.size !== 13) throw new Error('Incomplete lexical source inventory')
  return { bodies, assessments, protectedFiles }
}
export function lexicalProtectedSourceHash(files: Map<string, Buffer>): string {
  return lexicalValueHash(sourceUnits(files).protectedFiles)
}
function matchesAssessment(actual: SourceAssessment, expected: LexicalAssessmentBinding): boolean {
  return actual.difficulty === expected.difficulty &&
    lexicalRawHash(actual.question) === expected.questionSha256 &&
    lexicalRawHash(actual.answer) === expected.answerSha256
}
export function assertLexicalSource(files: Map<string, Buffer>) {
  const binding = requireLexicalBinding()
  const units = sourceUnits(files)
  if (lexicalValueHash(units.protectedFiles) !== binding.protectedSourceSha256) {
    throw new Error('Unreviewed lexical metadata, retained pairs, neighbors or payload inventory')
  }
  for (const body of binding.bodies) {
    const raw = units.bodies.get(body.uid)
    if (!raw || !lexicalBodyVersions(body).some(version => lexicalRawHash(raw) === version.rawSha256)) {
      throw new Error(`Unreviewed lexical body: ${body.uid}`)
    }
  }
  for (const item of binding.assessments) {
    const actual = units.assessments.get(item.contentId)
    if (!actual || ![item.before, item.after].some(version => matchesAssessment(actual, version))) {
      throw new Error(`Lexical question, answer and difficulty must form a complete bound assessment: ${item.contentId}`)
    }
  }
}
export function lexicalProtectedPreparedHash(rows: InventoryRow[]): string {
  const masked = rows.map(({ kind, contentId, metadata, text, serialized }) => {
    if (LEXICAL_BODY_UIDS.some(uid => LEXICAL_BODIES[uid].kind === kind && LEXICAL_BODIES[uid].contentId === contentId)) {
      return { kind, contentId, metadata, text: { ...text, body: null }, serialized: { ...serialized, body: null } }
    }
    if (kind === 'problem' && isLexicalAssessment(contentId)) {
      return {
        kind, contentId, metadata: { ...metadata, ...(isLexicalRegrade(contentId) ? { difficulty: null } : {}) },
        text: { ...text, answer: null, ...(contentId === LEXICAL_QUESTION_ID ? { question: null } : {}) },
        serialized: { ...serialized, answer: null, ...(contentId === LEXICAL_QUESTION_ID ? { question: null } : {}) },
      }
    }
    return { kind, contentId, metadata, text, serialized }
  }).sort((a, b) => {
    const left = `${a.kind}:${a.contentId}`, right = `${b.kind}:${b.contentId}`
    return left < right ? -1 : left > right ? 1 : 0
  })
  return lexicalValueHash(masked)
}
export function assertLexicalPreparedCatalog(rows: InventoryRow[]) {
  const binding = requireLexicalBinding()
  const catalog = catalogMap(rows)
  if (lexicalProtectedPreparedHash(rows) !== binding.protectedPreparedSha256) {
    throw new Error('Unreviewed lexical metadata, compilation, neighbors or catalog inventory')
  }
  for (const body of binding.bodies) {
    const contract = LEXICAL_BODIES[body.uid]
    const actual = catalog.get(`${contract.kind}:${contract.contentId}`)
    if (!actual?.text.body) throw new Error(`Missing lexical body: ${body.uid}`)
    assertCompiledMdx(actual.serialized.body, body.uid)
    if (!lexicalBodyVersions(body).some(version => lexicalRawHash(actual.text.body!) === version.rawSha256 &&
        lexicalValueHash(actual.serialized.body) === version.serializedSha256)) {
      throw new Error(`Lexical body raw/compiled pair differs from its binding: ${body.uid}`)
    }
  }
  for (const item of binding.assessments) {
    const actual = catalog.get(`problem:${item.contentId}`)
    if (!actual || actual.metadata.type !== 'THEORY' || typeof actual.metadata.difficulty !== 'string' ||
        typeof actual.text.question !== 'string' || typeof actual.text.answer !== 'string') {
      throw new Error('Incomplete prepared lexical assessment')
    }
    assertCompiledMdx(actual.serialized.question, item.contentId)
    assertCompiledMdx(actual.serialized.answer, item.contentId)
    const source = { question: actual.text.question, answer: actual.text.answer, difficulty: actual.metadata.difficulty }
    if (![item.before, item.after].some(version => matchesAssessment(source, version) &&
        lexicalValueHash(actual.serialized.question) === version.serializedQuestionSha256 &&
        lexicalValueHash(actual.serialized.answer) === version.serializedAnswerSha256)) {
      throw new Error(`Lexical assessment raw, compiled and difficulty state is not a complete bound version: ${item.contentId}`)
    }
  }
}
