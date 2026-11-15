import type { SourcePart } from '../../../step-log/lesson-source'
import type { PointerProgram, Probe } from '../program'

/**
 * Linked Lists (dsa-track/user-defined-data-structures/linked-lists,
 * PREMIUM): the answer to the practice question palindrome-linked-list, run
 * as TypeScript (Node 24 strips the types). The answer is never committed:
 * the recorder and the truth test read it from a local content checkout.
 * It declares `ListNode` only in a comment, so the program as run is that
 * declaration (lines 3 to 10 of the answer, uncommented), the function
 * (from line 13), then the harness, which builds one input list and prints
 * the result. The reader sees the function alone.
 */
const HARNESS = 'The ListNode class (the answer\'s own comment, uncommented) and the three lines after the function build the input and print the result.'

const ANSWER = {
  path: 'content/dsa-track/user-defined-data-structures/_lessons.json',
  lesson: '/linked-lists',
  problem: 'palindrome-linked-list',
  lang: 'typescript',
}
const ANSWER_SHA256 = 'ac0bfdbd03634849afecea81a3ba5aa0aae09528d1795cbbe74ec40cfcb6ca73'

/** The program as run for one input list: the answer's parts, then the harness (calls only). */
const source = (values: readonly number[]): SourcePart[] => [
  { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [3, 10], uncomment: true },
  { code: '' },
  { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [13] },
  { code: '' },
  {
    code: [
      `const nodes = [${values.join(', ')}].map((v) => new ListNode(v));`,
      'nodes.forEach((node, i) => { node.next = nodes[i + 1] ?? null; });',
      'const head = nodes[0];',
      'console.log(isPalindrome(head));',
    ].join('\n'),
  },
]

const ALL = ['head', 'slow', 'fast', 'cur', 'prev'] as const

/** Lines of the program as run (the class is lines 1 to 8, the function 10 to 32, the harness 34 to 37). */
const PROBES: readonly Probe[] = [
  { id: 'start', after: 36, vars: ['head'] },
  { id: 'init', from: 11, after: 12, vars: ['head', 'slow', 'fast'] },
  { id: 'stride', from: 14, after: 15, vars: ['head', 'slow', 'fast'] },
  { id: 'cut', from: 17, after: 18, vars: ['head', 'slow', 'fast', 'cur'] },
  { id: 'prev-null', after: 19, vars: ALL },
  { id: 'flip', from: 21, after: 22, vars: [...ALL, 't'] },
  { id: 'advance', from: 23, after: 24, vars: [...ALL, 't'] },
  { id: 'compare', from: 27, after: 29, vars: ALL },
]

const program = (id: string, values: readonly number[], sha256: string, observed: string[]): PointerProgram => ({
  id,
  lang: 'ts',
  runtime: 'node@24.x',
  source: source(values),
  sha256,
  observed,
  nodeClass: 'ListNode',
  valueField: 'val',
  classEnd: 8,
  harness: HARNESS,
  probes: PROBES,
})

/** 1, 2, 3, 2, 1: odd length, a palindrome. */
export const palindromeOddProgram = program('palindrome-12321', [1, 2, 3, 2, 1], '70f771a44c909d331e392a3463a8cc7aed0f3ad7668e5f3c466d40b9cb42d053', ['true'])

/** 1, 2, 2, 1: even length, a palindrome. */
export const palindromeEvenProgram = program('palindrome-1221', [1, 2, 2, 1], 'c5e29a88d26df6b63a609bffc207b3eccd37046d7e7b6488ab6a37da7cd6044e', ['true'])

/** 1, 2, 3, 1: not a palindrome. */
export const palindromeFalseProgram = program('palindrome-1231', [1, 2, 3, 1], 'c01063c8b7280017721377dd4e0a77c80898fc6b523f7cd4d084080a94b78d36', ['false'])
