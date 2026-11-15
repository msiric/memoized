import type { Step, StepLine, StepLog, Checkpoint } from '../../step-log/types'
import {
  OUTPUT_ID,
  linkId,
  nodeId,
  pointerId,
  type LLLanes,
  type LLState,
} from './model'
import { reflowMap, resolveLine, shownLines, type LineRef, type PointerProgram, type PointerRecording, type ProbeHit } from './program'

/**
 * Builds a step-through from a recording (spec P6): one step per probe hit,
 * in run order, whose state is exactly what the probe saw; the end step adds
 * the program's printed output. Presets add only words (the step's name,
 * why and narration) and checkpoints; they cannot place a pointer or an
 * arrow. The truth test re-records the program and rebuilds the steps.
 */

export const POINTER_GENERATOR = 'node-pointer-trace@1'

export type StepWords = { event: string; why: string; narration: string }

/** What the words of one step may read: the hit, its state and the one before. */
export type WordsContext = {
  hit: ProbeHit
  state: LLState
  before: LLState
  /** 1-based count of this probe's hits so far (the loop iteration). */
  pass: number
  /** The node's value, or `null`. */
  v: (i: number | null) => string
}

export type PresetSpec = {
  /** `linked-list/<id>`. */
  id: string
  program: PointerProgram
  recording: PointerRecording
  lanes: LLLanes
  /** The reader's code: the lesson function reflowed to the pane (only whitespace may differ). */
  display: readonly string[]
  start: StepWords
  words: Record<string, (c: WordsContext) => StepWords>
  end: StepWords & { line: LineRef }
  checkpoints: (steps: readonly Step<LLState>[]) => Checkpoint[]
}

export function stateOf(rec: PointerRecording, hit: ProbeHit, lanes: LLLanes, output: readonly string[] = []): LLState {
  const order = [...lanes.above, ...lanes.below]
  for (const name of Object.keys(hit.vars))
    if (!order.includes(name)) throw new Error(`pointer ${name} has no lane`)
  return {
    nodes: rec.labels.map((label, i) => ({ id: nodeId(i), label })),
    next: hit.next,
    pointers: order.filter((name) => name in hit.vars).map((name) => ({ name, at: hit.vars[name] })),
    lanes,
    output,
  }
}

/** What changed between two states, as glyph ids: links first, then pointers that moved or arrived, then leavers. */
export function changes(before: LLState, after: LLState): string[] {
  const links = after.next.flatMap((to, i) => (to !== before.next[i] ? [linkId(i)] : []))
  const was = new Map(before.pointers.map((p) => [p.name, p.at]))
  const now = new Map(after.pointers.map((p) => [p.name, p.at]))
  const moved = after.pointers.flatMap((p) => (was.has(p.name) && was.get(p.name) !== p.at ? [pointerId(p.name)] : []))
  const arrived = after.pointers.flatMap((p) => (was.has(p.name) ? [] : [pointerId(p.name)]))
  const left = before.pointers.flatMap((p) => (now.has(p.name) ? [] : [pointerId(p.name)]))
  return [...links, ...moved, ...arrived, ...left]
}

export function buildLog(spec: PresetSpec): StepLog<LLState> {
  const { program: p, recording: rec } = spec
  const lines = p.snippet.split('\n')
  const shownFirst = resolveLine(lines, p.shown.first, `${p.id}: `)
  const map = reflowMap(shownLines(p), spec.display)
  const displayLine = (ref: LineRef): number => {
    const i = resolveLine(lines, ref, `${p.id}: `) - shownFirst
    const r = map.get(i)
    if (!r) throw new Error(`${p.id}: "${ref.text}" is not in the shown code`)
    return r[0]
  }
  const range = (ref: LineRef, from?: LineRef): StepLine => {
    const a = from ? displayLine(from) : displayLine(ref)
    const bLine = resolveLine(lines, ref, `${p.id}: `) - shownFirst
    const b = map.get(bLine)![1]
    return a === b ? a : [a, b]
  }
  const v = (state: LLState) => (i: number | null) => (i === null ? 'null' : state.nodes[i].label)

  const [startHit, ...hits] = rec.hits
  if (startHit.probe !== 'start') throw new Error(`${p.id}: the first probe must be "start" (the list before the call)`)
  const start = stateOf(rec, startHit, spec.lanes)
  const steps: Step<LLState>[] = [{ ...spec.start, state: start, focus: [], claim: 'modelled' }]
  const passes = new Map<string, number>()
  let before = start
  for (const hit of hits) {
    const probe = p.probes.find((x) => x.id === hit.probe)!
    const pass = (passes.get(hit.probe) ?? 0) + 1
    passes.set(hit.probe, pass)
    const state = stateOf(rec, hit, spec.lanes)
    const words = spec.words[hit.probe]
    if (!words) throw new Error(`${p.id}: no words for probe "${hit.probe}"`)
    const focus = changes(before, state).slice(0, 2)
    if (!focus.length) throw new Error(`${p.id}: probe "${hit.probe}" pass ${pass} changes nothing on the stage`)
    steps.push({
      ...words({ hit, state, before, pass, v: v(state) }),
      state,
      line: range(probe.after, probe.from),
      focus,
      claim: 'modelled',
    })
    before = state
  }
  // The end: what the run printed, after the last probe's state.
  steps.push({
    event: spec.end.event,
    why: spec.end.why,
    narration: spec.end.narration,
    state: { ...before, output: rec.observed },
    line: displayLine(spec.end.line),
    focus: [OUTPUT_ID],
    claim: 'observed',
    observes: rec.observed.map((_, k) => k),
  })

  const log: StepLog<LLState> = {
    id: spec.id,
    schema: 1,
    source: { snippet: p.snippet, runtime: p.runtime, generator: POINTER_GENERATOR, sha256: p.sha256 },
    code: { lang: p.lang, lines: spec.display },
    steps,
    checkpoints: [],
    observed: { log: rec.observed },
  }
  return { ...log, checkpoints: spec.checkpoints(steps) }
}

