import { hasWrapRows, placeholderText, type DisplayRow } from '../../step-log/lesson-source'
import type { Checkpoint, CodeToken, Step, StepLine, StepLog } from '../../step-log/types'
import { BEST_ID, LEFT_ID, OUTPUT_ID, RIGHT_ID, keyId, type StoreEntry, type SWState } from './model'
import type { Pause, WindowProgram, WindowRecording } from './program'

/**
 * Builds a step-through from a recording (spec P6): every drawn value (the
 * edges, the count map or Set, the best length, the string itself) is a
 * pause of the real run. Presets add only words and checkpoints; they cannot
 * move an edge or change a count. The truth test re-records the program and
 * rebuilds the steps.
 *
 * One loop iteration is read as:
 * - `arrive`: the first shrink check, with the right edge on its new
 *   character (a count map has already counted it; a Set has not added it);
 * - `shrinks`: every later pause of the iteration, up to the add (Set) or
 *   the record (map), whose left edge moved: one per pass of the shrink
 *   (`while`), or the single pass of an `if`;
 * - `settled`: the record pause (the window after the shrink and, for a
 *   Set, the add); the best length it records is read at the next pause.
 *
 * Steps per iteration:
 * - map, no shrink: one `grow` step (count, no shrink, record);
 * - map, with shrinks: `extend` (counted, over the limit), one `shrink` per
 *   pass, then `record`;
 * - Set: one `shrink` per delete (the first also moves the right edge onto
 *   the character it read), then `grow` (add and record).
 */

export const WINDOW_GENERATOR = 'node-inspector-window@1'

export type StepWords = { event: string; why: string; narration: string }
export type StepKind = 'grow' | 'extend' | 'shrink' | 'record'

/** What the words of one step may read. */
export type WordsContext = {
  kind: StepKind
  state: SWState
  before: SWState
  /** The character the right edge read this iteration. */
  ch: string
  /** For a shrink: the character that left, and which pass of this iteration it is (1-based) of how many. */
  left?: string
  pass?: number
  passes: number
  /** The window's length as the code computes it. */
  length: number
}

export type Iteration = { right: number; arrive: Pause; shrinks: Pause[]; settled: Pause; bestAfter: number }

export type PresetSpec = {
  /** `sliding-window/<preset>`. */
  id: string
  program: WindowProgram
  recording: WindowRecording
  /**
   * The reader's code: the lesson function reflowed to the pane (only
   * whitespace may differ), `src` a line of the program as run. A practice
   * answer's rows carry no text (`wrap`, resolved for a page).
   */
  display: readonly DisplayRow[]
  /** Lines of the program as run that each kind of step highlights. */
  lines: Record<StepKind | 'end', number | readonly [number, number]>
  start: StepWords
  words: (c: WordsContext) => StepWords
  end: StepWords
  checkpoints: (steps: readonly Step<SWState>[]) => Checkpoint[]
}

const entries = (p: Pause): StoreEntry[] =>
  (p.vars.store ?? []).map((e) => (Array.isArray(e) ? { key: e[0], count: e[1] } : { key: e }))

/** The iterations of a recorded run (see the module comment). */
export function iterations(p: WindowProgram, rec: WindowRecording): Iteration[] {
  const map = p.names.storeKind === 'map'
  const out: Iteration[] = []
  const ps = rec.pauses
  let k = map ? ps.findIndex((x) => x.probe === 'iter') : ps.findIndex((x) => x.probe === 'check')
  if (k < 0) throw new Error(`${p.id}: no loop iteration recorded`)
  while (k < ps.length && ps[k].probe !== 'return') {
    if (map) {
      if (ps[k].probe !== 'iter') throw new Error(`${p.id}: pause ${k} is ${ps[k].probe}, not an iteration's start`)
      k++
    }
    const checks: Pause[] = []
    while (ps[k]?.probe === 'check') checks.push(ps[k++])
    const after: Pause[] = []
    if (!map) {
      if (ps[k]?.probe !== 'add') throw new Error(`${p.id}: pause ${k} is ${ps[k]?.probe}, not the add`)
      after.push(ps[k++])
    }
    const settled = ps[k++]
    if (settled?.probe !== 'record' || !checks.length) throw new Error(`${p.id}: iteration at pause ${k} has no check or record`)
    const seq = [...checks.slice(1), ...(map ? [settled] : after)]
    const shrinks: Pause[] = []
    let at = checks[0].vars.left!
    for (const x of seq)
      if (x.vars.left! > at) {
        if (x.vars.left !== at + 1) throw new Error(`${p.id}: the left edge moved by ${x.vars.left! - at} in one pass`)
        shrinks.push(x)
        at = x.vars.left!
      }
    const next = ps[k]
    if (!next || next.vars.best === undefined) throw new Error(`${p.id}: no pause after the record reads the best length`)
    out.push({ right: checks[0].vars.right!, arrive: checks[0], shrinks, settled, bestAfter: next.vars.best })
  }
  return out
}

/**
 * A comment the pane breaks over rows: Shiki reads its continuation rows as
 * code, so they take the comment colour of its first row (the tokenizer's
 * `COMMENT_COLOR`), as one comment.
 */
export function commentRows(tokens: readonly (readonly CodeToken[])[], display: readonly DisplayRow[]): CodeToken[][] {
  return tokens.map((row, i) => {
    const head = display.findIndex((x) => x.src === display[i].src)
    const lead = head === i ? undefined : tokens[head].find((t) => /^\s*\/\//.test(t.text))
    return lead ? row.map((t) => ({ ...t, ...(lead.color ? { color: lead.color } : {}) })) : [...row]
  })
}

export function buildLog(spec: PresetSpec): StepLog<SWState> {
  const { program: p, recording: rec } = spec
  const map = p.names.storeKind === 'map'
  const rowsOf = (a: number, b: number) =>
    spec.display.flatMap((d, i) => (d.src >= a && d.src <= b && ('text' in d ? d.text.trim() : d.wrap[2] > d.wrap[1]) ? [i + 1] : []))
  const lineOf = (kind: StepKind | 'end'): StepLine => {
    const l = spec.lines[kind]
    const [a, b] = typeof l === 'number' ? [l, l] : l
    const rows = rowsOf(a, b)
    if (!rows.length) throw new Error(`${p.id}: lines ${a}-${b} are not in the shown code`)
    return rows.length === 1 ? rows[0] : [rows[0], rows[rows.length - 1]]
  }

  const first = rec.pauses[0].vars
  const text = first.s
  if (typeof text !== 'string') throw new Error(`${p.id}: the string was not recorded`)
  const base = { text, names: p.names, ...(first.k !== undefined ? { k: first.k } : {}), output: [] as string[] }
  const stateOf = (x: Pause, o: { right: number | null; pending?: boolean; best?: number }): SWState => ({
    ...base,
    left: x.vars.left!,
    right: o.right,
    pending: o.pending ?? false,
    store: entries(x),
    best: o.best ?? x.vars.best!,
  })

  const start = stateOf(rec.pauses[0], { right: null })
  const steps: Step<SWState>[] = [{ ...spec.start, state: start, focus: [], claim: 'modelled' }]
  let before = start
  const push = (kind: StepKind, state: SWState, focus: string[], c: Omit<WordsContext, 'kind' | 'state' | 'before' | 'length'>) => {
    const length = state.right === null ? 0 : state.right - state.left + 1
    steps.push({ ...spec.words({ ...c, kind, state, before, length }), state, line: lineOf(kind), focus, claim: 'modelled' })
    before = state
  }

  for (const it of iterations(p, rec)) {
    const ch = text[it.right]
    const passes = it.shrinks.length
    const leaving = (x: Pause, prev: SWState) => text[x.vars.left! - 1] ?? prev.text[prev.left]
    if (map) {
      if (!passes) {
        push('grow', stateOf(it.settled, { right: it.right, best: it.bestAfter }), [RIGHT_ID, keyId(ch)], { ch, passes })
        continue
      }
      push('extend', stateOf(it.arrive, { right: it.right }), [RIGHT_ID, keyId(ch)], { ch, passes })
      it.shrinks.forEach((x, n) => {
        const out = leaving(x, before)
        const state = stateOf(x, { right: it.right })
        // A key whose count reached 0 has left the map: only the edge is named (its chip's exit is a departure).
        const kept = state.store.some((e) => e.key === out)
        push('shrink', state, kept ? [LEFT_ID, keyId(out)] : [LEFT_ID], { ch, passes, left: out, pass: n + 1 })
      })
      push('record', stateOf(it.settled, { right: it.right, best: it.bestAfter }), [BEST_ID], { ch, passes })
    } else {
      it.shrinks.forEach((x, n) => {
        const out = leaving(x, before)
        // The deleted member has left the Set: only the edge is named (its chip's exit is a departure).
        push('shrink', stateOf(x, { right: it.right, pending: true }), [LEFT_ID], { ch, passes, left: out, pass: n + 1 })
      })
      push('grow', stateOf(it.settled, { right: it.right, best: it.bestAfter }), passes ? [keyId(ch), BEST_ID] : [RIGHT_ID, keyId(ch)], { ch, passes })
    }
  }

  // The end: what the run printed, after the return.
  const ret = rec.pauses[rec.pauses.length - 1]
  if (ret.probe !== 'return') throw new Error(`${p.id}: the last pause must be the return`)
  steps.push({
    ...spec.end,
    state: { ...before, best: ret.vars.best!, output: rec.observed },
    line: lineOf('end'),
    focus: [OUTPUT_ID],
    claim: 'observed',
    observes: rec.observed.map((_, k) => k),
  })

  const log: StepLog<SWState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: p.runtime, generator: WINDOW_GENERATOR, sha256: p.sha256 },
    code: {
      lang: p.lang,
      lines: placeholderText(spec.display),
      ...(hasWrapRows(spec.display) ? { premium: { source: p.source, rows: spec.display } } : {}),
    },
    steps,
    checkpoints: [],
    observed: { log: rec.observed },
  }
  return { ...log, checkpoints: spec.checkpoints(steps) }
}
