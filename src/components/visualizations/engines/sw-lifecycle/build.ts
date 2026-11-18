import type { Checkpoint, Step, StepLog } from '../../step-log/types'
import { SLOTS, TABS, cacheId, swIntrospection, tabId, workerId, type SlotId, type SwState } from './model'
import { SW_SCENARIOS, type SwRecording, type SwSnap, type TabId } from './programs/scenarios'
import { SW_GENERATOR } from './truth/generator'

/**
 * Builds a step-through from a recorded scenario (spec P6): every drawn
 * value (which worker sits in which slot and in what state, who controls
 * each tab, the cache names) is a snapshot the recorder took in Chromium.
 * The first snapshot is Start; each later one is a step. Presets add only
 * words and checkpoints. Focus is derived: the worker cards that moved or
 * changed state, else the tabs that changed or that the scenario opened,
 * reloaded or closed, else the cache that arrived. Those tabs are marked.
 */

export { SW_GENERATOR }

export type StepWords = { event: string; why: string; narration: string }

export type PresetSpec = {
  /** `sw-lifecycle/<preset>`. */
  id: string
  /** The recorded scenario the steps are built from. */
  scenario: string
  recording: SwRecording
  /** Words per snapshot, by its name (`as`). */
  words: Record<string, (state: SwState) => StepWords>
  checkpoints: (steps: readonly Step<SwState>[], names: readonly string[]) => Checkpoint[]
}

/** A recorded snapshot as the machine's state (the redundant slot holds the replaced workers). */
export function stateOf(snap: SwSnap): Omit<SwState, 'marked'> {
  const slot = (s: SlotId) => {
    const w = snap.slots[s]
    return w ? [{ v: w.v, state: w.state }] : []
  }
  return {
    slots: {
      installing: slot('installing'),
      waiting: slot('waiting'),
      active: slot('active'),
    },
    redundant: snap.redundant.map((v) => ({ v, state: 'redundant' })),
    tabs: {
      A: { open: snap.tabs.A.open, controller: snap.tabs.A.controller, changes: snap.tabs.A.changes },
      B: { open: snap.tabs.B.open, controller: snap.tabs.B.controller, changes: snap.tabs.B.changes },
    },
    caches: snap.caches,
  }
}

const whereIs = (s: Omit<SwState, 'marked'>, id: string) => {
  for (const k of SLOTS) {
    const w = s.slots[k].find((x) => workerId(x.v) === id)
    if (w) return `${k}:${w.state}`
  }
  return s.redundant.some((x) => workerId(x.v) === id) ? 'redundant' : null
}

/** What changed between two states: moved or re-stated workers, changed tabs, arrived caches. */
export function changes(a: Omit<SwState, 'marked'>, b: Omit<SwState, 'marked'>) {
  // Workers on stage in either state (a worker that became redundant leaves the stage).
  const ids = [...new Set([...swIntrospection.ids({ ...a, marked: [] }), ...swIntrospection.ids({ ...b, marked: [] })])]
  const workers = ids.filter((id) => id.startsWith('worker-') && whereIs(a, id) !== whereIs(b, id))
  const tabs = TABS.filter((t) => JSON.stringify(a.tabs[t]) !== JSON.stringify(b.tabs[t])).map(tabId)
  const arrived = b.caches.filter((c) => !a.caches.includes(c)).map(cacheId)
  // A worker that stays in its slot but changes state (activating -> activated) is marked, not moved.
  const restated = workers.filter((id) => whereIs(a, id)?.split(':')[0] === whereIs(b, id)?.split(':')[0])
  return { workers, tabs, arrived, restated }
}

/** The tabs the scenario opened, reloaded or closed before each snapshot (a reload changes no value, but it is the step's act). */
export function actedTabs(scenario: string): Record<string, TabId[]> {
  const s = SW_SCENARIOS.find((x) => x.id === scenario)
  if (!s) throw new Error(`sw-lifecycle: no scenario ${scenario}`)
  const out: Record<string, TabId[]> = {}
  let acted: TabId[] = []
  for (const a of s.actions) {
    if (a.do === 'snap') {
      out[a.as] = acted
      acted = []
    } else if ((a.do === 'open' || a.do === 'reload' || a.do === 'close') && !acted.includes(a.tab)) acted.push(a.tab)
  }
  return out
}

export function buildLog(spec: PresetSpec): StepLog<SwState> {
  const run = spec.recording.scenarios[spec.scenario]
  if (!run?.length) throw new Error(`${spec.id}: scenario ${spec.scenario} was not recorded`)
  const names = run.map((r) => r.as)
  const acted = actedTabs(spec.scenario)
  const steps: Step<SwState>[] = []
  let prev: Omit<SwState, 'marked'> | null = null
  for (const { as, snap } of run) {
    const words = spec.words[as]
    if (!words) throw new Error(`${spec.id}: no words for snapshot ${as}`)
    const base = stateOf(snap)
    if (!prev) {
      const state: SwState = { ...base, marked: [] }
      steps.push({ ...words(state), state, focus: [], claim: 'modelled' })
    } else {
      const c = changes(prev, base)
      const tabs = [...new Set([...c.tabs, ...(acted[as] ?? []).map(tabId)])].sort()
      const marked = [...tabs, ...c.restated]
      const state: SwState = { ...base, marked }
      // Focus names glyphs on stage after the step (a worker that became redundant leaves; the budget still plays its exit).
      const onStage = swIntrospection.ids(state)
      const workers = c.workers.filter((id) => onStage.has(id))
      const focus = (workers.length ? workers : tabs.length ? tabs : c.arrived).slice(0, 2)
      if (!focus.length) throw new Error(`${spec.id}: snapshot ${as} changes nothing on stage`)
      steps.push({ ...words(state), state, focus, claim: 'modelled' })
    }
    prev = base
  }
  const log: StepLog<SwState> = {
    id: spec.id,
    schema: 1,
    source: { runtime: spec.recording.browser.replace(/^(chromium@\d+).*/, '$1.x'), generator: SW_GENERATOR, sha256: spec.recording.sha256 },
    steps,
    checkpoints: [],
    observed: {},
  }
  return { ...log, checkpoints: spec.checkpoints(steps, names) }
}
