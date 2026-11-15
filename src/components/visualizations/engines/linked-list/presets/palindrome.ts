import { buildLog, type PresetSpec, type WordsContext } from '../build'
import { nodeName, pointerAt, type LLState } from '../model'
import { palindromeEvenProgram, palindromeFalseProgram, palindromeOddProgram } from '../programs/linked-lists'
import recordings from '../recordings/linked-lists.json'
import type { PointerProgram, PointerRecording } from '../program'

/**
 * Linked Lists, palindrome-linked-list (R4, both raters): find the middle
 * with slow and fast (fast starts at head.next), cut after slow, reverse
 * the second half one arrow per pass with the saved `t` on screen, then
 * compare the halves. Three presets: 1,2,3,2,1 (slow stops on 3), 1,2,2,1
 * (slow stops on the first 2) and 1,2,3,1 (false). Every state is a
 * recorded probe hit; the presets add words and the prediction.
 */

export const PALINDROME_DISPLAY = [
  'function isPalindrome(',
  '  head: ListNode | null',
  '): boolean {',
  '  let slow: ListNode = head,',
  '    fast: ListNode = head.next;',
  '  while (fast != null &&',
  '         fast.next != null) {',
  '    slow = slow.next;',
  '    fast = fast.next.next;',
  '  }',
  '  let cur: ListNode =',
  '    slow.next;',
  '  slow.next = null;',
  '  let prev: ListNode = null;',
  '  while (cur != null) {',
  '    let t: ListNode = cur.next;',
  '    cur.next = prev;',
  '    prev = cur;',
  '    cur = t;',
  '  }',
  '  while (prev != null) {',
  '    if (prev.val != head.val)',
  '      return false;',
  '    prev = prev.next;',
  '    head = head.next;',
  '  }',
  '  return true;',
  '}',
]

const rec = recordings as unknown as Record<string, PointerRecording>

const name = (s: LLState, i: number | null | undefined) => (i === null || i === undefined ? 'null' : nodeName(s, i))
const at = (c: WordsContext, p: string) => name(c.state, pointerAt(c.state, p))

const words: PresetSpec['words'] = {
  init: (c) => ({
    event: 'slow at head, fast next',
    why: 'fast starts at head.next, so when it cannot move two more nodes, slow is on the last node of the first half.',
    narration: `slow is on ${at(c, 'slow')} and fast on ${at(c, 'fast')}.`,
  }),
  stride: (c) => {
    const fast = pointerAt(c.state, 'fast')
    const stops = fast === null || c.state.next[fast!] === null
    return {
      event: 'Move slow 1, fast 2',
      why: stops
        ? `fast cannot move two more nodes, so the loop stops with slow on ${at(c, 'slow')}.`
        : 'fast and fast.next both exist, so slow moves one node and fast moves two.',
      narration: `slow is on ${at(c, 'slow')} and fast is ${fast === null ? 'null' : `on ${at(c, 'fast')}`}.`,
    }
  },
  cut: (c) => ({
    event: 'Cut the list after slow',
    why: 'cur saves slow.next before slow.next = null splits the list into two halves.',
    narration: `cur is on ${at(c, 'cur')}, and ${at(c, 'slow')} now points to null.`,
  }),
  'prev-null': () => ({
    event: 'prev starts at null',
    why: 'The reversed second half must end in null, so prev begins there.',
    narration: 'prev is null.',
  }),
  flip: (c) => {
    const cur = pointerAt(c.state, 'cur')!
    const to = c.state.next[cur]
    const t = pointerAt(c.state, 't')
    return {
      event: to === null ? 'Save t, flip cur to null' : 'Save t, flip cur back',
      why:
        t === null
          ? 't saves null: this is the last node, so pointing it back at prev finishes the reversal.'
          : 't saves cur.next first, so the rest of the half is not lost when cur.next = prev overwrites it.',
      narration: `t is ${t === null ? 'null' : `on ${name(c.state, t)}`}, and ${name(c.state, cur)} now points to ${name(c.state, to)}.`,
    }
  },
  advance: (c) => {
    const cur = pointerAt(c.state, 'cur')
    return {
      event: 'prev and cur step forward',
      why:
        cur === null
          ? 'cur takes t, which is null, so the loop ends with prev on the new head of the second half.'
          : 'prev moves to cur and cur to the saved t, so the next pass flips the next arrow.',
      narration: `prev is on ${at(c, 'prev')} and cur is ${cur === null ? 'null' : `on ${at(c, 'cur')}`}.`,
    }
  },
  compare: (c) => {
    const a = c.before.nodes[pointerAt(c.before, 'prev')!].label
    const b = c.before.nodes[pointerAt(c.before, 'head')!].label
    return {
      event: `${a} equals ${b}: move on`,
      why: 'The pair matches, so prev and head both move on; a mismatch would return false at once.',
      narration: `prev.val ${a} equals head.val ${b}. prev is ${at(c, 'prev') === 'null' ? 'null' : `on ${at(c, 'prev')}`}, head ${at(c, 'head') === 'null' ? 'is null' : `is on ${at(c, 'head')}`}.`,
    }
  },
}

const LANES = { above: ['slow', 'fast', 'head'], below: ['prev', 'cur', 't'] }

const START = (list: string) => ({
  event: 'Before the call',
  why: 'isPalindrome compares the first half with the reversed second half, so it rewires the list instead of copying it.',
  narration: `The list is ${list}, and head points to the first 1.`,
})

const TRUE_END = {
  line: { text: 'return true;' },
  event: 'Return true',
  why: 'prev reached null with every pair equal, so the list reads the same both ways. The input list stays cut.',
  narration: 'isPalindrome returns true, and the harness prints it.',
}

function slowStops(steps: readonly { event: string; why: string }[]) {
  return steps.findIndex((s) => s.event === 'Move slow 1, fast 2' && s.why.startsWith('fast cannot'))
}

const spec = (id: string, program: PointerProgram) => ({
  id: `linked-list/${id}`,
  program,
  recording: rec[program.id],
  lanes: LANES,
  display: PALINDROME_DISPLAY,
  words,
})

export const palindromeOddSpec: PresetSpec = {
  ...spec('palindrome-split-reverse-compare', palindromeOddProgram),
  start: START('1, 2, 3, 2, 1'),
  end: TRUE_END,
  checkpoints: (steps) => [
    {
      beforeStep: slowStops(steps),
      prompt: 'For 1,2,3,2,1, which node does slow stop on?',
      choices: [
        { id: 'first-2', label: '1st 2' },
        { id: 'three', label: '3' },
        { id: 'second-2', label: '2nd 2' },
      ],
      answer: 'three',
      feedback: {
        correct: 'fast cannot jump past the last 1, so slow stops on 3, the middle.',
        byChoice: {
          'first-2': 'fast.next is the last 1, so both move once more.',
          'second-2': 'slow moves one node a pass; fast moves two.',
        },
      },
      recap: { right: 'slow stopped on {answer}', wrongLead: 'slow stopped on {answer}, not {pick}' },
    },
  ],
}

export const palindromeEvenSpec: PresetSpec = {
  ...spec('palindrome-1221', palindromeEvenProgram),
  start: START('1, 2, 2, 1'),
  end: TRUE_END,
  checkpoints: (steps) => [
    {
      beforeStep: slowStops(steps),
      prompt: 'For 1,2,2,1, which node does slow stop on?',
      choices: [
        { id: 'one', label: '1' },
        { id: 'first-2', label: '1st 2' },
        { id: 'second-2', label: '2nd 2' },
      ],
      answer: 'first-2',
      feedback: {
        correct: 'fast lands on the last 1, whose next is null, so slow stops on the first 2.',
        byChoice: {
          one: 'fast.next exists at the start, so slow moves once.',
          'second-2': 'fast stops after one jump, so slow moves only once.',
        },
      },
      recap: { right: 'slow stopped on {answer}', wrongLead: 'slow stopped on {answer}, not {pick}' },
    },
  ],
}

export const palindromeFalseSpec: PresetSpec = {
  ...spec('palindrome-1231', palindromeFalseProgram),
  start: START('1, 2, 3, 1'),
  end: {
    line: { text: 'if (prev.val != head.val) return false;' },
    event: '3 is not 2: return false',
    why: 'prev.val is 3 and head.val is 2, so the halves differ and the function returns false at once.',
    narration: 'isPalindrome returns false, and the harness prints it.',
  },
  checkpoints: () => [
    {
      beforeStep: 1,
      verdict: 'end',
      prompt: 'What does isPalindrome return for 1,2,3,1?',
      choices: [
        { id: 'true', label: 'true', value: 'true' },
        { id: 'false', label: 'false', value: 'false' },
      ],
      answer: 'false',
      feedback: {
        correct: 'The second pair, 3 and 2, differs, so it returns false.',
        byChoice: { true: 'The first pair matches, but 3 and 2 do not.' },
      },
      locked: 'Step through to check it.',
      recap: { right: 'It returned {answer}', wrongLead: 'It returned {answer}, not {pick}' },
    },
  ],
}

export const palindromeOddLog = buildLog(palindromeOddSpec)
export const palindromeEvenLog = buildLog(palindromeEvenSpec)
export const palindromeFalseLog = buildLog(palindromeFalseSpec)
