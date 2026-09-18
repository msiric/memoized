import fs from 'node:fs'
import path from 'node:path'
import type * as G7 from '@/lib/g7-contracts'
import { G3C_OLD_CONTRACTS } from '@/lib/g3c-publication'
import { sourceFixture, writeFixture } from './g3c-fixtures'

type Contracts = typeof G7.G7_CONTRACTS
type Uid = G7.G7LessonUid
type G7Module = typeof G7

export const compiledG7 = (text: string) => ({ compiledSource: `synthetic compiled: ${text}`, scope: {}, frontmatter: {} })
export function syntheticG7Body(contract: Contracts[Uid], after: boolean) {
  const metadata = after ? contract.bodyMetadata : { title: 'Synthetic legacy body', description: 'Frozen synthetic legacy description.' }
  return `export const metadata = ${JSON.stringify(metadata)}\n\n# ${metadata.title}\n\n${contract.headings.map(heading =>
    `${after ? `<h2 id="${heading.id}">${heading.title}</h2>` : `## ${heading.beforeId.replaceAll('-', ' ')}`}\n\n${after ? 'Reviewed' : 'Legacy'} synthetic explanation.`,
  ).join('\n\n')}\n`
}
export function syntheticG7Lesson(contract: Contracts[Uid], after: boolean) {
  return {
    ...contract.metadata,
    problems: contract.problems.map(problem => ({
      id: problem.id, title: problem.title, difficulty: problem.difficulty,
      type: after && problem.id === contract.codingQuestion ? 'CODING' as const : 'THEORY' as const,
      href: '',
      question: `${after && contract.changedQuestions.includes(problem.id) ? 'Reviewed' : 'Frozen'} synthetic question ${problem.id}.`,
      answer: `${after ? 'Reviewed' : 'Frozen'} synthetic answer ${problem.id}.\n\n### Explanation\n\n\`\`\`javascript\nconst example = 1\n\`\`\`\n`,
    })),
  }
}

// Explicit vi.mock capability bindings ONLY. These are not reviewed learner content.
export function bindSyntheticG7(actual: G7Module): G7Module {
  for (const uid of [actual.G7_DATA_TYPES, actual.G7_TYPE_COERCION] as const) {
    const contract = actual.G7_CONTRACTS[uid]
    const before = syntheticG7Lesson(contract, false), after = syntheticG7Lesson(contract, true)
    contract.bodySha256 = actual.g7Digest(syntheticG7Body(contract, false))
    contract.sourceLessonSha256 = actual.g7ValueHash(before)
    contract.problems.forEach((problem, index) => {
      problem.questionSha256 = actual.g7Digest(before.problems[index].question)
      problem.answerSha256 = actual.g7Digest(before.problems[index].answer)
    })
    const body = syntheticG7Body(contract, true)
    actual.G7_REVIEWED_BINDINGS[uid] = {
      sourceLessonSha256: actual.g7ValueHash(after),
      bodySha256: actual.g7Digest(body), serializedBodySha256: actual.g7ValueHash(compiledG7(body)),
      problems: after.problems.map(problem => ({
        id: problem.id, type: problem.type,
        questionSha256: actual.g7Digest(problem.question), answerSha256: actual.g7Digest(problem.answer),
        serializedQuestionSha256: actual.g7ValueHash(compiledG7(problem.question)),
        serializedAnswerSha256: actual.g7ValueHash(compiledG7(problem.answer)),
      })),
    }
  }
  return actual
}

export function g7SourceFixture(contracts: Contracts, selected: Uid, after = false) {
  const root = sourceFixture(G3C_OLD_CONTRACTS, true)
  const uids: Uid[] = ['js-track/core-fundamentals/data-types', 'js-track/core-fundamentals/type-coercion']
  const lessons = uids.map(uid => syntheticG7Lesson(contracts[uid], uid === selected && after))
  lessons.push({ id: '/neighbor', title: 'Frozen neighbor', description: 'Unchanged',
    order: 3, access: 'FREE', problems: [] })
  writeFixture(root, 'content/js-track/core-fundamentals/_lessons.json', JSON.stringify({ lessons }))
  for (const uid of uids) {
    writeFixture(root, `content/${uid}/page.mdx`, syntheticG7Body(contracts[uid], uid === selected && after))
  }
  writeFixture(root, 'content/js-track/core-fundamentals/neighbor/page.mdx', '# Unchanged neighbor\n')
  return root
}

export function editG7Source(root: string, edit: (lesson: ReturnType<typeof syntheticG7Lesson>) => void, index = 0) {
  const filename = path.join(root, 'content/js-track/core-fundamentals/_lessons.json')
  const config: { lessons: ReturnType<typeof syntheticG7Lesson>[] } = JSON.parse(fs.readFileSync(filename, 'utf8'))
  edit(config.lessons[index])
  fs.writeFileSync(filename, JSON.stringify(config))
}

export function setSyntheticG7SourceState(root: string, contracts: Contracts, selected: Uid, mask: number) {
  const contract = contracts[selected]
  const before = syntheticG7Lesson(contract, false), after = syntheticG7Lesson(contract, true)
  const index = selected === 'js-track/core-fundamentals/data-types' ? 0 : 1
  editG7Source(root, lesson => {
    lesson.problems = before.problems.map((problem, index) => mask & (1 << (index + 1)) ? after.problems[index] : problem)
  }, index)
  writeFixture(root, `content/${selected}/page.mdx`, syntheticG7Body(contract, Boolean(mask & 1)))
}
