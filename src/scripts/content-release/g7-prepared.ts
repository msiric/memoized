import { isDeepStrictEqual } from 'node:util'
import {
  G7_CONTRACTS, assertG7Body, g7Digest, g7LessonMetadata, g7ProblemMetadata,
  g7ValueHash, requireG7Binding, type G7LessonUid,
} from '@/lib/g7-contracts'
import type { InventoryRow } from './catalog'
import { G3B_TASK } from '@/lib/g3b-task'
import { G3C_TASK } from '@/lib/g3c-task'

/** Source and compiler checks precede database access, including on reverse plans. */
export function assertG7PreparedCatalog(rows: InventoryRow[], lesson: G7LessonUid) {
  const binding = requireG7Binding(lesson)
  const contract = G7_CONTRACTS[lesson]
  if ([G3B_TASK, G3C_TASK].some(task => !rows.some(row => row.kind === 'problem' && row.contentId === task.contentId))) {
    throw new Error('G7 requires both complete retained native tasks in the prepared catalog')
  }
  const body = rows.find(row => row.kind === 'lesson' && row.contentId === `/${lesson}`)
  if (!body || !isDeepStrictEqual(body.metadata, g7LessonMetadata(lesson)) || !body.text.body) {
    throw new Error('G7 prepared lesson metadata or body mismatch')
  }
  if (assertG7Body(body.text.body, lesson) === 'after' && g7ValueHash(body.serialized.body) !== binding.serializedBodySha256) {
    throw new Error('G7 compiled body differs from the complete reviewed binding')
  }
  const problems = rows.filter(row => row.kind === 'problem' && row.metadata.lessonContentId === `/${lesson}`)
  if (problems.length !== contract.problems.length) throw new Error('G7 prepared assessment inventory mismatch')
  contract.problems.forEach((frozen, index) => {
    const actual = problems[index]
    const reviewed = binding.problems[index]
    if (actual.contentId !== `/${lesson}/${frozen.id}` || !actual.text.question?.trim() || !actual.text.answer?.trim()) {
      throw new Error('G7 prepared assessment identity, ordering or complete payload mismatch')
    }
    const before = isDeepStrictEqual(actual.metadata, g7ProblemMetadata(lesson, frozen, 'THEORY')) &&
      g7Digest(actual.text.question) === frozen.questionSha256 && g7Digest(actual.text.answer) === frozen.answerSha256
    const after = isDeepStrictEqual(actual.metadata, g7ProblemMetadata(lesson, frozen, reviewed.type)) &&
      g7Digest(actual.text.question) === reviewed.questionSha256 && g7Digest(actual.text.answer) === reviewed.answerSha256 &&
      g7ValueHash(actual.serialized.question) === reviewed.serializedQuestionSha256 &&
      g7ValueHash(actual.serialized.answer) === reviewed.serializedAnswerSha256
    if (!before && !after) throw new Error('G7 prepared question/answer/type/compiled payload is not one complete bound assessment')
  })
}
