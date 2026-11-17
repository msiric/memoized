import type { DispatchPanel, DispatchStep, Party, SequenceMessage, SequencePanel, TimelinePanel, TimelineRow } from './model'
import type { DispatchRecording } from './programs/dispatch'
import type { PkceRecording } from './programs/pkce'
import { BURST, END, WAIT, type TimerEvent, type TimersRecording } from './programs/timers'
import type { TypesRecording } from './programs/types'

/**
 * Recordings to panels: every mark, badge, message and verdict drawn is an
 * event or value the run recorded; the builders only arrange them. They
 * throw when a recording cannot say what the figure would show.
 */

// --- timeline ----------------------------------------------------------------

/** The calls lane: one tick per recorded call, named by its argument. */
function callsRow(events: readonly TimerEvent[]): TimelineRow {
  return { id: 'calls', label: 'calls', marks: events.filter((e) => e[0] === 'call').map((e) => ({ t: e[1], kind: 'call', label: e[2] as string })), bands: [] }
}

/**
 * A policy's lane: a timer that was cleared is a ghost deadline; a timer
 * callback that invoked the function is a run (named by the argument); one
 * that invoked nothing is a release; a call that invoked nothing at once and
 * scheduled nothing is a drop; a scheduled release is a closed gate.
 */
function policyRow(id: string, label: string, events: readonly TimerEvent[]): TimelineRow {
  const marks: TimelineRow['marks'] = []
  const bands: TimelineRow['bands'] = []
  const cleared = new Set(events.filter((e) => e[0] === 'clear').map((e) => e[2]))
  events.forEach((e, i) => {
    const next = events[i + 1]
    if (e[0] === 'schedule' && cleared.has(e[2])) marks.push({ t: e[3], kind: 'ghost' })
    if (e[0] === 'invoke') marks.push({ t: e[1], kind: 'invoke', label: e[2] })
    if (e[0] === 'fire' && next?.[0] !== 'invoke') marks.push({ t: e[1], kind: 'release' })
    if (e[0] === 'call' && (!next || next[0] === 'call' || next[0] === 'fire')) marks.push({ t: e[1], kind: 'drop', label: e[2] })
  })
  // A schedule followed by an invoke at the same moment (leading-only) is the gate: closed until its timer runs.
  events.forEach((e, i) => {
    if (e[0] === 'schedule' && events[i + 1]?.[0] === 'invoke') bands.push({ from: e[1], to: e[3], label: 'gate closed' })
  })
  return { id, label, marks: marks.sort((a, b) => a.t - b.t), bands }
}

export function timelinePanel(rec: TimersRecording, heading: string): TimelinePanel {
  const calls = callsRow(rec.debounce)
  if (JSON.stringify(calls.marks.map((m) => [m.t, m.label])) !== JSON.stringify(BURST) || JSON.stringify(callsRow(rec.throttle).marks) !== JSON.stringify(calls.marks))
    throw new Error('the recorded calls are not the burst the figure draws')
  return {
    kind: 'timeline',
    id: 'burst',
    heading,
    end: END,
    ticks: [0, 50, 100, 150, 200, 250],
    rows: [calls, policyRow('debounce', `trailing debounce, wait ${WAIT}`, rec.debounce), policyRow('throttle', `leading-only throttle, wait ${WAIT}`, rec.throttle)],
    notes: [],
  }
}

// --- dispatch ------------------------------------------------------------------

const PHASE = (n: number): 1 | 2 | 3 => {
  if (n !== 1 && n !== 2 && n !== 3) throw new Error(`eventPhase ${n}`)
  return n
}

/** The default run's listeners, numbered in the order they ran; a scenario's run marks those that still ran. */
export function dispatchPanel(rec: DispatchRecording, scenario: string, spec: { heading: string; compact?: boolean }): DispatchPanel {
  const base = rec.scenarios.default
  const run = rec.scenarios[scenario]
  if (!base || !run) throw new Error(`no recorded dispatch ${scenario}`)
  if (base.calls.length !== base.logs.length) throw new Error('every listener of the lesson logs once')
  const steps: DispatchStep[] = base.calls.map(([at, phase], i) => ({ n: i + 1, at, phase: PHASE(phase), ran: false, log: base.logs[i] }))
  // A scenario runs a prefix of the default's listeners, then its own stopping listener.
  let k = 0
  while (k < steps.length && k < run.calls.length && run.calls[k][0] === steps[k].at && run.calls[k][1] === steps[k].phase && run.logs[k] === steps[k].log) steps[k++].ran = true
  if (run.logs.length !== k) throw new Error(`${scenario}: the logs are not a prefix of the default run`)
  const extra = run.calls.length - k
  if (scenario === 'default' ? extra !== 0 : extra !== 1) throw new Error(`${scenario}: ${extra} listener calls beyond the lesson's`)
  const path = [...run.path].reverse()
  const panel: DispatchPanel = {
    kind: 'dispatch',
    id: scenario,
    heading: spec.heading,
    path: spec.compact ? path.filter((x) => steps.some((s) => s.at === x)) : path,
    steps,
  }
  if (extra) panel.cutAfter = k
  if (spec.compact) panel.compact = true
  return panel
}

// --- sequence ------------------------------------------------------------------

const KEY_VALUES = ['state', 'code_challenge', 'code', 'code_verifier', 'client_secret', 'access_token', 'id_token'] as const

export function sequencePanel(rec: PkceRecording, spec: { heading: string; titles: Record<number, string>; signIn: string; notes: string[] }): SequencePanel {
  const messages: SequenceMessage[] = rec.hops.map((h) => ({ n: h.n, from: h.from, to: h.to, channel: h.channel, title: spec.titles[h.n] ?? h.what, params: h.params }))
  if (!rec.hops.some((h) => h.n === 1) || rec.hops.some((h) => h.n === 2)) throw new Error('the recording numbers its hops 1 and 3 to 6')
  messages.splice(1, 0, { n: 2, from: 'auth', to: 'auth', channel: 'self', title: spec.signIn, params: [], modelled: true })
  // Who holds what: every key value a party sent or received, plus the app's session.
  const holds: Record<Party, string[]> = { browser: [], app: [], auth: [] }
  const give = (p: Party, v: string) => {
    if (!holds[p].includes(v)) holds[p].push(v)
  }
  for (const v of rec.holds.session) give('app', v === 'codeVerifier' ? 'code_verifier' : v)
  for (const h of rec.hops) for (const v of KEY_VALUES) if (h.params.includes(v)) [h.from, h.to].forEach((p) => give(p, v))
  for (const p of Object.keys(holds) as Party[]) holds[p].sort((a, b) => KEY_VALUES.indexOf(a as never) - KEY_VALUES.indexOf(b as never))
  return {
    kind: 'sequence',
    id: 'pkce',
    heading: spec.heading,
    parties: [
      { id: 'browser', label: 'Browser' },
      { id: 'app', label: 'App server' },
      { id: 'auth', label: 'Auth server' },
    ],
    messages,
    holds,
    notes: spec.notes,
  }
}

// --- sets ----------------------------------------------------------------------

/** A case's verdict: the compiler accepted it (no diagnostics) or the codes it reported. */
export function verdict(rec: TypesRecording, id: string): 'ok' | number[] {
  const d = rec.cases[id]
  if (!d) throw new Error(`no recorded tsc case ${id}`)
  return d.length ? d.map((x) => x.code) : 'ok'
}
