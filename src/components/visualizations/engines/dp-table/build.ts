import { hasWrapRows, placeholderText, type DisplayRow } from '../../step-log/lesson-source'
import type { Checkpoint, Step, StepLine, StepLog } from '../../step-log/types'
import { ITEM_ID, J_ID, OUTPUT_ID, cellId, type DPState } from './model'
import type { DpPause, DpProgram, DpRecording } from './programs/types'
import { DP_GENERATOR } from './truth/generator'

/**
 * Builds a step-through from a recording (spec P6): every drawn value (the
 * table, the item, the index) is a pause of the real run. Presets add only
 * words and checkpoints; they cannot set a cell. The truth test re-records
 * the program and rebuilds the steps.
 *
 * The recording is read as: `start` (the table after `f[0] = true`), then
 * per item one `item` pause (its inner loop's header) and one `write` pause
 * before each write; the value a write stored is the table at the pause
 * after it. Steps: Start, one step per write, one `skip` step for an item
 * whose loop never runs, then the return.
 */

export { DP_GENERATOR }

export type StepWords = { event: string; why: string; narration: string }

/** What the words of one write may read. */
export type WriteContext = {
  state: DPState
  before: DPState
  x: number
  j: number
  read: number
  /** The read cell was written for this item already (the item counted twice). */
  reused: boolean
  /** The written cell's value before and after. */
  was: boolean
  now: boolean
}

export type PresetSpec = {
  /** `dp-table-dependencies/<preset>`. */
  id: string
  program: DpProgram
  recording: DpRecording
  /** The answer's lines reflowed to the pane, as rows without text (`wrap`, resolved for a page). */
  display: readonly DisplayRow[]
  /** Lines of the program as run that each kind of step highlights. */
  lines: { write: number; skip: number; end: number }
  start: StepWords
  words: (c: WriteContext) => StepWords
  skip: (x: number, state: DPState) => StepWords
  end: StepWords
  checkpoints: (steps: readonly Step<DPState>[]) => Checkpoint[]
}

export type ItemRun = {
  x: number
  item: DpPause
  writes: { pause: DpPause; after: readonly boolean[] }[]
}

const table = (p: DpPause, what: string): boolean[] => {
  if (!Array.isArray(p.vars.f)) throw new Error(`dp-table: ${what} has no recorded table`)
  return p.vars.f
}

/** The items of a recorded run, each with its writes and the table after each (see the module comment). */
export function itemRuns(rec: DpRecording): ItemRun[] {
  const ps = rec.pauses
  if (ps[0]?.probe !== 'start') throw new Error('dp-table: the first pause must be the start')
  const out: ItemRun[] = []
  for (let k = 1; k < ps.length && ps[k].probe !== 'return'; ) {
    const item = ps[k++]
    if (item.probe !== 'item' || typeof item.vars.x !== 'number') throw new Error(`dp-table: pause ${k - 1} is ${item.probe}, not an item`)
    const writes: ItemRun['writes'] = []
    while (ps[k]?.probe === 'write') {
      const pause = ps[k++]
      if (pause.vars.x !== item.vars.x) throw new Error(`dp-table: a write for ${pause.vars.x} inside item ${item.vars.x}`)
      writes.push({
        pause,
        after: table(ps[k], `the pause after write ${k - 1}`),
      })
    }
    out.push({ x: item.vars.x, item, writes })
  }
  if (ps[ps.length - 1].probe !== 'return') throw new Error('dp-table: the last pause must be the return')
  return out
}

export function buildLog(spec: PresetSpec): StepLog<DPState> {
  const { program: p, recording: rec } = spec
  const rowsOf = (l: number) => spec.display.flatMap((d, i) => (d.src === l && ('text' in d ? d.text.trim() : d.wrap[2] > d.wrap[1]) ? [i + 1] : []))
  const lineOf = (l: number): StepLine => {
    const rows = rowsOf(l)
    if (!rows.length) throw new Error(`${spec.id}: line ${l} is not in the shown code`)
    return rows.length === 1 ? rows[0] : [rows[0], rows[rows.length - 1]]
  }
  const first = rec.pauses[0].vars
  if (!first.nums) throw new Error(`${spec.id}: the items were not recorded`)
  const base = { nums: first.nums, names: p.names, output: [] as string[] }
  const start: DPState = {
    ...base,
    f: table(rec.pauses[0], 'the start'),
    x: null,
    j: null,
    read: null,
    pass: [],
  }
  const steps: Step<DPState>[] = [{ ...spec.start, state: start, focus: [], claim: 'modelled' }]
  let before = start

  for (const run of itemRuns(rec)) {
    if (!run.writes.length) {
      const state: DPState = {
        ...before,
        f: table(run.item, 'the item'),
        x: run.x,
        j: null,
        read: null,
        pass: [],
      }
      steps.push({
        ...spec.skip(run.x, state),
        state,
        line: lineOf(spec.lines.skip),
        focus: [ITEM_ID],
        claim: 'modelled',
      })
      before = state
      continue
    }
    const pass: number[] = []
    for (const w of run.writes) {
      const j = w.pause.vars.j!
      const read = j - run.x
      const reused = pass.includes(read)
      pass.push(j)
      const state: DPState = {
        ...before,
        f: w.after,
        x: run.x,
        j,
        read,
        pass: [...pass],
      }
      const was = table(w.pause, 'a write')[j]
      steps.push({
        ...spec.words({
          state,
          before,
          x: run.x,
          j,
          read,
          reused,
          was,
          now: w.after[j],
        }),
        state,
        line: lineOf(spec.lines.write),
        focus: [cellId(j), J_ID],
        claim: 'modelled',
      })
      before = state
    }
  }

  const ret = rec.pauses[rec.pauses.length - 1]
  steps.push({
    ...spec.end,
    state: {
      ...before,
      f: table(ret, 'the return'),
      j: null,
      read: null,
      pass: [],
      output: rec.stdout,
    },
    line: lineOf(spec.lines.end),
    focus: [OUTPUT_ID],
    claim: 'observed',
    observes: rec.stdout.map((_, k) => k),
  })

  const log: StepLog<DPState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: p.runtime, generator: DP_GENERATOR, sha256: p.sha256 },
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
