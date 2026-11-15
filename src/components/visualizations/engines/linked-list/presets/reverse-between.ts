import type { DisplayRow } from '../../../step-log/lesson-source'
import { buildLog, type PresetSpec } from '../build'
import { reverseBetweenProgram } from '../programs/linked-list-reversal'
import recordings from '../recordings/linked-list-reversal.json'
import type { PointerRecording } from '../program'

/**
 * Linked List Reversal (R2 calibration, unanimous): reverseBetween(head, 2,
 * 4) on 1..5, one step per recorded pointer state. Each loop pass is two
 * steps: save next and flip the arrow, then move previous and current. The
 * learner predicts what follows 2 once 1 is connected to the new front,
 * before `tail.next = current` (the temporary 1 -> 4 -> 3 -> 2 -> 1 loop).
 *
 * The code is the lesson function with its lines broken where a 375 px phone
 * would wrap them (the truth test checks only whitespace differs, against a
 * local content checkout); `src` is the line of the program as run.
 */

export const REVERSE_BETWEEN_DISPLAY: readonly DisplayRow[] = [
  { src: 8, text: "function reverseBetween(" },
  { src: 8, text: "  head, m, n) {" },
  { src: 9, text: "  if (m === n) return head;" },
  { src: 10, text: "" },
  { src: 11, text: "  let current = head," },
  { src: 11, text: "    previous = null;" },
  { src: 12, text: "  for (let i = 1; i < m; i++) {" },
  { src: 13, text: "    previous = current;" },
  { src: 14, text: "    current = current.next;" },
  { src: 15, text: "  }" },
  { src: 16, text: "" },
  { src: 17, text: "  const connection = previous;" },
  { src: 18, text: "  const tail = current;" },
  { src: 19, text: "" },
  { src: 20, text: "  let next = null;" },
  { src: 21, text: "  for (let i = 0;" },
  { src: 21, text: "       i < n - m + 1; i++) {" },
  { src: 22, text: "    next = current.next;" },
  { src: 23, text: "    current.next = previous;" },
  { src: 24, text: "    previous = current;" },
  { src: 25, text: "    current = next;" },
  { src: 26, text: "  }" },
  { src: 27, text: "" },
  { src: 28, text: "  if (connection !== null) {" },
  { src: 29, text: "    connection.next = previous;" },
  { src: 30, text: "  } else {" },
  { src: 31, text: "    head = previous;" },
  { src: 32, text: "  }" },
  { src: 33, text: "" },
  { src: 34, text: "  tail.next = current;" },
  { src: 35, text: "" },
  { src: 36, text: "  return head;" },
  { src: 37, text: "}" },
]

const recording = (recordings as unknown as Record<string, PointerRecording>)['reverse-between']

const FLIP_WHY = [
  'next saves 3 before current.next is overwritten. Now 2 points back at 1 while 1 still points to 2.',
  'next saves 4 first, so the rest of the list survives; 3 now points back at 2.',
  'next saves 5, the first node after the sublist, before 4 is pointed back at 3.',
]

export const reverseBetweenSpec: PresetSpec = {
  id: 'linked-list/reverse-between-m2-n4',
  program: reverseBetweenProgram,
  recording,
  lanes: { above: ['connection', 'tail', 'head'], below: ['previous', 'current', 'next'] },
  display: REVERSE_BETWEEN_DISPLAY,
  start: {
    event: 'Before the call',
    why: 'reverseBetween(head, 2, 4) reverses nodes 2 to 4 in place: no node moves, only next pointers change.',
    narration: 'The list is 1, 2, 3, 4, 5, and head points to 1.',
  },
  words: {
    init: () => ({
      event: 'Start at the head',
      why: 'previous trails current by one node, so it holds the node before position m once the walk stops.',
      narration: 'current starts on 1 and previous is null.',
    }),
    walk: () => ({
      event: 'Walk to position m',
      why: 'The loop runs m - 1 times, so current stops on 2 and previous on the node before it.',
      narration: 'previous moves to 1 and current to 2.',
    }),
    anchors: () => ({
      event: 'Remember both ends',
      why: 'connection is the node before the sublist; tail is its first node, which becomes its last after the reversal.',
      narration: 'connection is 1 and tail is 2.',
    }),
    'next-null': () => ({
      event: 'Declare next',
      why: 'next will save current.next before each flip overwrites it; until then it holds null.',
      narration: 'next is null.',
    }),
    flip: ({ pass, state, v }) => {
      const cur = state.pointers.find((p) => p.name === 'current')!.at
      const to = state.next[cur!]
      return {
        event: `Save next, flip ${v(cur)} to ${v(to)}`,
        why: FLIP_WHY[pass - 1],
        narration: `next is ${v(state.pointers.find((p) => p.name === 'next')!.at)}, then ${v(cur)}.next is ${v(to)}.`,
      }
    },
    advance: ({ pass, state, v }) => {
      const at = (name: string) => v(state.pointers.find((p) => p.name === name)!.at)
      return {
        event: 'Advance both pointers',
        why:
          pass < 3
            ? 'previous takes current and current takes the saved next, so the next pass flips the next arrow.'
            : 'current is now 5, the node after position n, so the loop stops after n - m + 1 passes.',
        narration: `previous is ${at('previous')} and current is ${at('current')}.`,
      }
    },
    connect: () => ({
      event: 'Connect 1 to the front',
      why: 'connection.next = previous links 1 to 4, but 2 still points back at 1, so for now the list loops.',
      narration: '1 now points to 4. Walking from head: 1, 4, 3, 2, then 1 again.',
    }),
    reattach: () => ({
      event: 'Reattach the tail',
      why: 'tail.next = current points 2 at 5, so the loop breaks and the rest of the list is joined back on.',
      narration: '2 now points to 5. Walking from head: 1, 4, 3, 2, 5.',
    }),
  },
  end: {
    line: 36,
    event: 'Print the list',
    why: 'head never moved because m > 1, so walking from it prints the reversed sublist between 1 and 5.',
    narration: 'The example prints 1 4 3 2 5.',
  },
  checkpoints: (steps) => [
    {
      beforeStep: steps.findIndex((s) => s.event === 'Connect 1 to the front'),
      prompt: 'After connection.next = previous, what comes after 2, walking from head?',
      choices: [
        { id: 'five', label: '5' },
        { id: 'loop', label: '1' },
        { id: 'null', label: 'null' },
      ],
      answer: 'loop',
      feedback: {
        correct: '2 still points back at 1 until tail.next = current.',
        byChoice: {
          five: '2 still points back at 1: tail.next = current links it to 5 on the next step.',
          null: '2.next was set to previous, node 1, on the first pass.',
        },
      },
      recap: {
        right: 'After 2 came 1 again',
        wrongLead: 'After 2 came 1 again, not {pick}',
        wrong: 'After 2 came 1 again, not {pick}.',
      },
    },
  ],
}

export const reverseBetweenLog = buildLog(reverseBetweenSpec)
