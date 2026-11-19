import type { Checkpoint, Step, StepLog } from '../../step-log/types'
import { FALLBACKS } from './truth/app'
import { SSR_GENERATOR, type HydrationRun, type Scenario, type SsrRecording } from './truth/types'
import { OUTPUT_ID, SCREEN_ID, SLOTS, chunkId, slotId, type Badge, type SSRState, type Slot, type WireLine } from './model'

/**
 * Builds a step-through from the recording (spec P6): every drawn value is
 * a point of the real run. The wire's lines are cut from the recorded
 * writes (`cutChunk`: each line is pieces of one write, in order, joined by
 * `…`); the screen's changes are Chromium's, in order; hydration is the
 * order the boundaries' effects and the click handler logged. Presets add
 * only words and checkpoints. The truth test re-records and rebuilds.
 */

export { SSR_GENERATOR }

/** The cuts: each marker of the protocol, short enough for a phone. Order is the HTML's. */
const CUTS: { re: RegExp; lines: (m: RegExpExecArray) => string[][] }[] = [
  { re: /<main><header>[^<]*<\/header>/g, lines: (m) => [[m[0]]] },
  {
    re: /(<!--\$\?--><template id="B:\d+">)<\/template>(<p>[^<]*<\/p><!--\/\$-->)/g,
    lines: (m) => [[m[1]], [m[2]]],
  },
  { re: /(<div hidden id="S:\d+">)[\s\S]*?(<\/div>)/g, lines: (m) => [[m[1], m[2]]] },
  { re: /<script>\$RB=\[\];\$RV=function/g, lines: (m) => [[m[0], '']] },
  { re: /\$RC\("B:\d+","S:\d+"\)/g, lines: (m) => [['<script>', m[0]]] },
  // A section outside any hidden S: div (the contrast's page; a streamed segment's section stays inside its cut).
  { re: /<section id="\w+">/g, lines: (m) => (m.input.includes('<div hidden') ? [] : [[m[0], '']]) },
  { re: /<\/main>$/g, lines: (m) => [[m[0]]] },
]

/** A line's text: its pieces joined by `…` (an empty last piece marks a cut tail). */
export const lineText = (pieces: readonly string[]) => pieces.join('…')

/** The wire lines of one recorded write. */
export function cutChunk(html: string, chunk: number): WireLine[] {
  const found: { at: number; pieces: string[] }[] = []
  for (const c of CUTS)
    for (const m of html.matchAll(new RegExp(c.re.source, c.re.flags))) for (const pieces of c.lines(m as RegExpExecArray)) found.push({ at: m.index!, pieces })
  // Stable by position (two lines of one match keep their order).
  const order = found.map((f, i) => ({ ...f, i })).sort((a, b) => a.at - b.at || a.i - b.i)
  return order.map((f) => ({ chunk, text: lineText(f.pieces), pieces: f.pieces }))
}

/** Problems with a line: its pieces must occur in its write, in order. */
export function lineProblems(line: WireLine, html: string): string[] {
  if (lineText(line.pieces) !== line.text) return [`"${line.text}" is not its pieces`]
  let at = 0
  for (const p of line.pieces) {
    if (!p) continue
    const i = html.indexOf(p, at)
    if (i < 0) return [`"${p}" of "${line.text}" is not in write ${line.chunk}${at ? ' after the piece before it' : ''}`]
    at = i + p.length
  }
  return []
}

/** Which slot each boundary id (B:n) holds, from the shell's placeholders (its fallback names it). */
export function boundaries(shell: string): Record<string, Slot> {
  const out: Record<string, Slot> = {}
  for (const m of shell.matchAll(/<template id="(B:\d+)"><\/template><p>([^<]*)<\/p>/g)) {
    const slot = SLOTS.find((s) => FALLBACKS[s] === m[2])
    if (!slot) throw new Error(`ssr-stream: fallback "${m[2]}" names no slot`)
    out[m[1]] = slot
  }
  return out
}

export type StepWords = { event: string; why: string; narration: string }

export type PresetSpec = {
  /** `ssr-stream/<preset>`. */
  id: string
  mode: 'stream' | 'string'
  recording: SsrRecording
  start: StepWords
  /** A write arriving (`slot`: the boundary whose content it carries; null for the shell or the whole page). */
  chunk: (c: { k: number; ms: number; slot: Slot | null; last: boolean }) => StepWords
  /** The screen changing (the slots that changed). */
  screen: (c: { ms: number; changed: Slot[]; first: boolean }) => StepWords
  js: StepWords
  /** A commit of hydrated boundaries. */
  commit: (c: { slots: Slot[]; clicked: boolean }) => StepWords
  /** The click handler running after a commit that did not include it (the contrast). */
  click: StepWords
  checkpoints: (steps: readonly Step<SSRState>[]) => Checkpoint[]
}

const blankSlots = (): SSRState['slots'] => ({ product: { view: 'none', badge: 'none' }, reviews: { view: 'none', badge: 'none' } })

export const CLICK_TEXT = 'Helpful clicked'

/** The click run's events after hydration began, as commits with the clicks that followed each. */
export function hydrationSteps(run: HydrationRun): { slots: Slot[]; clicks: number }[] {
  const out: { slots: Slot[]; clicks: number }[] = []
  let k = 0
  for (const e of run.events) {
    if (e.e === 'hydrated') {
      // The first effect of a commit opens it; the others of that commit are already in it.
      if (out.length && run.commits[k - 1]?.includes(e.name) && out[out.length - 1].clicks === 0 && run.commits[k - 1][0] !== e.name) continue
      const commit = run.commits[k]
      if (!commit || commit[0] !== e.name) throw new Error('ssr-stream: a hydration outside the commits')
      out.push({ slots: [...commit], clicks: 0 })
      k++
    } else if (e.e === 'click') {
      if (!out.length) throw new Error('ssr-stream: a click handled before any boundary hydrated')
      out[out.length - 1].clicks++
    }
  }
  return out
}

export function buildLog(spec: PresetSpec): StepLog<SSRState> {
  const rec = spec.recording
  const sc: Scenario = rec[spec.mode]
  const dataMs = { product: 120, reviews: 80 } as const
  const output: string[] = []
  let state: SSRState = {
    mode: spec.mode,
    at: 'request',
    wire: [],
    ended: false,
    chunks: [],
    painted: false,
    slots: blankSlots(),
    dataMs,
    pendingClick: false,
    output: [],
  }
  const steps: Step<SSRState>[] = [{ ...spec.start, state, focus: [], claim: 'modelled' }]
  const push = (next: SSRState, words: StepWords, focus: string[], observes?: number[]) => {
    state = next
    steps.push({ ...words, state, focus, claim: observes ? 'observed' : 'modelled', ...(observes ? { observes } : {}) })
  }
  const withBadge = (s: SSRState, slot: Slot, badge: Badge, view = s.slots[slot].view): SSRState['slots'] => ({ ...s.slots, [slot]: { view, badge } })

  const ids = spec.mode === 'stream' ? boundaries(sc.wire[0].html) : {}
  // The screen's first painted state (Chromium): the shell's fallbacks, or the whole page.
  const shown = sc.screen.filter((e) => e.product !== 'none' || e.reviews !== 'none')
  if (!shown.length) throw new Error(`${spec.id}: the screen never painted`)
  let screenAt = 0

  sc.wire.forEach((c, k) => {
    const last = k === sc.wire.length - 1
    const lines = cutChunk(c.html, k)
        const seg = c.html.match(/\$RC\("(B:\d+)","S:\d+"\)/)
    const slot = seg ? ids[seg[1]] : null
    let next: SSRState = { ...state, at: `${c.ms} ms`, wire: [...state.wire, ...lines], ended: last, chunks: [...state.chunks, { ms: c.ms }] }
    const focus = [chunkId(k)]
    if (k === 0 && spec.mode === 'stream') {
      // The shell paints with it: Header and both fallbacks (the screen's first change).
      const first = shown[screenAt++]
      next = { ...next, painted: true, slots: { product: { view: first.product, badge: 'fallback' }, reviews: { view: first.reviews, badge: 'fallback' } } }
      focus.push(SCREEN_ID)
    } else if (slot) {
      next = { ...next, slots: withBadge(next, slot, 'hidden') }
      focus.push(slotId(slot))
    }
    push(next, spec.chunk({ k, ms: c.ms, slot, last }), focus)
  })

  for (; screenAt < shown.length; screenAt++) {
    const e = shown[screenAt]
    const changed = SLOTS.filter((s) => state.slots[s].view !== e[s])
    if (!changed.length) continue
    const first = !state.painted
    const slots = { ...state.slots }
    for (const s of changed) slots[s] = { view: e[s], badge: e[s] === 'content' ? 'static' : 'fallback' }
    push({ ...state, at: `${e.ms} ms`, painted: true, slots }, spec.screen({ ms: e.ms, changed, first }), first ? [SCREEN_ID] : changed.map(slotId))
  }

  // Hydration: the run with the click (the idle run is checked against it by the truth test).
  const run = sc.hydration.click
  if (run.events[0]?.e !== 'hydrate-start') throw new Error(`${spec.id}: hydration did not start first`)
  push(
    { ...state, at: 'JS loaded', slots: { product: { ...state.slots.product, badge: 'hydrating' }, reviews: { ...state.slots.reviews, badge: 'hydrating' } }, pendingClick: true },
    spec.js,
    SLOTS.map(slotId),
  )
  for (const h of hydrationSteps(run)) {
    let slots = state.slots
    for (const s of h.slots) slots = { ...slots, [s]: { ...slots[s], badge: 'interactive' as Badge } }
    // A click handled right after a commit of only some boundaries was replayed with it; after the whole tree, it is its own step.
    const clickedHere = h.clicks > 0 && h.slots.length < SLOTS.length
    if (clickedHere) {
      const from = output.length
      for (let i = 0; i < h.clicks; i++) output.push(CLICK_TEXT)
      push(
        { ...state, at: 'hydrating', slots, pendingClick: false, output: [...output] },
        spec.commit({ slots: h.slots, clicked: true }),
        [...h.slots.map(slotId), OUTPUT_ID].slice(-2),
        output.map((_, i) => i).slice(from),
      )
      continue
    }
    push({ ...state, at: 'hydrating', slots }, spec.commit({ slots: h.slots, clicked: false }), h.slots.map(slotId))
    if (h.clicks > 0) {
      const from = output.length
      for (let i = 0; i < h.clicks; i++) output.push(CLICK_TEXT)
      push({ ...state, at: 'interactive', pendingClick: false, output: [...output] }, spec.click, [OUTPUT_ID], output.map((_, i) => i).slice(from))
    }
  }
  steps[steps.length - 1] = { ...steps[steps.length - 1], state: { ...steps[steps.length - 1].state, at: 'interactive' } }

  const log: StepLog<SSRState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: 'node@24.x', generator: SSR_GENERATOR, sha256: rec.sha256 },
    steps,
    checkpoints: [],
    observed: { log: [...output] },
  }
  return { ...log, checkpoints: spec.checkpoints(steps) }
}
