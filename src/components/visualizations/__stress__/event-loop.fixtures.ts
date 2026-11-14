import type { StepThroughDescriptor } from '../shell/types'
import { eventLoopEngineCore } from '../engines/event-loop/descriptor'
import { EMPTY, type ElChip, type EventLoopState } from '../engines/event-loop/model'
import type { Checkpoint, Step, StepLog } from '../step-log/types'

/**
 * VIZ-H H0-B adversarial fixtures for the event-loop step-through. Each
 * fixture is a full StepThroughDescriptor (its own footprint is computed by
 * the real shell from these logs), rendered through the real StepThrough and
 * EventLoopStage on /dev/visualizations/stress. Not registered anywhere and
 * never shipped: the stress page is gated like the gallery.
 *
 * The data is deliberately hostile: long unbreakable identifiers, long
 * console strings, many queue items, unicode, long code lines, long titles,
 * preset names, captions, prompts and choices. Some inputs are over the
 * authoring-lint limits on purpose; the stress page reports the lint verdict
 * next to each fixture so the audit can tell "rejected by lint" from
 * "accepted and rendered broken".
 */

const ID48 = 'handleExtraordinarilyLongCallbackIdentifierName'
const ID64 = 'resolveDeeplyNestedAsynchronousPipelineStageCallbackRegistration'
const CONSOLE_LONG = 'ResponsePayloadReceivedFromUpstreamServiceWithoutAnyBreakOpportunity'
const CONSOLE_SPACES = 'the quick brown fox jumps over the lazy dog while the event loop drains'

const chip = (id: string, label: string): ElChip => ({ id, label })

function stepsFrom(states: EventLoopState[], text?: Partial<Step<EventLoopState>>): Step<EventLoopState>[] {
  return states.map((state, i) => {
    const focusIds = [
      ...state.stack.map((c) => c.id),
      ...state.micro.map((c) => c.id),
      ...state.tasks.map((c) => c.id),
      ...state.host.map((c) => c.id),
    ]
    return {
      state,
      event: i === 0 ? 'before the run' : (text?.event ?? `step ${i}`),
      why: text?.why ?? 'The script runs first, so nothing queued can start until the stack is empty.',
      narration: text?.narration ?? `Step ${i}.`,
      line: i === 0 ? undefined : 1,
      focus: i === 0 ? [] : focusIds.length ? [focusIds[0]] : ['console'],
      claim: 'modelled',
    }
  })
}

const checkpoint = (beforeStep: number, over?: Partial<Checkpoint>): Checkpoint => ({
  beforeStep,
  prompt: 'What logs next?',
  choices: [
    { id: 'a', label: 'A first' },
    { id: 'b', label: 'B first' },
  ],
  answer: 'a',
  feedback: { correct: 'Right, because microtasks run first.', byChoice: { b: 'Not quite: tasks wait.' } },
  ...over,
})

function log(id: string, lines: string[], steps: Step<EventLoopState>[], cps: Checkpoint[]): StepLog<EventLoopState> {
  return {
    id: `stress/${id}`,
    schema: 1,
    source: { snippet: lines.join('\n'), runtime: 'node@24.x', generator: 'stress@1', sha256: 'stress' },
    code: { lang: 'js', lines },
    steps,
    checkpoints: cps,
    observed: {},
  }
}

function def(
  id: string,
  title: string,
  presets: { id: string; label: string; log: StepLog<EventLoopState> }[],
): StepThroughDescriptor<EventLoopState> {
  return {
    id: `stress-${id}`,
    form: 'step',
    title,
    engine: eventLoopEngineCore,
    presets,
    defaultPreset: presets[0].id,
    since: '2026-11',
  }
}

const shortCode = ["console.log('A')", 'setTimeout(cb)', 'queueMicrotask(m)']

// 1. Long unbreakable identifiers in every lane and long console strings.
const longIdStates: EventLoopState[] = [
  EMPTY,
  { ...EMPTY, stack: [chip('s1', ID64)], console: [CONSOLE_LONG] },
  {
    ...EMPTY,
    stack: [chip('s1', ID64), chip('s2', ID48)],
    host: [chip('h1', `timer 0 ms → ${ID48}`)],
    micro: [chip('m1', ID48), chip('m2', ID64)],
    tasks: [chip('t1', ID64), chip('t2', ID48)],
    console: [CONSOLE_LONG, CONSOLE_SPACES, `${ID64}${ID64}`],
  },
  { ...EMPTY, micro: [chip('m1', ID48)], console: [CONSOLE_LONG, CONSOLE_SPACES, `${ID64}${ID64}`, 'D'] },
]
export const elLongIds = def('el-long-ids', 'Stress: long identifiers', [
  { id: 'long-ids', label: 'Long ids', log: log('el-long-ids', shortCode, stepsFrom(longIdStates), [checkpoint(2)]) },
])

// 2. Many items: 16 microtasks, 15 tasks, 8 host timers, 10 stack frames, 24 console lines.
const many = (prefix: string, n: number) => Array.from({ length: n }, (_, k) => chip(`${prefix}${k}`, `${prefix}${k} cb`))
const manyStates: EventLoopState[] = [
  EMPTY,
  {
    stack: many('frame', 10),
    host: many('timer', 8),
    micro: many('micro', 16),
    tasks: many('task', 15),
    console: Array.from({ length: 24 }, (_, k) => `line ${k + 1}`),
  },
  { ...EMPTY, micro: many('micro', 16), console: ['x'] },
]
export const elMany = def('el-many', 'Stress: many queue items', [
  { id: 'many', label: 'Many', log: log('el-many', shortCode, stepsFrom(manyStates), [checkpoint(2)]) },
])

// 3. Unicode: emoji (ZWJ), CJK (double width), RTL, combining marks.
const uniStates: EventLoopState[] = [
  EMPTY,
  {
    stack: [chip('u1', '処理関数コールバック登録待機中')],
    host: [chip('u2', 'timer → 👩‍👩‍👧‍👦🎉🎉🎉')],
    micro: [chip('u3', 'مرحبا بالعالم callback'), chip('u4', 'Z̤͔ͧ̑̓ä͖̭̈̇lͮ̒ͫǧ̗͚̚o̙̔ͮ̇͐̇')],
    tasks: [chip('u5', '🍕🍕🍕🍕🍕🍕🍕🍕🍕🍕🍕🍕'), chip('u6', '漢字漢字漢字漢字漢字漢字')],
    console: ['🚀 launched', '日本語の出力行がとても長い場合のテスト', 'שלום עולם', '👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽👍🏽'],
  },
]
export const elUnicode = def('el-unicode', 'Stress: unicode 🎉 漢字', [
  {
    id: 'unicode',
    label: 'Unicode 🎉',
    log: log('el-unicode', ["console.log('🚀')", "const 名前 = '漢字'", 'queueMicrotask(() => {})'], stepsFrom(uniStates), [
      checkpoint(1),
    ]),
  },
])

// 4. Code lines: exactly the 40-column lint limit (accepted), 20 lines (windowed), and 90 columns (rejected).
const col40 = [
  "console.log('A'); setTimeout(cb, 1000);",
  'Promise.resolve().then(onFulfilledCbk);',
  'queueMicrotask(() => console.log(xyzw));',
  ...Array.from({ length: 17 }, (_, k) => `const value${String(k).padStart(2, '0')} = computeSomething(k);`.slice(0, 40)),
]
const codeStates: EventLoopState[] = [EMPTY, { ...EMPTY, stack: [chip('c1', 'script')], console: ['A'] }]
const codeSteps = (n: number) =>
  stepsFrom([EMPTY, ...Array.from({ length: n }, () => codeStates[1])]).map((s, i) => ({
    ...s,
    line: i === 0 ? undefined : Math.min(i, 20),
  }))
export const elCode40 = def('el-code-40', 'Stress: 40-column code', [
  { id: 'code-40', label: 'Code 40', log: log('el-code-40', col40, codeSteps(20), [checkpoint(2)]) },
])
const col90 = [
  "fetchSomethingFromTheServer('https://api.example.com/v1/resources?include=everything&limit=100')",
  'const aVeryLongVariableNameThatGoesOnAndOn = anotherVeryLongFunctionNameThatAlsoGoesOn(argumentNumberOne)',
  'x()',
]
export const elCode90 = def('el-code-90', 'Stress: 90-column code (lint rejects)', [
  { id: 'code-90', label: 'Code 90', log: log('el-code-90', col90, codeSteps(3), [checkpoint(2)]) },
])

// 5. Long text in the shell slots: title, preset labels, event, caption, prompt, choices, feedback.
const WHY140 =
  'Because the microtask queue is drained completely before the next task, every callback queued during the drain also runs first, even late.'
const WHY_UNBROKEN =
  'Because:' + 'Microtasks'.repeat(13) // 138 chars, one 130-char word
const textSteps = (why: string, event: string) =>
  stepsFrom([EMPTY, { ...EMPTY, stack: [chip('t', 'script')], console: ['A'] }, { ...EMPTY, console: ['A', 'B'] }], {
    why,
    event,
  })
const PROMPT80 = 'After the first microtask runs and queues another one, what is logged next here?'
const longChoices = checkpoint(2, {
  prompt: PROMPT80,
  choices: [
    { id: 'a', label: 'The second microtask, because the queue drains before any task' },
    { id: 'b', label: 'The timer callback, since its delay of zero milliseconds has elapsed' },
    { id: 'c', label: 'Nothing: the loop waits for a rendering opportunity first and then' },
    { id: 'd', label: 'unbreakableChoiceLabelWithoutAnySpacesAtAllWhatsoever' },
  ],
  answer: 'a',
  feedback: {
    correct:
      'Right. The microtask queue drains completely, including microtasks queued during the drain, before the loop takes the next task from the task queue, so the second microtask runs before the timer even with zero delay.',
    byChoice: {
      b: 'Not quite. A timer callback is a task, and tasks wait until the microtask queue is completely empty, including anything queued during the drain itself, which is what happens here.',
      c: 'Not quite. Rendering opportunities come between tasks, never in the middle of a microtask drain, so the second microtask runs before any rendering step or timer callback.',
      d: 'unbreakableFeedbackTextWithoutAnySpacesThatWillNotWrapAnywhereInTheDockAtNarrowWidthsAtAll',
    },
  },
})
export const elLongText = def('el-long-text', 'Stress: forty character title limit ok', [
  {
    id: 'limit',
    label: 'Eighteen char lbl',
    log: log('el-long-text-a', shortCode, textSteps(WHY140, 'a forty character event label for limit'), [longChoices]),
  },
  {
    id: 'unbroken',
    label: 'Unbroken text xx',
    log: log('el-long-text-b', shortCode, textSteps(WHY_UNBROKEN, 'anEventLabelWithoutSpacesFortyCharsLong!'), [
      longChoices,
    ]),
  },
  {
    id: 'third',
    label: 'Third preset xxxx',
    log: log('el-long-text-c', shortCode, textSteps(WHY140, 'event'), [checkpoint(1)]),
  },
])

// 6. Over the limits: 90-char title, 4 presets with 40-char labels (select), 200-char caption.
const WHY200 =
  'Because the microtask queue is drained completely before the next task, every callback queued during the drain also runs first, even ones added late, so the timer callback still waits its turn here.'
export const elOverLimits = def(
  'el-over-limits',
  'Stress: a title that is far over the forty character limit and keeps going on',
  [0, 1, 2, 3].map((k) => ({
    id: `over-${k}`,
    label: `Preset label number ${k} far over the limit`,
    log: log(`el-over-${k}`, shortCode, textSteps(WHY200, 'an event label that is longer than forty characters'), [
      checkpoint(1, {
        prompt: 'A prompt that is well over the eighty character limit, because authors sometimes write a lot here?',
      }),
    ]),
  })),
)

export const EVENT_LOOP_FIXTURES = {
  'el-long-ids': elLongIds,
  'el-many': elMany,
  'el-unicode': elUnicode,
  'el-code-40': elCode40,
  'el-code-90': elCode90,
  'el-long-text': elLongText,
  'el-over-limits': elOverLimits,
} as const
