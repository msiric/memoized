import {
  PRACTICE_LESSONS, isPracticeAssessment, isPracticeLesson, practiceAssessmentIds,
  practiceRawHash, practiceValueHash, requirePracticeBinding,
  type PracticeAssessmentBinding,
} from '@/lib/practice-publication'
import type { InventoryRow } from './catalog'
import { catalogMap } from './catalog'
import { assertCompiledMdx } from '@/lib/mdx-result'

type SourceAssessment = { question: string; answer: string; type: string }
type SourceUnits = {
  bodies: Map<string, string>
  assessments: Map<string, SourceAssessment>
  protectedFiles: { path: string; sha256: string }[]
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function sourceUnits(files: Map<string, Buffer>): SourceUnits {
  const bodies = new Map<string, string>()
  const assessments = new Map<string, SourceAssessment>()
  const protectedFiles = [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([filename, bytes]) => {
    const bodyMatch = /^content\/(.+)\/page\.mdx$/.exec(filename)
    if (bodyMatch && isPracticeLesson(bodyMatch[1])) {
      bodies.set(bodyMatch[1], bytes.toString('utf8'))
      return { path: filename, sha256: practiceRawHash('[bound lesson body]') }
    }
    const configMatch = /^content\/([^/]+)\/([^/]+)\/_lessons\.json$/.exec(filename)
    if (!configMatch) return { path: filename, sha256: practiceRawHash(bytes) }
    const parsed: unknown = JSON.parse(bytes.toString('utf8'))
    if (!record(parsed) || !Array.isArray(parsed.lessons)) throw new Error('Invalid practice source configuration')
    const lessons = parsed.lessons.map(lesson => {
      if (!record(lesson) || typeof lesson.id !== 'string') throw new Error('Invalid practice source lesson')
      const uid = `${configMatch[1]}/${configMatch[2]}${lesson.id}`
      if (!isPracticeLesson(uid)) return lesson
      if (!Array.isArray(lesson.problems)) throw new Error('Missing practice source assessments')
      const expected = practiceAssessmentIds(uid)
      const problems = lesson.problems.map(problem => {
        if (!record(problem) || typeof problem.id !== 'string') throw new Error('Invalid practice source assessment')
        if (!expected.includes(problem.id)) return problem
        const { question, answer, type, ...metadata } = problem
        if (typeof question !== 'string' || !question.trim() ||
            typeof answer !== 'string' || !answer.trim() || typeof type !== 'string') {
          throw new Error('Incomplete practice source assessment')
        }
        const key = `/${uid}/${problem.id}`
        if (assessments.has(key)) throw new Error('Duplicate practice source assessment')
        assessments.set(key, { question, answer, type })
        return { ...metadata, question: null, answer: null, type: null }
      })
      return { ...lesson, problems }
    })
    return { path: filename, sha256: practiceValueHash({ ...parsed, lessons }) }
  })
  if (bodies.size !== PRACTICE_LESSONS.length ||
      assessments.size !== PRACTICE_LESSONS.reduce((sum, uid) => sum + practiceAssessmentIds(uid).length, 0)) {
    throw new Error('Incomplete practice source unit inventory')
  }
  return { bodies, assessments, protectedFiles }
}

export function practiceProtectedSourceHash(files: Map<string, Buffer>): string {
  return practiceValueHash(sourceUnits(files).protectedFiles)
}

function matchesSourceAssessment(actual: SourceAssessment, expected: PracticeAssessmentBinding): boolean {
  return actual.type === expected.type &&
    practiceRawHash(actual.question) === expected.questionSha256 &&
    practiceRawHash(actual.answer) === expected.answerSha256
}

export function assertPracticeSource(files: Map<string, Buffer>) {
  const binding = requirePracticeBinding()
  const units = sourceUnits(files)
  if (practiceValueHash(units.protectedFiles) !== binding.protectedSourceSha256) {
    throw new Error('Unreviewed practice source metadata, neighbors or payload inventory')
  }
  for (const lesson of binding.lessons) {
    const body = units.bodies.get(lesson.uid)
    if (!body || ![lesson.body.before, lesson.body.after].some(value => practiceRawHash(body) === value.rawSha256)) {
      throw new Error(`Unreviewed practice body: ${lesson.uid}`)
    }
    for (const item of lesson.assessments) {
      const actual = units.assessments.get(`/${lesson.uid}/${item.id}`)
      if (!actual || ![item.before, item.after].some(value => matchesSourceAssessment(actual, value))) {
        throw new Error(`Practice source must contain one complete bound assessment: ${lesson.uid}/${item.id}`)
      }
    }
  }
}

export function practiceProtectedPreparedHash(rows: InventoryRow[]): string {
  const masked = rows.map(({ kind, contentId, metadata, text, serialized }) => {
    if (kind === 'lesson' && isPracticeLesson(contentId.slice(1)) && contentId.startsWith('/')) {
      return { kind, contentId, metadata, text: { ...text, body: null }, serialized: { ...serialized, body: null } }
    }
    if (kind === 'problem' && isPracticeAssessment(contentId)) {
      return {
        kind, contentId, metadata: { ...metadata, type: null },
        text: { ...text, question: null, answer: null },
        serialized: { ...serialized, question: null, answer: null },
      }
    }
    return { kind, contentId, metadata, text, serialized }
  }).sort((a, b) => {
    const left = `${a.kind}:${a.contentId}`, right = `${b.kind}:${b.contentId}`
    return left < right ? -1 : left > right ? 1 : 0
  })
  return practiceValueHash(masked)
}

export function assertPracticePreparedCatalog(rows: InventoryRow[]) {
  const binding = requirePracticeBinding()
  const catalog = catalogMap(rows)
  if (practiceProtectedPreparedHash(rows) !== binding.protectedPreparedSha256) {
    throw new Error('Unreviewed practice metadata, compilation, neighbors or catalog inventory')
  }
  for (const lesson of binding.lessons) {
    const body = catalog.get(`lesson:/${lesson.uid}`)
    if (!body?.text.body) throw new Error(`Missing bound practice body: ${lesson.uid}`)
    assertCompiledMdx(body.serialized.body, `${lesson.uid}:body`)
    if (![lesson.body.before, lesson.body.after].some(value =>
      practiceRawHash(body.text.body!) === value.rawSha256 &&
      practiceValueHash(body.serialized.body) === value.serializedSha256)) {
      throw new Error(`Practice body raw/compiled state differs from its complete binding: ${lesson.uid}`)
    }
    for (const item of lesson.assessments) {
      const actual = catalog.get(`problem:/${lesson.uid}/${item.id}`)
      if (!actual || typeof actual.text.question !== 'string' || typeof actual.text.answer !== 'string' ||
          typeof actual.metadata.type !== 'string') throw new Error('Missing bound practice assessment')
      assertCompiledMdx(actual.serialized.question, `${actual.contentId}:question`)
      assertCompiledMdx(actual.serialized.answer, `${actual.contentId}:answer`)
      const source = { question: actual.text.question, answer: actual.text.answer, type: actual.metadata.type }
      if (![item.before, item.after].some(value => matchesSourceAssessment(source, value) &&
          practiceValueHash(actual.serialized.question) === value.serializedQuestionSha256 &&
          practiceValueHash(actual.serialized.answer) === value.serializedAnswerSha256)) {
        throw new Error(`Practice question, answer, type and compilation must form one bound assessment: ${actual.contentId}`)
      }
    }
  }
}
