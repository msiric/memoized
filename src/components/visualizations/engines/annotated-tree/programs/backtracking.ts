import type { TreeProgram } from './types'

/**
 * Backtracking (dsa-track/common-techniques/backtracking, PREMIUM), practice
 * answer "Combination Sum", TypeScript as written, run on the register's
 * input combinationSum([2, 3, 6, 7], 7). The harness prints the answer as
 * JSON; nothing else. Probes (lines of the answer): every call's entry
 * (line 6: i, s and t), the two returns that end a call without children
 * (line 8, an answer; line 11, a cut, with the candidate it compared), and
 * the pop after a take returns (line 16, t before the pop). The take/skip
 * tree is rebuilt from that pre-order (`../build.ts`).
 */
const ANSWER = {
  block: {
    path: 'content/dsa-track/common-techniques/_lessons.json',
    lesson: '/backtracking',
    problem: 'combination-sum',
    lang: 'typescript',
  },
  lessonSha256: '12f0f01c0f90118af728baea00047ae9327a130d0843f13c6c77de73ff2cc3f3',
} as const

export const combinationSumProgram: TreeProgram = {
  id: 'combination-sum',
  lang: 'ts',
  source: [ANSWER, { code: 'console.log(JSON.stringify(combinationSum([2, 3, 6, 7], 7)));' }],
  probes: [
    { line: 6, as: 'call', read: ['i', 's', 't', 'candidates'] },
    { line: 8, as: 'answer', read: ['i', 's', 't'] },
    { line: 11, as: 'cut', read: ['i', 's', 'c', 'n'] },
    { line: 16, as: 'pop', read: ['i', 's', 't'] },
  ],
  watch: {
    i: 'i',
    s: 's',
    t: 't.slice()',
    candidates: 'candidates.slice()',
    c: 'candidates[i]',
    n: 'candidates.length',
  },
}
