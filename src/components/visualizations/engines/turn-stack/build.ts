import { hasWrapRows, placeholderText, type DisplayRow } from '../../step-log/lesson-source'
import type { Checkpoint, Step, StepLine, StepLog } from '../../step-log/types'
import { CHAIN_ID, OUTPUT_ID, TURN_ID, key, pointId, type HullState, type Pt, type Turn } from './model'
import type { HullPause, HullProgram, HullRecording } from './programs/types'
import { HULL_GENERATOR } from './truth/generator'

/**
 * Builds a step-through from a recording (spec P6): every drawn value (the
 * points, both stacks, the arriving point, the turn value) is a pause of the
 * real run. Presets add only words and checkpoints; they cannot place a
 * point. The truth test re-records the program and rebuilds the steps.
 *
 * The recording is read as: `sorted` (the points as the chains read them),
 * then one pause before every pop and every push of the lower chain, then
 * of the upper chain, then `trim` (before the two trimming pops) and `join`
 * (after them). A pop pause holds the stack with the point it pops still on
 * top and the turn value that popped it; a push pause holds the stack
 * before the push and the turn value of the test that ended the loop (null
 * when fewer than two points were on the stack). The stack a step draws is
 * the one the next pause recorded, checked against the pop or push.
 */

export { HULL_GENERATOR }

export type StepWords = { event: string; why: string; narration: string }

/** What the words of one pop or push may read. */
export type MoveContext = {
  state: HullState
  chain: 'lower' | 'upper'
  kind: 'pop' | 'push'
  p: Pt
  turn: Turn | null
  /** The stack after this step. */
  stack: readonly Pt[]
  op: '<' | '<='
}

export type PresetSpec = {
  /** `hull-turn-stack/<preset>`. */
  id: string
  program: HullProgram
  recording: HullRecording
  /** The answer's lines reflowed to the pane, as rows without text (`wrap`, resolved for a page). */
  display: readonly DisplayRow[]
  /** Lines of the program as run that each kind of step highlights. */
  lines: { test: { lower: number; upper: number }; push: { lower: number; upper: number }; trim: readonly [number, number]; end: number }
  start: StepWords
  words: (c: MoveContext) => StepWords
  trim: (state: HullState) => StepWords
  end: StepWords
  checkpoints: (steps: readonly Step<HullState>[]) => Checkpoint[]
}

export type Move = { chain: 'lower' | 'upper'; kind: 'pop' | 'push'; pause: HullPause; before: readonly Pt[]; after: readonly Pt[]; p: Pt; turn: Turn | null }

const same = (a: readonly Pt[], b: readonly Pt[]) => a.length === b.length && a.every((p, i) => key(p) === key(b[i]))
const stack = (x: HullPause, chain: 'lower' | 'upper', what: string): Pt[] => {
  const s = x.vars[chain]
  if (!Array.isArray(s)) throw new Error(`turn-stack: ${what} has no recorded ${chain} chain`)
  return s
}
/** Whether the program's comparison holds for a turn value (the loop pops). */
export const popsOn = (op: '<' | '<=', cross: number) => (op === '<' ? cross < 0 : cross <= 0)

/** Every pop and push of a recorded run, in order, each with the stack the next pause recorded (see the module comment). */
export function moves(rec: HullRecording, op: '<' | '<='): Move[] {
  const ps = rec.pauses
  if (ps[0]?.probe !== 'sorted') throw new Error('turn-stack: the first pause must be the sort')
  const out: Move[] = []
  let k = 1
  for (; k < ps.length && ps[k].probe !== 'trim'; k++) {
    const x = ps[k]
    const [chain, kind] = x.probe.split('-') as ['lower' | 'upper', 'pop' | 'push']
    if ((chain !== 'lower' && chain !== 'upper') || (kind !== 'pop' && kind !== 'push')) throw new Error(`turn-stack: pause ${k} is ${x.probe}`)
    const before = stack(x, chain, `pause ${k}`)
    const p = x.vars.p
    if (!p) throw new Error(`turn-stack: pause ${k} has no arriving point`)
    const c = chain === 'lower' ? x.vars.cl : x.vars.cu
    if (c === undefined) throw new Error(`turn-stack: pause ${k} has no turn value`)
    const next = ps[k + 1]
    if (!next) throw new Error(`turn-stack: the run ends after pause ${k}`)
    const after = stack(next, chain, `the pause after ${k}`)
    let turn: Turn | null = null
    if (c !== null) {
      if (before.length < 2) throw new Error(`turn-stack: pause ${k} has a turn value with ${before.length} point(s) on the stack`)
      turn = { o: before[before.length - 2], a: before[before.length - 1], p, cross: c, pops: kind === 'pop' }
      if (popsOn(op, c) !== turn.pops) throw new Error(`turn-stack: pause ${k} ${kind}s on cross ${c}, which ${op} 0 ${popsOn(op, c) ? 'pops' : 'keeps'}`)
    } else if (kind === 'pop' || before.length >= 2) throw new Error(`turn-stack: pause ${k} tested no turn`)
    const want = kind === 'pop' ? before.slice(0, -1) : [...before, p]
    if (!same(after, want)) throw new Error(`turn-stack: after pause ${k} (${x.probe}) the ${chain} chain is ${JSON.stringify(after)}, not ${JSON.stringify(want)}`)
    out.push({ chain, kind, pause: x, before, after, p, turn })
  }
  if (ps[k]?.probe !== 'trim' || ps[k + 1]?.probe !== 'join' || k + 2 !== ps.length) throw new Error('turn-stack: the run must end with the trim and the join')
  return out
}

export function buildLog(spec: PresetSpec): StepLog<HullState> {
  const { program: p, recording: rec } = spec
  const rowsOf = (l: number) => spec.display.flatMap((d, i) => (d.src === l && ('text' in d ? d.text.trim() : d.wrap[2] > d.wrap[1]) ? [i + 1] : []))
  const lineOf = (from: number, to = from): StepLine => {
    const rows = [...rowsOf(from), ...(to === from ? [] : rowsOf(to))]
    if (!rows.length) throw new Error(`${spec.id}: line ${from} is not in the shown code`)
    return rows.length === 1 ? rows[0] : [rows[0], rows[rows.length - 1]]
  }
  const points = rec.pauses[0].vars.trees
  if (!points) throw new Error(`${spec.id}: the sorted points were not recorded`)
  const start: HullState = { points, chain: null, lower: [], upper: null, p: null, turn: null, popped: null, op: p.op, output: [] }
  const steps: Step<HullState>[] = [{ ...spec.start, state: start, focus: [], claim: 'modelled' }]
  let before = start

  for (const m of moves(rec, p.op)) {
    const state: HullState = {
      ...before,
      chain: m.chain,
      [m.chain]: m.after,
      ...(m.chain === 'upper' ? { lower: m.pause.vars.lower ?? before.lower } : {}),
      p: m.p,
      turn: m.turn,
      popped: m.kind === 'pop' ? m.before[m.before.length - 1] : null,
    }
    const focus = m.kind === 'pop' ? [pointId(state.popped!), TURN_ID] : m.turn ? [pointId(m.p), TURN_ID] : [pointId(m.p)]
    steps.push({
      ...spec.words({ state, chain: m.chain, kind: m.kind, p: m.p, turn: m.turn, stack: m.after, op: p.op }),
      state,
      line: m.kind === 'pop' ? lineOf(spec.lines.test[m.chain]) : lineOf(spec.lines.push[m.chain]),
      focus,
      claim: 'modelled',
    })
    before = state
  }

  const join = rec.pauses[rec.pauses.length - 1]
  const joined: HullState = {
    ...before,
    chain: 'hull',
    lower: stack(join, 'lower', 'the join'),
    upper: stack(join, 'upper', 'the join'),
    p: null,
    turn: null,
    popped: null,
  }
  steps.push({ ...spec.trim(joined), state: joined, line: lineOf(...spec.lines.trim), focus: [CHAIN_ID], claim: 'modelled' })
  steps.push({
    ...spec.end,
    state: { ...joined, output: rec.stdout },
    line: lineOf(spec.lines.end),
    focus: [OUTPUT_ID],
    claim: 'observed',
    observes: rec.stdout.map((_, k) => k),
  })

  const log: StepLog<HullState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: p.runtime, generator: HULL_GENERATOR, sha256: p.sha256 },
    code: {
      lang: p.lang,
      lines: placeholderText(spec.display),
      ...(hasWrapRows(spec.display) ? { premium: { source: p.source, rows: spec.display } } : {}),
    },
    steps,
    checkpoints: [],
    observed: { log: rec.stdout },
  }
  return { ...log, checkpoints: spec.checkpoints(steps) }
}
