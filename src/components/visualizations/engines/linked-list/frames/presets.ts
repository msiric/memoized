import type { StaticPreset, VerifiedProgram } from '../../../shell/static-types'
import { stateOf } from '../build'
import { walk, type LLState } from '../model'
import type { PointerProgram, PointerRecording, ProbeHit } from '../program'
import { detectCycleProgram } from '../programs/fast-and-slow-pointers'
import { reverseFullProgram } from '../programs/linked-list-reversal'
import fastSlow from '../recordings/fast-and-slow-pointers.json'
import reversal from '../recordings/linked-list-reversal.json'
import type { FramesData, RhoPanel, RowPanel } from './model'

/**
 * The static presets: every panel is a recorded probe hit (`build.ts`
 * `stateOf`); the preset picks which hits, names them and marks one thing
 * per panel. The facts a panel states (the pairs, a, b, c, the meeting
 * node) are computed here from the recording, and the truth test rebuilds
 * the presets from a fresh run.
 */

const REC = { ...reversal, ...fastSlow } as unknown as Record<string, PointerRecording>

export const verified = (p: PointerProgram, rec: PointerRecording): VerifiedProgram => ({
  id: p.id,
  snippet: p.snippet,
  runtime: p.runtime,
  sha256: p.sha256,
  observed: rec.observed,
})

const v = (s: LLState, i: number | null) => (i === null ? 'null' : s.nodes[i].label)

/** Full reversal, one row per pass: previous and current after each pass, the arrow it flipped marked. */
export function fullReversalData(rec: PointerRecording): FramesData {
  const lanes = { above: [], below: ['previous', 'current'] }
  const keep = (h: ProbeHit): ProbeHit => ({ ...h, vars: { previous: h.vars.previous, current: h.vars.current } })
  const init = rec.hits.find((h) => h.probe === 'init')!
  const passes = rec.hits.filter((h) => h.probe === 'iteration')
  const panels: RowPanel[] = [{ kind: 'row', id: 'start', heading: 'before the loop', state: stateOf(rec, keep(init), lanes) }]
  let before = init
  passes.forEach((h, k) => {
    const state = stateOf(rec, keep(h), lanes)
    const changed = h.next.findIndex((t, i) => t !== before.next[i])
    panels.push({
      kind: 'row',
      id: `pass-${k + 1}`,
      heading: `pass ${k + 1}: ${v(state, changed)}.next = ${v(state, h.next[changed])}`,
      state,
      changed,
    })
    before = h
  })
  return { panels }
}

/** The rho's shape from the recorded links: the tail, the entry, the cycle in order. */
function rhoOf(s: LLState) {
  const w = walk(s, 0)
  const entry = w.order[w.order.length - 1]
  const at = w.order.indexOf(entry)
  return { entry, tail: w.order.slice(0, at), cycle: w.order.slice(at, -1) }
}

/** Floyd's two phases on 1..6 (6 -> 3): where slow and fast meet, then the reset pointers meeting at the entry. */
export function floydData(rec: PointerRecording): FramesData {
  const strides = rec.hits.filter((h) => h.probe === 'stride')
  const meetHit = strides[strides.length - 1]
  const reset = rec.hits.find((h) => h.probe === 'reset')!
  const walks = [reset, ...rec.hits.filter((h) => h.probe === 'walk')]
  const one = stateOf(rec, { ...meetHit, vars: { slow: meetHit.vars.slow, fast: meetHit.vars.fast } }, { above: [], below: ['slow', 'fast'] })
  const two = stateOf(
    rec,
    { ...reset, vars: { pointer1: reset.vars.pointer1, pointer2: reset.vars.pointer2 } },
    { above: [], below: ['pointer1', 'pointer2'] },
  )
  const rho = rhoOf(one)
  const meet = meetHit.vars.slow!
  // Distances along the links: a from head to the entry, b from the entry to the meeting node, c round the cycle.
  const a = rho.tail.length
  const b = rho.cycle.indexOf(meet)
  const c = rho.cycle.length
  const pair = (h: ProbeHit, x: string, y: string) => `(${v(one, h.vars[x])},${v(one, h.vars[y])})`
  const panels: RhoPanel[] = [
    {
      kind: 'rho',
      id: 'phase-1',
      heading: 'phase 1: slow 1 step, fast 2',
      state: one,
      rho,
      mark: { node: meet, label: 'meet' },
      pairs: { names: ['slow', 'fast'], values: strides.map((h) => pair(h, 'slow', 'fast')) },
    },
    {
      kind: 'rho',
      id: 'phase-2',
      heading: `phase 2: a = c - b (${a} = ${c} - ${b})`,
      state: two,
      rho,
      mark: { node: rho.entry, label: 'entry' },
      pairs: { names: ['pointer1', 'pointer2'], values: walks.map((h) => pair(h, 'pointer1', 'pointer2')) },
      distances: { a, b, c, meet },
    },
  ]
  return { panels }
}

const reversalRec = REC[reverseFullProgram.id]
const floydRec = REC[detectCycleProgram.id]

export const fullReversalStrip: StaticPreset<FramesData> = {
  id: 'full-reversal-strip',
  label: 'Full reversal',
  title: 'Reversal: one arrow per pass',
  caption: 'Each pass saves next, flips one arrow back and moves both pointers on, so the reversed part grows behind previous.',
  programs: [verified(reverseFullProgram, reversalRec)],
  claims: [],
  data: fullReversalData(reversalRec),
}

export const floydRho: StaticPreset<FramesData> = {
  id: 'floyd-rho',
  label: 'Floyd rho',
  title: 'Floyd: meeting point, then entry',
  caption: 'slow and fast meet inside the cycle, at 5, not at its entry. As a = c - b, two pointers one step at a time then meet at 3.',
  programs: [verified(detectCycleProgram, floydRec)],
  claims: [],
  data: floydData(floydRec),
}
