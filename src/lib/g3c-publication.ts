import { createHash } from 'node:crypto'
import { G3C_LESSON_CONTENT_ID, G3C_OLD_TASK_IDS, G3C_TASK } from './g3c-task'

// Binds the complete independently reviewed question, readiness, files and
// tested lockfile. No runtime override or opening-only fallback is supported.
export const G3C_QUESTION_SHA256: string | null = 'a1347e5206fd10d79fa0437b4ab7f45ae12e2d72c278b45f89ce5ccf3cb17dab'
export const G3C_LEGACY_BODY_SHA256 = '74e29c007aaf5419f012542fd8b10c3aedc64fe913b667ace5ecb33bea246bab'
export const G3C_CONFIG_PATH = 'content/js-track/frontend-development/_lessons.json'
export const G3C_LESSON_METADATA = {
  id: '/frontend-interviews', title: 'Frontend Interviews',
  description: 'Practice common frontend interview questions.', order: 15, access: 'PREMIUM',
}
export const G3C_TASK_METADATA = {
  contentId: G3C_TASK.contentId, slug: G3C_TASK.slug, title: G3C_TASK.title,
  type: G3C_TASK.type, difficulty: G3C_TASK.difficulty, href: G3C_TASK.href,
  link: G3C_TASK.link, lessonContentId: G3C_LESSON_CONTENT_ID,
}

// Read from the complete five source records at content c90cb3e55e8bd89982857e352b2f3166e3eb3694.
export const G3C_OLD_CONTRACTS = [
  {
    id: G3C_OLD_TASK_IDS[0], title: 'The Five Frontend Interview Formats', difficulty: 'MEDIUM',
    questionSha256: '89e74e131685a6e80474eff00e9f3eb15cebae35be58876187d71d136f508e37',
    answerSha256: '65c735181d849daeb9c0c315cbcb8a70fd426d1166467fc283b7d310654e0dd7',
  },
  {
    id: G3C_OLD_TASK_IDS[1], title: 'Frontend System Design: The 6-Step Framework', difficulty: 'HARD',
    questionSha256: 'e6b02568169cf329a9151a008d101cad418e70ccacab10c5da88f8afe7fe3a41',
    answerSha256: 'de3b3b7b49a30565258d053c57fa4ab253431ea1b245971e6183dda081ef9676',
  },
  {
    id: G3C_OLD_TASK_IDS[2], title: 'JavaScript Implementation Challenges Catalog', difficulty: 'MEDIUM',
    questionSha256: '4db872d29f53af9049f844173dfc068e0cbbb36a79d15a1d50088bf38db80353',
    answerSha256: '9a8b989dbb045b6be8f0b997db1920630c0c28c1a893f510c499f502c792dca0',
  },
  {
    id: G3C_OLD_TASK_IDS[3], title: 'Live-Coding a React Component: What Interviewers Watch For', difficulty: 'MEDIUM',
    questionSha256: '44728afbf3e242d73a0a05cc04e1ae844c9d6f27c15df5a5a3a9f8c3b5915849',
    answerSha256: '0d9fd49481ca1664730aaa8cf66570966d5ed977617e5afd963a8100566037a9',
  },
  {
    id: G3C_OLD_TASK_IDS[4], title: 'Frontend Behavioral Questions: The Three Story Types', difficulty: 'EASY',
    questionSha256: '7c28dfb672ebe03e69c6128c8f7a1564b64f69de71023752b6adcdbf319f0b03',
    answerSha256: '39fb5473b1e1533977dbb8606993b4420e73cab8793064a5b3006ea8e181c3e9',
  },
] as const

export function assertG3cQuestion(question: unknown): asserts question is string {
  if (!G3C_QUESTION_SHA256 || !/^[a-f0-9]{64}$/.test(G3C_QUESTION_SHA256)) {
    throw new Error('G3C publication is pending the final complete reviewed question/setup SHA256 binding')
  }
  if (typeof question !== 'string' || !question.trim() ||
      createHash('sha256').update(question).digest('hex') !== G3C_QUESTION_SHA256) {
    throw new Error('G3C requires the exact complete reviewed question/setup payload')
  }
}
