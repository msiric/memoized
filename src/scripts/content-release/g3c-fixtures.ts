import fs from 'node:fs'
import path from 'node:path'
import { G3B_CARD_ORDER, G3B_LESSON_UID, G3B_TASK } from '@/lib/g3b-task'
import { G3C_BODY_DESCRIPTION, G3C_BODY_TITLE, G3C_HEADINGS, G3C_LESSON_UID, G3C_TASK } from '@/lib/g3c-task'

// Synthetic capability fixtures only. None is a reviewed learner payload.
export const syntheticQuestion = 'Synthetic complete question.\n\n### Readiness and setup\n\nUse the complete synthetic setup below.\n\n<details>\n<summary>Open the complete starter files</summary>\n\n```jsx\nexport const Example = () => <input aria-label="Example" />\n```\n\n```tsx\nexport const Example = (): JSX.Element => <input aria-label="Example" />\n```\n\n</details>\n'
export const syntheticOldQuestion = (index: number) => `Frozen synthetic old question ${index}.`
export const syntheticLegacyAnswer = (index: number) => `Legacy answer ${index}.\n\n\`\`\`\nLegacy plain text ${index}\n\`\`\`\n\n\`\`\`typescript\nGET /legacy-context\n\`\`\`\n`
export const syntheticLegacyBody = `export const metadata = { title: 'Legacy baseline' }\n\n# Legacy baseline\n\n${
  Object.keys(G3C_HEADINGS).map(id => `## ${id.replaceAll('-', ' ')}\n\nLegacy explanation.`).join('\n\n')
}\n\n\`\`\`python\nprint("frozen legacy")\n\`\`\`\n\n\`\`\`plaintext\nLegacy context\n\`\`\`\n`
export const syntheticBody = `export const metadata = ${JSON.stringify({ title: G3C_BODY_TITLE, description: G3C_BODY_DESCRIPTION })}\n\n# ${G3C_BODY_TITLE}\n\n${
  Object.entries(G3C_HEADINGS).map(([id, title]) => `<h2 id="${id}">${title}</h2>\n\nA synthetic explanation with [practice](#${G3C_TASK.id}).`).join('\n\n')
}\n`
export const syntheticAnswer = (index: number) => `${index === 5 ? '<details>\n<summary>Open the complete reference files</summary>\n\n' : ''}Revised synthetic answer ${index}.\n\n### Details\n\nSee [the stable body section](#introduction-to-coding-interviews) or [the new card](#${G3C_TASK.id}).\n\n<CodeGroup>\n\n\`\`\`jsx\nexport const Example = () => <input aria-label="Example" />\n\`\`\`\n\n\`\`\`tsx\nexport const Example = (): JSX.Element => <input aria-label="Example" />\n\`\`\`\n\n</CodeGroup>\n\n\`\`\`css\ninput { max-width: 100%; }\n\`\`\`\n\n\`\`\`html\n<div id="root"></div>\n\`\`\`\n${index === 5 ? '\n</details>\n' : ''}`
export const g3cConfigPath = 'content/js-track/frontend-development/_lessons.json'
export const g3cBodyPath = `content/${G3C_LESSON_UID}/page.mdx`
export const g3bConfigPath = 'content/dsa-track/common-techniques/_lessons.json'

export function writeFixture(root: string, filename: string, text: string) {
  fs.mkdirSync(path.dirname(path.join(root, filename)), { recursive: true })
  fs.writeFileSync(path.join(root, filename), text)
}

export function editFixture(root: string, mutate: (lesson: Record<string, any>) => void) {
  const config = JSON.parse(fs.readFileSync(path.join(root, g3cConfigPath), 'utf8'))
  mutate(config.lessons[0])
  writeFixture(root, g3cConfigPath, JSON.stringify(config))
}

export function syntheticNativeSource() {
  return {
    id: G3C_TASK.id, title: G3C_TASK.title, type: G3C_TASK.type, difficulty: G3C_TASK.difficulty,
    href: G3C_TASK.href, question: syntheticQuestion, answer: syntheticAnswer(5),
  }
}

export function sourceFixture(
  contracts: readonly { id: string; title: string; difficulty: string }[],
  add = false,
  mask = 0,
) {
  const root = fs.mkdtempSync(path.join(process.cwd(), '.g3c-source-test-'))
  const problems = contracts.map((contract, index) => ({
    id: contract.id, title: contract.title, difficulty: contract.difficulty, type: 'THEORY', href: '',
    question: syntheticOldQuestion(index), answer: mask & (1 << (index + 1)) ? syntheticAnswer(index) : syntheticLegacyAnswer(index),
  }))
  if (add) problems.push(syntheticNativeSource())
  for (const [filename, text] of [
    [g3cConfigPath, JSON.stringify({ lessons: [{
      id: '/frontend-interviews', title: 'Frontend Interviews', description: 'Practice common frontend interview questions.',
      order: 15, access: 'PREMIUM', problems,
    }] })],
    [g3cBodyPath, mask & 1 ? syntheticBody : syntheticLegacyBody],
    [g3bConfigPath, JSON.stringify({ lessons: [{
      id: '/longest-common-substring', title: 'Longest Common Substring', description: 'Unchanged',
      order: 20, access: 'PREMIUM',
      problems: [
        ...['Longest Common Prefix', 'Longest Common Subsequence', 'Edit Distance'].map((title, index) => ({
          id: G3B_CARD_ORDER[index].split('/').pop(), title, question: 'Unchanged G3B question.',
          type: 'CODING', difficulty: ['EASY', 'MEDIUM', 'HARD'][index], href: '', answer: 'Unchanged G3B answer.',
        })),
        { id: G3B_TASK.id, title: G3B_TASK.title, question: G3B_TASK.question, answer: 'Complete retained G3B answer.',
          type: G3B_TASK.type, difficulty: G3B_TASK.difficulty, href: '' },
      ],
    }] })],
    [`content/${G3B_LESSON_UID}/page.mdx`, "export const metadata = { title: 'Longest Common Substring' }\n\n# Longest Common Substring\n\nUnchanged body.\n"],
    ['resources/reference/page.mdx', '# Reference\n'],
  ]) writeFixture(root, filename, text)
  return root
}
