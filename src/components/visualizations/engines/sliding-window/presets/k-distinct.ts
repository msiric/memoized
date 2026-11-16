import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint, Step } from '../../../step-log/types'
import { buildLog, type PresetSpec, type StepWords, type WordsContext } from '../build'
import { windowText, type SWState } from '../model'
import type { WindowProgram, WindowRecording } from '../program'
import { kDistinctIfProgram, kDistinctWhileProgram } from '../programs/sliding-window'
import recordings from '../recordings/sliding-window.json'

/**
 * Sliding Window Technique (R2 calibration, unanimous; R4 preset
 * `araaci-k2 (while vs if)`): the lesson's longestSubstringWithKDistinct on
 * "araaci" with K = 2, one step per recorded event. While the window holds
 * at most K kinds an iteration is one step (count, no shrink, record); when
 * a count pushes it over, the step counts, each pass of the shrink loop is
 * its own step, and the record follows. The `if` preset is the same block
 * with `while` written as `if`: one pass at most, so the window keeps three
 * kinds, and the run still returns 4 (the window never grows while it is
 * invalid), which the end says.
 *
 * The code is the lesson function with its lines broken where a 375 px
 * phone would wrap them (only whitespace differs: the truth test checks
 * every row against a local content checkout); `src` is the line of the
 * program as run. Blank lines are not shown.
 */

const rows = (keyword: 'while' | 'if'): DisplayRow[] => [
  { src: 1, text: 'function' },
  { src: 1, text: '  longestSubstringWithKDistinct(s,' },
  { src: 1, text: '    K) {' },
  { src: 2, text: '  let windowStart = 0,' },
  { src: 2, text: '    maxLength = 0;' },
  { src: 3, text: '  const charFrequency = {};' },
  { src: 5, text: '  for (let windowEnd = 0;' },
  { src: 5, text: '       windowEnd < s.length;' },
  { src: 5, text: '       windowEnd++) {' },
  { src: 6, text: '    const rightChar = s[windowEnd];' },
  { src: 7, text: '    if (!(rightChar in' },
  { src: 7, text: '        charFrequency)) {' },
  { src: 8, text: '      charFrequency[rightChar] = 0;' },
  { src: 9, text: '    }' },
  { src: 10, text: '    charFrequency[rightChar]++;' },
  { src: 12, text: '    // Shrink the window until we' },
  { src: 12, text: "       have 'K' distinct characters" },
  { src: 13, text: `    ${keyword}` },
  { src: 13, text: ' (Object.keys(charFrequency).length' },
  { src: 13, text: '      > K) {' },
  { src: 14, text: '      const leftChar =' },
  { src: 14, text: '        s[windowStart];' },
  { src: 15, text: '      charFrequency[leftChar]--;' },
  { src: 16, text: '      if (charFrequency[leftChar]' },
  { src: 16, text: '          === 0) {' },
  { src: 17, text: '        delete' },
  { src: 17, text: '          charFrequency[leftChar];' },
  { src: 18, text: '      }' },
  { src: 19, text: '      windowStart++;' },
  { src: 20, text: '    }' },
  { src: 22, text: '    // Update the maximum length' },
  { src: 23, text: '    maxLength = Math.max(maxLength,' },
  { src: 23, text: '      windowEnd - windowStart + 1);' },
  { src: 24, text: '  }' },
  { src: 26, text: '  return maxLength;' },
  { src: 27, text: '}' },
]

export const K_DISTINCT_DISPLAY = rows('while')
export const K_DISTINCT_IF_DISPLAY = rows('if')

const rec = recordings as unknown as Record<string, WindowRecording>

const kinds = (s: SWState) => s.store.length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const countOf = (s: SWState, key: string) => s.store.find((e) => e.key === key)?.count ?? 0

const words = (variant: 'while' | 'if') => (c: WordsContext): StepWords => {
  const s = c.state
  const k = s.k!
  const win = `"${windowText(s)}"`
  switch (c.kind) {
    case 'grow': {
      const n = kinds(s)
      const grew = s.best > c.before.best
      return {
        event: `Count ${c.ch}: ${plural(n, 'key', 'keys')}, ${grew ? `max ${s.best}` : `max stays ${s.best}`}`,
        why: `${plural(n, 'key is', 'keys are')} not more than K = ${k}, so the ${variant} is skipped and ${win}, ${c.length} long, is recorded.`,
        narration: `windowEnd moves to ${s.right}; ${c.ch} counts ${countOf(s, c.ch)}. maxLength is ${s.best}.`,
      }
    }
    case 'extend':
      return {
        event: `Count ${c.ch}: ${kinds(s)} keys, more than K`,
        why: `charFrequency has ${kinds(s)} keys and K is ${k}, so the ${variant} must drop characters from the left before anything is recorded.`,
        narration: `windowEnd moves to ${s.right}; ${c.ch} counts 1, and charFrequency has ${kinds(s)} keys.`,
      }
    case 'shrink': {
      const n = kinds(s)
      const gone = countOf(s, c.left!) === 0
      const over = n > k
      const left = countOf(s, c.left!)
      const why = !over
        ? `${c.left}'s count reaches 0, so its key is deleted: ${n} keys, not more than K, so the loop stops.`
        : gone
          ? `${c.left}'s count reaches 0 and its key goes, but ${n} keys remain, and if runs only once.`
          : variant === 'if'
            ? `${c.left} still counts ${left}, so ${n} keys remain, but if never runs a second pass.`
            : `${c.left} still counts ${left}, so its key stays: ${n} keys are still more than K, so the loop runs again.`
      return {
        event: gone ? (over ? `Drop ${c.left}: key goes, ${n} keys left` : `Drop ${c.left}: its key goes`) : `Drop ${c.left}: still ${n} keys`,
        why,
        narration: `windowStart moves to ${s.left}; ${gone ? `${c.left} leaves charFrequency` : `${c.left} counts ${left}`}. The window is ${win}.`,
      }
    }
    case 'record': {
      const valid = kinds(s) <= k
      return {
        event: s.best > c.before.best ? `Record ${c.length}: maxLength ${s.best}` : `Record ${c.length}: max stays ${s.best}`,
        why: valid
          ? `The shrink stopped at ${kinds(s)} keys, so ${win} is valid; ${c.length} is not more than ${s.best}, so maxLength stays.`
          : `${win} still holds ${kinds(s)} keys, but the if has run, so its length ${c.length} is recorded anyway.`,
        narration: `The window ${win} is ${c.length} long; maxLength is ${s.best}.`,
      }
    }
  }
}

const START: StepWords = {
  event: 'Before the loop',
  why: 'windowStart and windowEnd start at 0 and charFrequency is empty, so the window grows from the left.',
  narration: 's is "araaci" and K is 2. charFrequency is empty and maxLength is 0.',
}

/** The count, the shrink pass from its decrement to windowStart++, the record (whose line ends every growing iteration) and the return. */
const LINES: PresetSpec['lines'] = { grow: 23, extend: 10, shrink: [15, 19], record: 23, end: 26 }

const spec = (id: string, program: WindowProgram, variant: 'while' | 'if') => ({
  id: `sliding-window/${id}`,
  program,
  recording: rec[program.id],
  display: variant === 'while' ? K_DISTINCT_DISPLAY : K_DISTINCT_IF_DISPLAY,
  lines: LINES,
  start: START,
  words: words(variant),
})

/** The first shrink pass after `c` arrives: the window still holds three kinds. */
const firstShrinkOnC = (steps: readonly Step<SWState>[]) =>
  steps.findIndex((s) => s.event.startsWith('Drop') && s.state.right === s.state.text.indexOf('c'))

export const kDistinctWhileSpec: PresetSpec = {
  ...spec('araaci-k2', kDistinctWhileProgram, 'while'),
  end: {
    event: 'Return 4',
    why: 'No window of at most 2 kinds was longer than "araa", so the call returns 4 and the example prints it.',
    narration: 'longestSubstringWithKDistinct returns 4, and the example prints it.',
  },
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: firstShrinkOnC(steps) + 1,
      prompt: 'Where does windowStart stop?',
      choices: [
        { id: 'two', label: '2' },
        { id: 'three', label: '3' },
        { id: 'four', label: '4' },
      ],
      answer: 'two',
      feedback: {
        correct: "Dropping r empties its count, so its key goes and 2 keys remain.",
        byChoice: {
          three: "At 2, r's count reaches 0 and its key is deleted, so the loop stops there.",
          four: 'The loop stops once 2 keys remain; the a’s may stay.',
        },
      },
      recap: { right: 'windowStart stopped at {answer}', wrongLead: 'windowStart stopped at {answer}, not {pick}' },
    },
  ],
}

export const kDistinctIfSpec: PresetSpec = {
  ...spec('araaci-k2-if', kDistinctIfProgram, 'if'),
  end: {
    event: 'Return 4, from a bad window',
    why: 'The window never grows while it holds 3 keys, so araa’s 4 is still the best; but from c on, the window was not valid.',
    narration: 'The if version returns 4 too, and the example prints it.',
  },
  checkpoints: (): Checkpoint[] => [
    {
      beforeStep: 1,
      verdict: 'end',
      prompt: 'With if, what does it return?',
      choices: [
        { id: 'four', label: '4', value: '4' },
        { id: 'five', label: '5', value: '5' },
        { id: 'six', label: '6', value: '6' },
      ],
      answer: 'four',
      feedback: {
        correct: 'The window keeps its width while it holds 3 keys, so it never beats araa.',
        byChoice: {
          five: 'One pass drops one character as one arrives, so the window never passes 4.',
          six: 'One pass drops one character as one arrives, so the window never passes 4.',
        },
      },
      locked: 'Step through to check it.',
      recap: { right: 'It returned {answer}', wrongLead: 'It returned {answer}, not {pick}' },
    },
  ],
}

export const kDistinctWhileLog = buildLog(kDistinctWhileSpec)
export const kDistinctIfLog = buildLog(kDistinctIfSpec)
