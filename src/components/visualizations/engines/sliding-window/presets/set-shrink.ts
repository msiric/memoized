import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint, Step } from '../../../step-log/types'
import { buildLog, type PresetSpec, type StepWords, type WordsContext } from '../build'
import { windowText, type SWState } from '../model'
import type { WindowProgram, WindowRecording } from '../program'
import { setShrinkAbbaIfProgram, setShrinkAbbaProgram, setShrinkAbcabcbbProgram, setShrinkPwwkewProgram } from '../programs/strings'
import recordings from '../recordings/strings.json'

/**
 * JavaScript Strings, longest-substring-without-repeating-characters (R4
 * `set-shrink-longest-substring`): the practice answer's Set-backed window.
 * The right edge reads a character; while the Set already holds it, the
 * leftmost character is deleted (so the left edge may move several cells
 * for one read); then the new character is added and the length recorded. Presets: "pwwkew" (two deletes
 * at j = 2), "abcabcbb" (two at j = 6 and at j = 7), "abba" and "abba" with
 * `if` for `while`, where one delete leaves the first b in the window, ss
 * loses track of it and the run returns 3, a wrong answer (2 is right).
 *
 * The pane is the answer reflowed to the pane. A practice answer is never
 * committed as text: each row is [indent, from, to] of a line of the program
 * as run, resolved from the content for a page.
 */

const rows = (keyword: 'while' | 'if'): DisplayRow[] => [
  { src: 1, wrap: [0, 0, 8] },
  { src: 1, wrap: [2, 9, 36] },
  { src: 1, wrap: [4, 37, 54] },
  { src: 2, wrap: [2, 0, 12] },
  { src: 3, wrap: [2, 0, 23] },
  { src: 3, wrap: [4, 24, 34] },
  { src: 4, wrap: [2, 0, 22] },
  { src: 4, wrap: [7, 23, 43] },
  // The shrink line is 3 columns shorter with `if`.
  { src: 5, wrap: [4, 0, keyword === 'while' ? 22 : 19] },
  { src: 6, wrap: [6, 0, 18] },
  { src: 7, wrap: [4, 0, 1] },
  { src: 8, wrap: [4, 0, 13] },
  { src: 9, wrap: [4, 0, 19] },
  { src: 9, wrap: [6, 20, 31] },
  { src: 10, wrap: [2, 0, 1] },
  { src: 11, wrap: [2, 0, 11] },
  { src: 12, wrap: [0, 0, 1] },
]

export const SET_SHRINK_DISPLAY = rows('while')
export const SET_SHRINK_IF_DISPLAY = rows('if')

const rec = recordings as unknown as Record<string, WindowRecording>

const has = (s: SWState, ch: string) => s.store.some((e) => e.key === ch)

const words = (variant: 'while' | 'if') => (c: WordsContext): StepWords => {
  const s = c.state
  const win = `"${windowText(s)}"`
  switch (c.kind) {
    case 'shrink': {
      const still = has(s, c.ch)
      const first = c.pass === 1
      return {
        event: first ? `j reads ${c.ch}: delete ${c.left}` : `Delete ${c.left}, i to ${s.left}`,
        why: first
          ? variant === 'if'
            ? `${c.ch} is in ss, but if deletes once: ${c.left} goes, i moves to ${s.left}, and the first ${c.ch} stays in the window.`
            : `${c.ch} is already in ss, so the loop deletes from the left: s[i] is ${c.left}${c.left === c.ch ? '' : ', not the repeat'}, and i moves to ${s.left}.`
          : still
            ? `${c.ch} is still in ss, so the loop runs again and i moves to ${s.left}.`
            : `Deleting ${c.left} removes the repeat, so ${c.ch} is no longer in ss and the loop stops with i at ${s.left}.`,
        narration: `j is ${s.right}, reading ${c.ch}. ${c.left} leaves ss and i moves to ${s.left}.`,
      }
    }
    case 'grow': {
      const grew = s.best > c.before.best
      const tail = grew ? `ans ${s.best}` : `ans stays ${s.best}`
      const held = s.store.length
      const twice = [...windowText(s)].find((x, i, all) => all.indexOf(x) !== i)
      return {
        event: twice ? `Add ${c.ch}: ${tail}, ${twice} twice` : c.passes ? `Add ${c.ch}: ${win}, ${tail}` : `Add ${c.ch}: ${tail}`,
        why: twice
          ? `ss holds ${held} ${held === 1 ? 'character' : 'characters'} but ${win} has ${c.length}: ss no longer sees the first ${twice}, so the repeat is counted.`
          : c.passes
            ? `ss no longer holds ${c.ch}, so the new one is added; ${win} is ${c.length} long${grew ? ', the longest yet' : ''}.`
            : `${c.ch} is not in ss, so the ${variant} is skipped; it is added and ${win} is ${c.length} long.`,
        narration: `ss holds ${s.store.map((e) => e.key).join(', ')}. The window ${win} is ${c.length} long; ans is ${s.best}.`,
      }
    }
    default:
      throw new Error(`set-shrink: no ${c.kind} step`)
  }
}

const START = (s: string): StepWords => ({
  event: 'Before the loop',
  why: 'i and j start at 0 and ss is empty, so the window begins with no characters.',
  narration: `s is "${s}". ss is empty and ans is 0.`,
})

/** The delete, the add with its record, and the return (a Set step never counts, so `extend` is unused). */
const LINES: PresetSpec['lines'] = { grow: [8, 9], extend: 5, shrink: 6, record: 9, end: 11 }

const spec = (id: string, program: WindowProgram, variant: 'while' | 'if', s: string) => ({
  id: `sliding-window/${id}`,
  program,
  recording: rec[program.id],
  display: variant === 'while' ? SET_SHRINK_DISPLAY : SET_SHRINK_IF_DISPLAY,
  lines: LINES,
  start: START(s),
  words: words(variant),
})

const ret = (n: number, why: string): StepWords => ({
  event: `Return ${n}`,
  why,
  narration: `lengthOfLongestSubstring returns ${n}, and the harness prints it.`,
})

/** The step before j first reads a character ss already holds. */
const beforeFirstDelete = (steps: readonly Step<SWState>[]) => steps.findIndex((s) => s.event.startsWith('j reads'))

export const setShrinkPwwkewSpec: PresetSpec = {
  ...spec('set-shrink-longest-substring', setShrinkPwwkewProgram, 'while', 'pwwkew'),
  end: ret(3, 'No window without a repeat was longer than "wke", so the call returns 3.'),
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: beforeFirstDelete(steps),
      prompt: 'Next j reads w. What leaves first?',
      choices: [
        { id: 'p', label: 'p' },
        { id: 'w', label: 'w' },
      ],
      answer: 'p',
      feedback: {
        correct: 'The loop deletes s[i] from the left, so p goes first, then the old w.',
        byChoice: { w: 'The loop deletes s[i], the leftmost, so p goes first; the old w goes next.' },
      },
      recap: { right: '{answer} left first', wrongLead: '{answer} left first, not {pick}' },
    },
  ],
}

export const setShrinkAbcabcbbSpec: PresetSpec = {
  ...spec('set-shrink-abcabcbb', setShrinkAbcabcbbProgram, 'while', 'abcabcbb'),
  end: ret(3, 'Every window without a repeat had at most 3 characters, so the call returns 3.'),
  // At j = 6 the loop deletes twice (the register's note): asked after the first delete, with b still in ss.
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s, i) => i > 0 && s.event.startsWith('Delete') && s.state.right === 6),
      prompt: 'b is still in ss. Where does i stop?',
      choices: [
        { id: 'five', label: '5' },
        { id: 'six', label: '6' },
      ],
      answer: 'five',
      feedback: {
        correct: 's[4] is the old b, so deleting it removes the repeat at i = 5.',
        byChoice: { six: 's[4] is the old b: once it goes, b is no longer in ss and i stays 5.' },
      },
      recap: { right: 'i stopped at {answer}', wrongLead: 'i stopped at {answer}, not {pick}' },
    },
  ],
}

export const setShrinkAbbaSpec: PresetSpec = {
  ...spec('set-shrink-abba', setShrinkAbbaProgram, 'while', 'abba'),
  end: ret(2, 'At j = 2 both a and b left, so no window without a repeat was longer than 2.'),
  // The last a: it left ss when i passed it, so nothing is deleted (the `if` preset differs here).
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('Add a') && s.state.right === 3),
      prompt: 'Next j reads a. Is a in ss?',
      choices: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ],
      answer: 'no',
      feedback: {
        correct: 'a left ss when i passed it at j = 2, so a joins with no delete.',
        byChoice: { yes: 'a was deleted from ss when i passed it at j = 2.' },
      },
      recap: { right: 'a was not in ss', wrongLead: 'a was not in ss' },
    },
  ],
}

export const setShrinkAbbaIfSpec: PresetSpec = {
  ...spec('set-shrink-abba-if', setShrinkAbbaIfProgram, 'if', 'abba'),
  end: ret(3, 'Wrong: "bba" holds b twice, but ss lost the first b, so if records 3; the while version returns 2.'),
  checkpoints: (): Checkpoint[] => [
    {
      beforeStep: 1,
      verdict: 'end',
      prompt: 'With if, what does abba return?',
      choices: [
        { id: 'two', label: '2', value: '2' },
        { id: 'three', label: '3', value: '3' },
      ],
      answer: 'three',
      feedback: {
        correct: 'One delete leaves the first b in the window, and ss stops seeing it.',
        byChoice: { two: '2 is right, and while returns it; one delete leaves a b behind.' },
      },
      locked: 'Step through to check it.',
      recap: { right: 'It returned {answer}', wrongLead: 'It returned {answer}, not {pick}' },
    },
  ],
}

export const setShrinkPwwkewLog = buildLog(setShrinkPwwkewSpec)
export const setShrinkAbcabcbbLog = buildLog(setShrinkAbcabcbbSpec)
export const setShrinkAbbaLog = buildLog(setShrinkAbbaSpec)
export const setShrinkAbbaIfLog = buildLog(setShrinkAbbaIfSpec)
