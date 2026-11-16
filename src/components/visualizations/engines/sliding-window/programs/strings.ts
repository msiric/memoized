import type { ProgramSource, SourcePart } from '../../../step-log/lesson-source'
import type { Probe, WindowProgram } from '../program'

/**
 * JavaScript Strings (dsa-track/built-in-data-structures/strings, PREMIUM):
 * the lesson body has no window, so the visual steps through the answer to
 * its practice question longest-substring-without-repeating-characters
 * (the R4 register's preset), run as TypeScript (Node 24 strips the types).
 * The answer is never committed: the recorder and the truth test read it
 * from a local content checkout, and the pane's rows carry no text.
 *
 * The program as run is the answer, a blank line, then the harness: one
 * call with the register's input, printed. The `if` programs write the
 * shrink loop's `while` as `if` (line 5 of the answer, one keyword; every
 * line keeps its number).
 */

const ANSWER = {
  path: 'content/dsa-track/built-in-data-structures/_lessons.json',
  lesson: '/strings',
  problem: 'longest-substring-without-repeating-characters',
  lang: 'typescript',
}
const ANSWER_SHA256 = '48b8155e86b005f106c21bb9474f4f39364790889627d0c06751157acad0366d'

export const HARNESS = 'The last line is the harness: it calls the answer on the input and prints the result.'

/** The answer as run, `while` (as written) or `if`, then the call. */
export function setShrinkSource(input: string, variant: 'while' | 'if'): ProgramSource {
  const answer: SourcePart[] =
    variant === 'while'
      ? [{ block: ANSWER, lessonSha256: ANSWER_SHA256 }]
      : [
          { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [1, 4] },
          { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [5, 5], replace: ['while', 'if'] },
          { block: ANSWER, lessonSha256: ANSWER_SHA256, lines: [6] },
        ]
  return [...answer, { code: '' }, { code: `console.log(lengthOfLongestSubstring(${JSON.stringify(input)}));` }]
}

/**
 * Lines of the program as run: the shrink check (every evaluation), the add
 * (after the shrink, so the `if` variant's one delete is seen too), the
 * record (after the add) and the return.
 */
const PROBES: readonly Probe[] = [
  { line: 5, as: 'check' },
  { line: 8, as: 'add' },
  { line: 9, as: 'record' },
  { line: 11, as: 'return' },
]

const program = (id: string, input: string, variant: 'while' | 'if', sha256: string, observed: string[]): WindowProgram => ({
  id,
  lang: 'ts',
  runtime: 'node@24.x',
  source: setShrinkSource(input, variant),
  sha256,
  observed,
  names: { left: 'i', right: 'j', store: 'ss', storeKind: 'set', best: 'ans' },
  probes: PROBES,
  watch: { s: 's', left: 'i', right: 'j', best: 'ans', store: '[...ss]' },
  harness: HARNESS,
})

export const setShrinkPwwkewProgram = program('set-shrink-pwwkew', 'pwwkew', 'while', 'ad22fed45da9dcb6001365bcde70e5f86e7c8f4271ab7b94967dc5949101eeeb', ['3'])
export const setShrinkAbcabcbbProgram = program('set-shrink-abcabcbb', 'abcabcbb', 'while', '5350f42e3b3812776baeb91119d0633c5ce8ca1b7d920ad643230c3700efd41e', ['3'])
export const setShrinkAbbaProgram = program('set-shrink-abba', 'abba', 'while', 'd0ec86cca710450e16f70aaf6faf4d005a3d9615c470c900ad54f661ee61c30e', ['2'])
export const setShrinkAbbaIfProgram = program('set-shrink-abba-if', 'abba', 'if', 'bd2ca3f957fb84e7d8445de38660863e85e6bfccaef26cc247c5daf2c2a747a5', ['3'])

/**
 * The register's verification runs that no preset draws: the answer on the
 * empty string, and the `if` variant on every input (it must really give the
 * wrong answers the visual claims, and the right one where it says so).
 * The truth test runs each plainly from the checkout; `observed` is what
 * Node 24 printed.
 */
export const SET_SHRINK_CHECKS: readonly { id: string; source: ProgramSource; sha256: string; observed: readonly string[] }[] = [
  { id: 'while-empty', source: setShrinkSource('', 'while'), sha256: '12b05464032e9f9b4e51f81192b0ab2bebbc162518cb7b33f3c9ddecd9d4d6c9', observed: ['0'] },
  { id: 'if-pwwkew', source: setShrinkSource('pwwkew', 'if'), sha256: '9a869c68052aaced7a5eafab1d176e2766f953a756e54a42c94165aefa2b8aba', observed: ['4'] },
  { id: 'if-abcabcbb', source: setShrinkSource('abcabcbb', 'if'), sha256: '55fdacf592d3bd45a7064f893233a0dda401410f2a9f4cd69044c0c18b4d3029', observed: ['3'] },
  { id: 'if-empty', source: setShrinkSource('', 'if'), sha256: 'f90691f46daf2f9f4114aed0e132f993818424db64bd7c1388f68cb973cf4aa2', observed: ['0'] },
]
