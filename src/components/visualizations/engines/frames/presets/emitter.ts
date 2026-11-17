import type { DisplayRow } from '../../../step-log/lesson-source'
import type { Checkpoint } from '../../../step-log/types'
import { assemble, type Draft, type FramesSpec } from '../build'
import { statusId, type FChip, type FLane, type FState } from '../model'
import type { FramesRecording, Pause } from '../program'
import { nestedOnceProgram, snapshotProgram } from '../programs/design-patterns'
import recordings from '../recordings/design-patterns.json'

/**
 * Advanced Patterns, EventEmitter (R4 `once-consumed-by-nested-emit`,
 * `removed-before-turn`, `added-during-emit`): the registration Set as a
 * lane of records (by the recorder's record numbers, named here), one lane
 * per emit frame on the stack holding its own copy of the Set, and the
 * check's `order` log. The builder walks the recorded pauses and drafts a
 * step for every visible change: an emit copying the Set, a record leaving
 * (a once removed before its call, or `off`) or joining (`on`), a handler's
 * log, a turn the membership check skips, an emit returning. Every record,
 * copy, cursor and log entry is read from a pause.
 */

const rec = recordings as unknown as Record<string, FramesRecording>

/** The program's lines as run: emit's for, its once check, its closing brace. */
const SNAPSHOT_LINE = 40
const ONCE_LINE = 42
const TURN_LINE = 41
const EMIT_END_LINE = 46

type Frame = { snapshot: number[]; status: string; turn?: number } | null

function emitterDrafts(
  r: FramesRecording,
  names: Record<number, string>,
  window: { from: number; to: number },
  start: Omit<Draft, 'state' | 'focus'>,
): Draft[] {
  const pauses = r.pauses.slice(window.from, window.to)
  const name = (id: number) => names[id] ?? `#${id}`
  const depth = (p: Pause) => p.stack.filter((f) => f.fn === 'emit').length
  // A lane per emit frame the run ever stacks: one, or two for a nested emit.
  const frames: Frame[] = Array.from({ length: Math.max(...pauses.map(depth)) }, () => null)
  let records: [number, boolean][] = (pauses[0].vars.records as [number, boolean][]) ?? []
  let order: string[] = (pauses[0].vars.order as string[]) ?? []
  const st = (): FState => ({
    vars: [],
    lanes: [
      { id: 'records', label: "listeners for 'tick'", kind: 'micro', chips: records.map(([id, once]) => ({ id: `rec-${id}`, label: once ? `${name(id)} once` : name(id) })) },
      ...frames.map(
        (f, k): FLane => ({
          id: `emit-${k + 1}`,
          label: k ? 'emit 2 (nested)' : 'emit 1',
          kind: 'frame',
          chips: [{ id: statusId(`emit-${k + 1}`), label: f ? f.status : 'not running' }, ...(f ? f.snapshot.map((id): FChip => ({ id: `e${k + 1}-${id}`, label: name(id) })) : [])],
        }),
      ),
      { id: 'order', label: 'order', kind: 'task', chips: order.map((v, i) => ({ id: `order-${i}`, label: `'${v}'` })) },
    ],
    output: [],
  })
  const drafts: Draft[] = [{ ...start, state: st(), focus: [] }]
  let prev: Pause = pauses[0]
  for (const p of pauses.slice(1)) {
    const d = depth(p)
    if (p.probe === 'call') {
      const id = p.vars.entry as number
      frames[d - 1] = { ...frames[d - 1]!, status: `at ${name(id)}`, turn: id }
    }
    const now = (p.vars.records as [number, boolean][] | undefined) ?? records
    const gone = records.filter(([id]) => !now.some(([x]) => x === id))
    const came = now.filter(([id]) => !records.some(([x]) => x === id))
    const grew = ((p.vars.order as string[] | undefined) ?? order).slice(order.length)
    for (const [id, once] of gone) {
      records = records.filter(([x]) => x !== id)
      if (p.probe === 'call' && once && p.vars.entry === id)
        drafts.push({
          state: st(),
          src: ONCE_LINE,
          focus: [statusId(`emit-${d}`), `e${d}-${id}`],
          event: `${name(id)} is once: removed`,
          why: `A once record leaves the Set before its handler runs, so no other turn can find ${name(id)} again.`,
          narration: `${name(id)} is out of the Set; emit ${d} is about to call it.`,
        })
      else
        drafts.push({
          state: st(),
          src: prev.line,
          focus: frames[d - 1]?.snapshot.includes(id) ? [`e${d}-${id}`] : [statusId(`emit-${d}`)],
          event: `off removes ${name(id)}`,
          why: `${name(id)} leaves the Set but not emit ${d}'s copy, so its turn still comes, and is checked first.`,
          narration: `The Set holds ${records.map(([x]) => name(x)).join(', ')}; emit ${d}'s copy still lists ${name(id)}.`,
        })
    }
    for (const [id, once] of came) {
      records = [...records, [id, once]]
      drafts.push({
        state: st(),
        src: prev.line,
        focus: [`rec-${id}`],
        event: `on adds ${name(id)}`,
        why: `The Set grows, but emit ${d}'s copy was made before, so ${name(id)} waits for the next emit.`,
        narration: `The Set holds ${records.map(([x]) => name(x)).join(', ')}; emit ${d}'s copy does not list ${name(id)}.`,
      })
    }
    for (const v of grew) {
      order = [...order, v]
      const id = frames[d - 1]?.turn
      if (id === undefined) throw new Error(`pause ${r.pauses.indexOf(p)}: order grew with no handler on emit ${d}`)
      const once = !records.some(([x]) => x === id)
      drafts.push({
        state: st(),
        src: prev.line,
        focus: [statusId(`emit-${d}`), `order-${order.length - 1}`],
        event: `${name(id)} runs: logs '${v}'`,
        why: once
          ? `It left the Set before the call, so this turn is ${name(id)}'s only run.`
          : `${name(id)} was still in the Set at its turn, so emit ${d} called it.`,
        narration: `order is ${order.map((x) => `'${x}'`).join(', ')}.`,
      })
    }
    if (p.probe === 'snapshot') {
      frames[d - 1] = { snapshot: p.vars.snapshot as number[], status: 'copied' }
      const ids = frames[d - 1]!.snapshot
      drafts.push({
        state: st(),
        src: SNAPSHOT_LINE,
        focus: [statusId(`emit-${d}`), `e${d}-${ids[0]}`],
        event: `emit ${d} copies the Set`,
        why:
          d === 1
            ? 'emit copies the Set before its loop, so later changes to the Set miss this list.'
            : 'A nested emit takes its own copy of the Set, so it sits beside the outer emit’s older copy.',
        narration: `emit ${d}'s copy lists ${ids.map(name).join(', ')}.`,
      })
    }
    if (p.probe === 'turn' && p.vars.member === false) {
      const id = p.vars.entry as number
      frames[d - 1] = { ...frames[d - 1]!, status: 'skipped' }
      drafts.push({
        state: st(),
        src: TURN_LINE,
        focus: [statusId(`emit-${d}`), `e${d}-${id}`],
        event: `emit ${d} skips ${name(id)}`,
        why: `${name(id)} is no longer in the Set, so the membership check skips it, though the copy lists it.`,
        narration: `emit ${d} skipped ${name(id)}.`,
      })
    }
    if (p.probe === 'emit-end') {
      frames[d - 1] = null
      drafts.push({
        state: st(),
        src: EMIT_END_LINE,
        focus: [statusId(`emit-${d}`)],
        event: `emit ${d} returns`,
        why: d === 2 ? 'Its copy is done, so control returns into the handler that emitted, inside emit 1.' : 'Every record in its copy had its turn or was skipped, so the loop ends.',
        narration: `emit ${d} has returned. order is ${order.map((x) => `'${x}'`).join(', ')}.`,
      })
    }
    prev = p
  }
  return drafts
}

/** The pauses of a check from one test line's pause to another's (each the first at or after `from`). */
function span(r: FramesRecording, from: { probe: string; nth: number }, to: { probe: string; nth: number }) {
  const nth = (probe: string, n: number) => r.pauses.map((p, i) => (p.probe === probe ? i : -1)).filter((i) => i >= 0)[n - 1]
  return { from: nth(from.probe, from.nth), to: nth(to.probe, to.nth) }
}

const EMITTER_ROWS: DisplayRow[] = [
  { src: 37, wrap: [2, 0, 22] },
  { src: 38, wrap: [4, 0, 15] },
  { src: 38, wrap: [6, 16, 42] },
  { src: 39, wrap: [4, 0, 20] },
  { src: 40, wrap: [4, 0, 19] },
  { src: 40, wrap: [6, 20, 35] },
  { src: 41, wrap: [6, 0, 24] },
  { src: 41, wrap: [8, 25, 33] },
  { src: 42, wrap: [6, 0, 15] },
  { src: 42, wrap: [8, 16, 35] },
  { src: 42, wrap: [8, 36, 51] },
  { src: 43, wrap: [6, 0, 29] },
  { src: 44, wrap: [6, 0, 16] },
  { src: 45, wrap: [4, 0, 1] },
  { src: 46, wrap: [2, 0, 1] },
  { src: 47, wrap: [0, 0, 1] },
  { src: 48, text: '' },
]

export const NESTED_DISPLAY: DisplayRow[] = [
  ...EMITTER_ROWS,
  { src: 49, wrap: [0, 0, 32] },
  { src: 49, wrap: [2, 33, 65] },
  { src: 49, wrap: [2, 66, 90] },
  { src: 50, wrap: [2, 0, 30] },
  { src: 51, wrap: [2, 0, 16] },
  { src: 52, wrap: [2, 0, 18] },
  { src: 53, wrap: [2, 0, 22] },
  { src: 54, wrap: [4, 0, 29] },
  { src: 54, wrap: [6, 30, 38] },
  { src: 55, wrap: [4, 0, 14] },
  { src: 56, wrap: [6, 0, 13] },
  { src: 57, wrap: [6, 0, 16] },
  { src: 58, wrap: [6, 0, 14] },
  { src: 59, wrap: [4, 0, 1] },
  { src: 60, wrap: [2, 0, 2] },
  { src: 61, wrap: [2, 0, 16] },
  { src: 61, wrap: [4, 17, 42] },
  { src: 62, wrap: [2, 0, 16] },
  { src: 63, wrap: [2, 0, 33] },
  { src: 63, wrap: [4, 34, 51] },
  { src: 64, wrap: [0, 0, 2] },
]

export const SNAPSHOT_DISPLAY: DisplayRow[] = [
  ...EMITTER_ROWS,
  { src: 49, wrap: [0, 0, 35] },
  { src: 49, wrap: [2, 36, 69] },
  { src: 49, wrap: [2, 70, 82] },
  { src: 50, wrap: [2, 0, 30] },
  { src: 51, wrap: [2, 0, 16] },
  { src: 52, wrap: [2, 0, 12] },
  { src: 52, wrap: [4, 13, 37] },
  { src: 53, wrap: [2, 0, 15] },
  { src: 53, wrap: [4, 16, 43] },
  { src: 54, wrap: [2, 0, 22] },
  { src: 55, wrap: [4, 0, 19] },
  { src: 56, wrap: [4, 0, 24] },
  { src: 57, wrap: [4, 0, 20] },
  { src: 58, wrap: [2, 0, 2] },
  { src: 59, wrap: [2, 0, 23] },
  { src: 60, wrap: [2, 0, 16] },
  { src: 61, wrap: [2, 0, 23] },
  { src: 61, wrap: [4, 24, 34] },
  { src: 62, wrap: [2, 0, 16] },
  { src: 63, wrap: [2, 0, 33] },
  { src: 63, wrap: [4, 34, 51] },
  { src: 64, wrap: [0, 0, 2] },
]

/** Record numbers in registration order (the recorder numbers records as it first sees the Set). */
const NESTED_NAMES = { 0: 'A', 1: 'O' }
const SNAPSHOT_NAMES = { 0: 'first', 1: 'removed', 2: 'late', 3: 'late 2' }

const nestedDrafts = (r: FramesRecording) =>
  emitterDrafts(r, NESTED_NAMES, span(r, { probe: 'emit', nth: 1 }, { probe: 'assert', nth: 1 }), {
    event: 'A and once O registered',
    why: 'The Set holds one record per registration: A, then O, which is once, so it may run only one time.',
    narration: "The Set holds A and O (once). order is empty. Next: bus.emit('tick').",
  })
const removedDrafts = (r: FramesRecording) =>
  emitterDrafts(r, SNAPSHOT_NAMES, span(r, { probe: 'emit', nth: 1 }, { probe: 'assert', nth: 1 }), {
    event: 'first, removed registered',
    why: 'first calls off(removed) and on(late) during emit, so the Set changes mid-loop.',
    narration: "The Set holds first and removed. order is empty. Next: bus.emit('tick').",
  })
const addedDrafts = (r: FramesRecording) =>
  emitterDrafts(r, SNAPSHOT_NAMES, span(r, { probe: 'emit', nth: 2 }, { probe: 'assert', nth: 2 }), {
    event: 'After the first emit',
    why: 'The first emit removed removed and added late, but late had to wait: it was not in that copy.',
    narration: "The Set holds first and late. order is 'first'. Next: the second bus.emit('tick').",
  })

export const nestedOnceSpec: FramesSpec = {
  id: 'frames/once-consumed-by-nested-emit',
  program: nestedOnceProgram,
  recording: rec[nestedOnceProgram.id],
  display: NESTED_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => /^emit 1 skips O/.test(s.event)),
      prompt: 'emit 1 reaches O. Does once run?',
      choices: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes' },
      ],
      answer: 'no',
      feedback: {
        correct: 'O left the Set in the nested emit, so the check skips it.',
        byChoice: { yes: 'emit 1’s copy lists O, but the turn checks the Set first, and O is gone.' },
      },
      recap: { right: 'once ran only in the nested emit', wrongLead: 'once ran only in the nested emit' },
    },
  ],
}

export const removedSpec: FramesSpec = {
  id: 'frames/removed-before-turn',
  program: snapshotProgram,
  recording: rec[snapshotProgram.id],
  display: SNAPSHOT_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => /^emit 1 skips removed/.test(s.event)),
      prompt: 'Does removed run at its turn?',
      choices: [
        { id: 'no', label: 'No' },
        { id: 'yes', label: 'Yes' },
      ],
      answer: 'no',
      feedback: {
        correct: 'off removed it from the Set, and each turn checks the Set.',
        byChoice: { yes: 'It is in the copy, but the membership check sees it left the Set.' },
      },
      recap: { right: 'removed was skipped', wrongLead: 'removed was skipped' },
    },
  ],
}

export const addedSpec: FramesSpec = {
  id: 'frames/added-during-emit',
  program: snapshotProgram,
  recording: rec[snapshotProgram.id],
  display: SNAPSHOT_DISPLAY,
  checkpoints: (steps): Checkpoint[] => [
    {
      beforeStep: steps.findIndex((s) => s.event.startsWith('late runs')),
      prompt: 'How many times does late log?',
      choices: [
        { id: 'once', label: 'Once' },
        { id: 'twice', label: 'Twice' },
      ],
      answer: 'once',
      feedback: {
        correct: 'late 2 joined after this emit made its copy, so it waits.',
        byChoice: { twice: 'This emit’s copy lists one late; late 2 was added after the copy.' },
      },
      recap: { right: 'late logged once', wrongLead: 'late logged once' },
    },
  ],
}

export const nestedOnceLog = assemble(nestedOnceSpec, nestedDrafts(nestedOnceSpec.recording))
export const removedLog = assemble(removedSpec, removedDrafts(removedSpec.recording))
export const addedLog = assemble(addedSpec, addedDrafts(addedSpec.recording))

export const EMITTER_BUILDERS = {
  'once-consumed-by-nested-emit': (r: FramesRecording) => assemble({ ...nestedOnceSpec, recording: r }, nestedDrafts(r)),
  'removed-before-turn': (r: FramesRecording) => assemble({ ...removedSpec, recording: r }, removedDrafts(r)),
  'added-during-emit': (r: FramesRecording) => assemble({ ...addedSpec, recording: r }, addedDrafts(r)),
}
