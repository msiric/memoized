import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

export const G7_CHANGE_CLASS = 'existing-assessment-update-v1'
export const G7_PROFILE = 'g7-values-coercion-minimum'
export const G7_CONFIG_PATH = 'content/js-track/core-fundamentals/_lessons.json'
export const G7_DATA_TYPES = 'js-track/core-fundamentals/data-types'
export const G7_TYPE_COERCION = 'js-track/core-fundamentals/type-coercion'
export type G7LessonUid = typeof G7_DATA_TYPES | typeof G7_TYPE_COERCION
export type G7ProblemType = 'THEORY' | 'CODING'

export const g7Digest = (text: string) => createHash('sha256').update(text).digest('hex')
export function g7ValueHash(value: unknown): string {
  const canonical = (item: unknown): unknown => Array.isArray(item)
    ? item.map(canonical)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, child]) => [key, canonical(child)]))
      : item
  return g7Digest(JSON.stringify(canonical(value)))
}

type FrozenProblem = {
  id: string
  title: string
  difficulty: string
  questionSha256: string
  answerSha256: string
}
type LessonContract = {
  metadata: { id: string; title: string; description: string; order: number; access: 'FREE' }
  // Preparation stores the zero-based array position, not the source order label.
  preparedOrder: number
  bodySha256: string
  sourceLessonSha256: string
  bodyMetadata: { title: string; description: string }
  headings: { beforeId: string; id: string; title: string }[]
  problems: FrozenProblem[]
  changedQuestions: readonly string[]
  codingQuestion: string
}

// Frozen from git show a1c613747ff260a2d9fb1d8c7c2932057da9ab7c, never a working tree.
// The heading/body metadata pairs are the owner-approved G7-01 HEADINGS.json.
export const G7_CONTRACTS: Record<G7LessonUid, LessonContract> = {
  [G7_DATA_TYPES]: {
    metadata: { id: '/data-types', title: 'Data Types', description: 'Master JavaScript data types and structures.', order: 1, access: 'FREE' },
    preparedOrder: 0,
    bodySha256: '2a5daf4c55e156d2071568da4d653155fa5fb4527c346e1181985049427422a7',
    sourceLessonSha256: '73f53250beb0cf30e1d0dcb2c71ea4f926dd22cb7660a4ed17da8781885d24cb',
    bodyMetadata: {
      title: 'Data Types',
      description: 'Predict assignment and mutation, choose a JavaScript collection and explain key presence before tackling deeper copying.',
    },
    headings: [
      { beforeId: 'primitive-data-types', id: 'primitive-data-types', title: 'Values, bindings and identity' },
      { beforeId: 'objects', id: 'objects', title: 'Records and property presence' },
      { beforeId: 'arrays', id: 'arrays', title: 'Array operations for this task' },
      { beforeId: 'sets', id: 'sets', title: 'Uniqueness without losing identity' },
      { beforeId: 'maps', id: 'maps', title: 'Keyed data and counts' },
      { beforeId: 'weak-set-and-weak-map', id: 'weak-set-and-weak-map', title: 'Optional weak-key associations' },
      { beforeId: 'best-practices', id: 'best-practices', title: 'Choose a collection and state the contract' },
      { beforeId: 'exercises', id: 'exercises', title: 'Practice and a stopping point' },
    ],
    changedQuestions: ['modern-array-methods-at-findlast-findlastindex', 'implement-deepclone-structural-deep-copy'],
    codingQuestion: 'implement-deepclone-structural-deep-copy',
    problems: [
      { id: 'primitives-vs-objects', title: 'Primitives vs Objects', difficulty: 'EASY',
        questionSha256: 'fbdb2510bff45f61c032f8f4aae29c96a6ae62510ee9acf1a7fa42539b08b9ae',
        answerSha256: 'd2720fb765f1a076fba24687c38306edd67b5f2b2b318b73393473f2088a118c' },
      { id: 'modern-array-methods-at-findlast-findlastindex', title: 'Modern Array Methods: `at`, `findLast`, `findLastIndex`', difficulty: 'MEDIUM',
        questionSha256: 'bc8d29e915fc328736df91679bd2929bae65e098402c65aad7a2c94bbd9bba91',
        answerSha256: '589f7d6be3dd2d9ff21c31841568db4d617b48e95578d4fa1f157c56fd697b81' },
      { id: 'object-vs-map', title: 'Object vs Map', difficulty: 'MEDIUM',
        questionSha256: 'ca62cf99100c9d408e29d412d9453bd8aea33979c58606e5b3da53b9eb33cbf5',
        answerSha256: '4a1e97073b3217ea1555035a1e15e3fc7ebd4f4b508affe0deec27bac4b2d896' },
      { id: 'weakmap-vs-map', title: 'WeakMap vs Map', difficulty: 'EASY',
        questionSha256: 'fe13b93d4062fefc0554e107cfb859f5516251c6a1f2ce41ed3b62750d1cf5fa',
        answerSha256: '10112d4980dedf241333891011255c53f157315e50f14b0a7e0db2e08fcd4f32' },
      { id: 'objecthasown-vs-hasownproperty', title: '`Object.hasOwn` vs `hasOwnProperty`', difficulty: 'EASY',
        questionSha256: '89832890ebc36b2ceeab76614a9b754182904063641900e680a74f8ced4df27d',
        answerSha256: '940782e4d39caaf884f7281dfe381d6737cdf85444080c0ae7f939085e5e0296' },
      { id: 'implement-deepclone-structural-deep-copy', title: 'Implement `deepClone` (Structural Deep Copy)', difficulty: 'HARD',
        questionSha256: '159860238b23cfcd4760afe887248409ea90401cbeb311547e337e0a5743d178',
        answerSha256: 'a50d6c677591f94e0dcddd1bf200161d716953c06232f57c9e41a97acd3e54a8' },
    ],
  },
  [G7_TYPE_COERCION]: {
    metadata: { id: '/type-coercion', title: 'Type Coercion', description: 'Understand implicit and explicit type conversion, truthy/falsy values, and equality operators.', order: 2, access: 'FREE' },
    preparedOrder: 1,
    bodySha256: '6d172b53bb2f6f81d24d35395ef2de28df4aa330c8178b3fb5c0a171b7bb8a1d',
    sourceLessonSha256: 'f6d593180f01909369a8d3b3537921cd199298190a2b44587c33c17153b4bf45',
    bodyMetadata: {
      title: 'Type Coercion',
      description: 'Trace JavaScript conversion and equality, distinguish boolean and numeric contexts and explain a changed-input case.',
    },
    headings: [
      { beforeId: 'implicit-vs-explicit-coercion', id: 'implicit-vs-explicit-coercion', title: 'Convert deliberately' },
      { beforeId: 'truthy-and-falsy-values', id: 'boolean-contexts', title: 'Boolean contexts and default values' },
      { beforeId: 'equality-operators-vs', id: 'equality-operators-vs', title: 'Choose the equality rule' },
      { beforeId: 'the-operators-dual-nature', id: 'addition-and-coercion', title: 'Addition chooses after primitive conversion' },
      { beforeId: 'object-to-primitive-coercion', id: 'object-to-primitive-coercion', title: 'How an object supplies a primitive' },
      { beforeId: 'practical-patterns-and-best-practices', id: 'practical-patterns-and-best-practices', title: 'Validate a value before using it' },
      { beforeId: 'interview-tips', id: 'interview-tips', title: 'Explain a trace without memorizing tricks' },
      { beforeId: 'common-interview-questions', id: 'common-interview-questions', title: 'Predict, then check' },
      { beforeId: 'exercises', id: 'exercises', title: 'Practice and stop here' },
    ],
    changedQuestions: ['implement-deepequal-structural-equality'],
    codingQuestion: 'implement-deepequal-structural-equality',
    problems: [
      { id: 'truthy-and-falsy-values', title: 'Truthy and Falsy Values', difficulty: 'EASY',
        questionSha256: '8d67c415b0300634f4156c2d0bb3baa8c2345dfaea29054d2b5d37e878c47e68',
        answerSha256: 'b7dd4984963ce1731f4f3ac33c884e75e42fba39d40c54856e416bd247fed82d' },
      { id: 'vs', title: '`==` vs `===`', difficulty: 'MEDIUM',
        questionSha256: '0e7ecce955bf23841d9e2510ff40206f7a55121da6578b41d8422d811eacf782',
        answerSha256: '1787ed340fa8b5455f4234a6e505beb44a9420b6c9c65fa5e989650d0ebebbdd' },
      { id: 'the-operators-dual-nature', title: "The `+` Operator's Dual Nature", difficulty: 'EASY',
        questionSha256: '06641134c69bb5566dfd7b795a3d5b4f01d104842c1080ffea7124050cf22c77',
        answerSha256: 'db15aa71f43294dda2a61b46082825669aaa9a6903ccf4d6bf735509da5478eb' },
      { id: 'false-and-if-output-prediction', title: '`[] == false` and `if ([])` — Output Prediction', difficulty: 'MEDIUM',
        questionSha256: '512238270ae19f9d12ff3f958404742711444d440b52a9a60f4e2277a3415623',
        answerSha256: '2d23f6fb3d2c6dc2dd867c162f1c05efd9e7f6eaad3ce0700ae75a5a3d3b3a90' },
      { id: 'nan-semantics', title: '`NaN` Semantics', difficulty: 'MEDIUM',
        questionSha256: '160e6074d728de4d9f73f8d2f268fd21dc3e5bcf20a9a4c93e22bb4a379ca562',
        answerSha256: '91bf43be7da5ead178b02a44ab5aa663cfd75fc2777d8fe76d9488a9bf3b4c9a' },
      { id: 'implement-deepequal-structural-equality', title: 'Implement `deepEqual` (Structural Equality)', difficulty: 'HARD',
        questionSha256: 'c8c6bea3f9d155b554fbb7d8c79b4254fe2855fd39c2e4217f3edb49e4b119f7',
        answerSha256: 'ea2cb3e72415361e3d9888cd99caae2e1aa58b66882370f435e1d098446ffacf' },
    ],
  },
}

export type G7Binding = {
  sourceLessonSha256: string
  bodySha256: string
  serializedBodySha256: string
  problems: {
    id: string
    type: G7ProblemType
    questionSha256: string
    answerSha256: string
    serializedQuestionSha256: string
    serializedAnswerSha256: string
  }[]
}

// Complete local Data Types review candidate 558790ecb3d3820c0a5294fa4ea89ab17a02b9b4.
// Production selection remains G3C. Coercion stays unbound; no runtime overrides.
export const G7_REVIEWED_BINDINGS: Partial<Record<G7LessonUid, G7Binding>> = {
  [G7_DATA_TYPES]: {
    sourceLessonSha256: '3b38e3da312ced7db557041fcd487d6966b62d165514cf17a4856c7196516b5d',
    bodySha256: '9e18c364a0327c739a43622ebe2f8a9f89ccde70f5703cda2f33e07e42f137d7',
    serializedBodySha256: 'e0e975cec61dcc38af1a31e82b2965a1f2c67df1229d3f6a51916d5f3279601f',
    problems: [
      {
        id: 'primitives-vs-objects', type: 'THEORY',
        questionSha256: 'fbdb2510bff45f61c032f8f4aae29c96a6ae62510ee9acf1a7fa42539b08b9ae',
        answerSha256: 'd7800ff108d4655fa65db833adeb648d37853cb65966ef3717f380a1fdbca8ac',
        serializedQuestionSha256: '53bf84f1668c20a4c4ec7b4e0f455ae1970b8dc977758f5eed4d2c2cc7643955',
        serializedAnswerSha256: '6f74846d2eae21dc860b31fddd7690aeeb42aea34441995df0862b34447d0049',
      },
      {
        id: 'modern-array-methods-at-findlast-findlastindex', type: 'THEORY',
        questionSha256: 'd37b7836ef9bae646d8680242dc1e23a55809356be2f7c50c39ec8b5532f8f5f',
        answerSha256: 'fea5578968e721e705a18942adc91c84eff8efbc1d8539c4b351ead496d3ad77',
        serializedQuestionSha256: '8393c426106ffdd53c03253bcbc9f3e033af33610b103aebd9d176f4ab0e3214',
        serializedAnswerSha256: '398469ee2a24b9a730894d0fc1a6fb13388922007429177325e6d59f4391b12d',
      },
      {
        id: 'object-vs-map', type: 'THEORY',
        questionSha256: 'ca62cf99100c9d408e29d412d9453bd8aea33979c58606e5b3da53b9eb33cbf5',
        answerSha256: 'f3ab6ae84227cfe78c147ee9076f5f1a83e4229c405fed36225cb01129f0f1c8',
        serializedQuestionSha256: 'bdcdd13ba620051bc646eb12d1d88cc42505384855a025e7881765e3f2fbfd48',
        serializedAnswerSha256: '66e2895ad641b40acf7f5c7ca0a5752722bf94fb578ffb0879666aee256cd7d8',
      },
      {
        id: 'weakmap-vs-map', type: 'THEORY',
        questionSha256: 'fe13b93d4062fefc0554e107cfb859f5516251c6a1f2ce41ed3b62750d1cf5fa',
        answerSha256: 'aac2385d5037aed98d58254dc49e9d1230554bc61def7d95c080f01cc58c0309',
        serializedQuestionSha256: 'fc6585b833169ed5cab7c18ceb995b7520f4d9940fab55df62f6f7dc2df061ae',
        serializedAnswerSha256: '72042f5bc6561fefd1531d57a50d7177997cddf61554618b19b86934baf5572b',
      },
      {
        id: 'objecthasown-vs-hasownproperty', type: 'THEORY',
        questionSha256: '89832890ebc36b2ceeab76614a9b754182904063641900e680a74f8ced4df27d',
        answerSha256: '859d3255c3cdf282ae0e83234ad49d08960c11c019fe26fa921165be58ebad0c',
        serializedQuestionSha256: 'fab90cec8618f9c25a933ea26cee573e0adabc98192d31bb1fe91f289339eead',
        serializedAnswerSha256: 'bdd9ae3f2defca5446ad92aca9f3b2acf918f65bea3b4292131c5ff24612e8f8',
      },
      {
        id: 'implement-deepclone-structural-deep-copy', type: 'CODING',
        questionSha256: '44cee8cf3decdaaf9d37964fb0c9fcf439e5ab912fb92d2aef6bf140f0f3e9bf',
        answerSha256: '83ff3c99040ee690c7171ffd4943aa14f81f0ade44244c144ad77daac8bf9207',
        serializedQuestionSha256: '8538e641519f41d1481e6b2846aad53c7b289e99bcff0ae29b0f7a2b36f0b38b',
        serializedAnswerSha256: 'ee1ba624914b6dd6444a761de86379fff67935fa405a7b72fe255f8e44c2e4f8',
      },
    ],
  },
}

export function isG7Lesson(lesson: string): lesson is G7LessonUid {
  return lesson === G7_DATA_TYPES || lesson === G7_TYPE_COERCION
}

export function requireG7Binding(lesson: string): G7Binding {
  if (!isG7Lesson(lesson)) throw new Error('Unsupported G7 lesson')
  const binding = G7_REVIEWED_BINDINGS[lesson]
  if (!binding) throw new Error(`G7 publication is inactive: missing complete reviewed candidate binding for ${lesson}`)
  const contract = G7_CONTRACTS[lesson]
  const hashes = [binding.sourceLessonSha256, binding.bodySha256, binding.serializedBodySha256]
  if (binding.sourceLessonSha256 === contract.sourceLessonSha256 || binding.bodySha256 === contract.bodySha256) {
    throw new Error('G7 candidate binding must describe the prepared revised lesson, not its legacy source')
  }
  if (binding.problems.length !== contract.problems.length) throw new Error('Incomplete G7 problem bindings')
  binding.problems.forEach((problem, index) => {
    const frozen = contract.problems[index]
    if (problem.id !== frozen.id || problem.type !== (problem.id === contract.codingQuestion ? 'CODING' : 'THEORY') ||
        (!contract.changedQuestions.includes(problem.id) && problem.questionSha256 !== frozen.questionSha256) ||
        (contract.changedQuestions.includes(problem.id) &&
          (problem.questionSha256 === frozen.questionSha256 || problem.answerSha256 === frozen.answerSha256))) {
      throw new Error('Unapproved G7 question identity, question or type binding')
    }
    hashes.push(problem.questionSha256, problem.answerSha256, problem.serializedQuestionSha256, problem.serializedAnswerSha256)
  })
  if (hashes.some(hash => !/^[a-f0-9]{64}$/.test(hash))) throw new Error('Incomplete G7 SHA256 binding')
  return binding
}

export function g7SourceProblemMetadata(problem: FrozenProblem, type: G7ProblemType) {
  return { id: problem.id, title: problem.title, difficulty: problem.difficulty, type, href: '' }
}

export function g7ProblemMetadata(lesson: G7LessonUid, problem: FrozenProblem, type: G7ProblemType) {
  return {
    contentId: `/${lesson}/${problem.id}`, slug: problem.id, title: problem.title,
    difficulty: problem.difficulty, type, href: '',
    link: `/courses/${lesson}#${problem.id}`, lessonContentId: `/${lesson}`,
  }
}

export function g7LessonMetadata(lesson: G7LessonUid) {
  const contract = G7_CONTRACTS[lesson]
  const { id, ...metadata } = contract.metadata
  return { ...metadata, order: contract.preparedOrder, contentId: `/${lesson}`, slug: id.slice(1), href: `/courses/${lesson}`, sectionContentId: '/js-track/core-fundamentals' }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export function assertG7SourceLesson(value: unknown, lesson: G7LessonUid) {
  const binding = requireG7Binding(lesson)
  const contract = G7_CONTRACTS[lesson]
  if (!isRecord(value) || !Array.isArray(value.problems)) throw new Error('Missing G7 source lesson')
  const { problems, ...metadata } = value
  if (!isDeepStrictEqual(metadata, contract.metadata) || problems.length !== contract.problems.length) {
    throw new Error('G7 canonical metadata, ordering, resources or problem inventory changed')
  }
  const states = problems.map((problem, index) => {
    if (!isRecord(problem) || typeof problem.question !== 'string' || !problem.question.trim() ||
        typeof problem.answer !== 'string' || !problem.answer.trim()) throw new Error('Incomplete G7 assessment')
    const { question, answer, ...problemMetadata } = problem
    const frozen = contract.problems[index], reviewed = binding.problems[index]
    const questionSha256 = g7Digest(question), answerSha256 = g7Digest(answer)
    const before = isDeepStrictEqual(problemMetadata, g7SourceProblemMetadata(frozen, 'THEORY')) &&
      questionSha256 === frozen.questionSha256 && answerSha256 === frozen.answerSha256
    const after = isDeepStrictEqual(problemMetadata, g7SourceProblemMetadata(frozen, reviewed.type)) &&
      questionSha256 === reviewed.questionSha256 && answerSha256 === reviewed.answerSha256
    if (!before && !after) {
      throw new Error('G7 question/answer/type must be one complete frozen or reviewed assessment')
    }
    return { before, after }
  })
  const before = states.every(state => state.before)
  const after = states.every(state => state.after)
  const hash = g7ValueHash(value)
  if ((before && hash !== contract.sourceLessonSha256) || (after && hash !== binding.sourceLessonSha256)) {
    throw new Error('G7 complete source lesson checksum differs from its frozen or reviewed binding')
  }
  return before ? 'before' : after ? 'after' : 'mixed'
}

export function assertG7Body(body: string, lesson: G7LessonUid) {
  const binding = requireG7Binding(lesson)
  const hash = g7Digest(body)
  if (hash === G7_CONTRACTS[lesson].bodySha256) return 'before'
  if (hash === binding.bodySha256) return 'after'
  throw new Error('G7 body differs from the complete frozen or reviewed payload')
}
