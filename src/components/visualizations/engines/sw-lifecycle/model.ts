import type { StateIntrospection } from '../../step-log/types'
import type { TabId, Version } from './programs/scenarios'

/**
 * The service-worker lifecycle notional machine (R4, js-track Service
 * Workers): one registration with its installing, waiting and active slots,
 * the two tabs and which
 * worker controls each, and the origin's Cache Storage. A worker card keeps
 * its id as it moves between slots, so the move is drawn as one glyph
 * travelling. Nothing here is computed: every state is a step of a run
 * recorded in real Chromium (`build.ts`), and the truth test re-records it.
 */

/** The registration's slots, drawn top to bottom. */
export const SLOTS = ['installing', 'waiting', 'active'] as const
export type SlotId = (typeof SLOTS)[number]
export const TABS: readonly TabId[] = ['A', 'B']

export type SwWorker = {
  v: Version
  /** The state the browser reports (`installing`, `installed`, `activating`, `activated`, `redundant`). */
  state: string
}

export type SwState = {
  /** Each slot's worker (at most one). */
  slots: Record<SlotId, readonly SwWorker[]>
  /**
   * Workers the browser marked redundant, oldest first. Not a slot: a
   * replaced worker's card leaves the registration (the caption and the
   * text alternative name it).
   */
  redundant: readonly SwWorker[]
  tabs: Record<TabId, { open: boolean; controller: Version | null; changes: number }>
  caches: readonly string[]
  /** Glyphs whose value changed on this step (a tab's controller, a worker's state): the neutral `changed` mark. */
  marked: readonly string[]
}

export const workerId = (v: Version) => `worker-${v}`
export const tabId = (t: TabId) => `tab-${t}`
export const cacheId = (name: string) => `cache-${name}`
export const slotRegion = (s: SlotId) => `swl-${s}`
export const CACHE_REGION = 'swl-caches'

/** A worker card's label: its version, and the state where the slot does not say it (an activating worker). */
export const workerLabel = (w: SwWorker) => (w.state === 'activating' ? `${w.v} activating` : w.v)

export const swIntrospection: StateIntrospection<SwState> = {
  ids(state) {
    const ids = new Set<string>(TABS.map(tabId))
    for (const s of SLOTS) for (const w of state.slots[s]) ids.add(workerId(w.v))
    for (const c of state.caches) ids.add(cacheId(c))
    return ids
  },
  region(state, id) {
    for (const s of SLOTS) if (state.slots[s].some((w) => workerId(w.v) === id)) return slotRegion(s)
    if (state.caches.some((c) => cacheId(c) === id)) return CACHE_REGION
    return undefined
  },
}

/** What a tab card says: closed, no controller, or the controlling worker. */
export const tabText = (t: SwState['tabs'][TabId]) => (!t.open ? 'closed' : t.controller ? `→ ${t.controller}` : 'no controller')

/** The stage's accessible name: every tab, every slot, the caches (spec §5.3). */
export function describeSw(state: SwState): string {
  const tabs = TABS.map((t) => {
    const s = state.tabs[t]
    if (!s.open) return `Tab ${t} is closed.`
    return `Tab ${t} is ${s.controller ? `controlled by ${s.controller}` : 'not controlled'}${s.changes ? `, controllerchange fired ${s.changes === 1 ? 'once' : `${s.changes} times`}` : ''}.`
  }).join(' ')
  const slots = SLOTS.map((s) => `${s}: ${state.slots[s].length ? state.slots[s].map((w) => `${w.v} (${w.state})`).join(', ') : 'empty'}`).join('; ')
  const gone = state.redundant.length ? ` Redundant: ${state.redundant.map((w) => w.v).join(', ')}.` : ''
  return `${tabs} Registration ${slots}.${gone} Cache Storage: ${state.caches.length ? state.caches.join(', ') : 'empty'}.`
}
