import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint, Step } from '../../../step-log/types'
import { buildLog, type PresetSpec, type StepWords, type WriteContext } from '../build'
import type { DPState } from '../model'
import { canPartitionDownProgram, canPartitionUpProgram } from '../programs/dynamic-programming'
import type { DpProgram, DpRecording } from '../programs/types'
import recordings from '../recordings/dynamic-programming.json'

/**
 * Dynamic Programming, partition-equal-subset-sum (R4
 * `knapsack-1d-desc-vs-asc`): the practice answer's 1D 0/1 subset-sum table
 * for [1, 2, 5] (target 4). One step is one write f[j] = f[j] || f[j - x],
 * drawn as an arrow from the cell read to the cell written. Counting j down
 * (the answer as written), a write only ever reads a cell the current item
 * has not written; counting up, f[2] reads f[1] that item 1 just wrote, so
 * item 1 counts twice and f[4] ends true: a wrong answer.
 *
 * The pane is the answer's lines 7 to 15 reflowed to the pane. A practice
 * answer is never committed as text: each row is [indent, from, to] of a
 * line of the program as run, resolved from the content for a page. Both
 * orders' loop headers are the same length.
 */

export const KNAPSACK_DISPLAY: DisplayRow[] = [
  { src: 7, wrap: [2, 0, 20] },
  { src: 7, wrap: [4, 21, 46] },
  { src: 8, wrap: [2, 0, 12] },
  { src: 9, wrap: [2, 0, 23] },
  { src: 10, wrap: [4, 0, 30] },
  { src: 11, wrap: [6, 0, 24] },
  { src: 12, wrap: [4, 0, 1] },
  { src: 13, wrap: [2, 0, 1] },
  { src: 14, wrap: [2, 0, 12] },
  { src: 15, wrap: [0, 0, 1] },
]

const rec = recordings as unknown as Record<string, DpRecording>

const words = (c: WriteContext): StepWords => {
  const { j, read, x } = c
  const event = `f[${j}] reads f[${read}]: ${c.now}`
  const narration = `x is ${x}, j is ${j}. f[${j}] = f[${j}] || f[${read}] gives ${c.now}.`
  if (c.was)
    return {
      event,
      why: `f[${j}] was already true, so the || keeps it true.`,
      narration,
    }
  if (!c.now)
    return {
      event,
      why: `f[${read}] is false: no subset reaches ${read}, so adding ${x} cannot reach ${j}.`,
      narration,
    }
  if (c.reused)
    return {
      event,
      why: `f[${read}] was set by this item a moment ago, so ${x} is counted twice to reach ${j}.`,
      narration,
    }
  return {
    event,
    why: `f[${read}] is true from before item ${x}, so adding ${x} once reaches ${j}.`,
    narration,
  }
}

const START: StepWords = {
  event: 'Before the items',
  why: 'Only f[0] starts true, because the empty subset sums to 0; no item has been tried yet.',
  narration: 'nums is [1, 2, 5] and the target m is 4. Only f[0] is true.',
}

/** The write, the skipped item's loop header and the return. */
const LINES: PresetSpec['lines'] = { write: 11, skip: 10, end: 14 }

const spec = (id: string, program: DpProgram) => ({
  id: `dp-table-dependencies/${id}`,
  program,
  recording: rec[program.id],
  display: KNAPSACK_DISPLAY,
  lines: LINES,
  start: START,
  words,
})

const ret = (v: string, why: string): StepWords => ({
  event: `Return ${v}`,
  why,
  narration: `canPartition returns f[4], ${v}, and the harness prints it.`,
})

export const knapsackDownSpec: PresetSpec = {
  ...spec('knapsack-1d-desc-vs-asc', canPartitionDownProgram),
  skip: (x) => ({
    event: `x ${x}: the loop never runs`,
    why: `j starts at 4 and must stay at least ${x}, so item ${x} writes nothing.`,
    narration: `x is ${x}, larger than the target 4. No cell is written.`,
  }),
  end: ret('false', 'f[4] is false: no subset of [1, 2, 5] sums to 4, so there is no equal split.'),
  checkpoints: (): Checkpoint[] => [
    {
      beforeStep: 1,
      verdict: 'end',
      prompt: 'Can [1, 2, 5] split into two equal sums?',
      choices: [
        { id: 'yes', label: 'Yes', value: 'true' },
        { id: 'no', label: 'No', value: 'false' },
      ],
      answer: 'no',
      feedback: {
        correct: 'Halves would sum to 4, and no subset of 1, 2 and 5 does.',
        byChoice: {
          yes: 'Halves would sum to 4: 1 + 2 is 3, and 5 alone is too big.',
        },
      },
      locked: 'Step through to check it.',
      recap: {
        right: 'It returned false',
        wrongLead: 'It returned false, not true',
      },
    },
  ],
}

/** The write for item 1 at j = 2, the first that reads a cell this item wrote. */
const firstReuse = (steps: readonly Step<DPState>[]) => steps.findIndex((s) => s.state.x === 1 && s.state.j === 2)

export const knapsackUpSpec: PresetSpec = {
  ...spec('knapsack-1d-asc', canPartitionUpProgram),
  skip: (x) => ({
    event: `x ${x}: the loop never runs`,
    why: `j starts at ${x}, already past the target 4, so item ${x} writes nothing.`,
    narration: `x is ${x}, larger than the target 4. No cell is written.`,
  }),
  end: ret('true', 'Wrong: f[4] is true only because item 1 was counted four times. Counting j down returns false.'),
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: firstReuse(steps),
      prompt: 'f[1] was just set for item 1. What does f[2] become?',
      choices: [
        { id: 'true', label: 'true' },
        { id: 'false', label: 'false' },
      ],
      answer: 'true',
      feedback: {
        correct: 'f[2] reads f[1], which item 1 just wrote: item 1 counts twice, which 0/1 forbids.',
        byChoice: {
          false: 'f[2] reads f[1], already true for item 1, so 1 counts twice: true.',
        },
      },
      recap: {
        right: 'f[2] became true',
        wrongLead: 'f[2] became true, not false',
      },
    },
  ],
}

export const knapsackDownLog = buildLog(knapsackDownSpec)
export const knapsackUpLog = buildLog(knapsackUpSpec)
