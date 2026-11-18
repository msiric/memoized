/**
 * The service-worker lifecycle visual's programs (R4 `update-and-reload`,
 * `skipWaiting`, `first-install-claim`): the visual's own minimal worker and
 * page, never lesson or answer text, and the scripts the recorder plays in
 * real Chromium (`../truth/record.ts`, `yarn viz:sw`). The lesson's facts
 * (a waiting worker, a reload that does not hand over, skipWaiting moving
 * open tabs, clients.claim) are what the recording shows; the content is
 * not read.
 *
 * The worker can hold its `install` and `activate` events on a gate the
 * recorder opens on the server (the worker polls `/gate/<event>/<version>`;
 * a message would not do: Chromium holds message events for an activating
 * worker), so the installing and activating states are recorded while
 * they last instead of raced. Gates change no lifecycle rule: an event's
 * `waitUntil` promise simply settles later.
 *
 * React-free and Node-free: presets, the recorder and the truth test share it.
 */

export type TabId = 'A' | 'B'
export type Version = 'v1' | 'v2'

/** What a deployed worker script does (its bytes differ per version, so a deploy is an update). */
export type WorkerOptions = {
  /** Calls `self.skipWaiting()` in `install`. */
  skip?: boolean
  /** Calls `self.clients.claim()` at the end of `activate`. */
  claim?: boolean
  /** Holds `install` until the recorder releases it. */
  holdInstall?: boolean
  /** Holds `activate` until the recorder releases it. */
  holdActivate?: boolean
}

/** How often a held worker asks the recorder's server whether its gate is open (a recorder setting, not UI motion). */
const GATE_POLL_MS = 50

export const cacheName = (v: Version) => `${v}-static`

/** The worker script for one version: precache one asset into `<v>-static`, delete every other cache on activate, answer /app.js with its own version (so a response names the worker that handled it). */
export function workerSource(v: Version, o: WorkerOptions = {}): string {
  return [
    `const VERSION = '${v}'`,
    `const gate = (name, hold) => new Promise((open) => {`,
    `  if (!hold) return open()`,
    `  const poll = () => fetch('/gate/' + name + '/' + VERSION).then((r) => r.text()).then((t) => (t === 'open' ? open() : setTimeout(poll, ${GATE_POLL_MS})))`,
    `  poll()`,
    `})`,
    `self.addEventListener('install', (e) => {`,
    o.skip ? `  self.skipWaiting()` : null,
    `  e.waitUntil(gate('install', ${!!o.holdInstall}).then(() => caches.open('${cacheName(v)}')).then((c) => c.put('/app.js', new Response(VERSION))))`,
    `})`,
    `self.addEventListener('activate', (e) => {`,
    `  e.waitUntil(gate('activate', ${!!o.holdActivate}).then(() => caches.keys()).then((ks) => Promise.all(ks.filter((k) => k !== '${cacheName(v)}').map((k) => caches.delete(k))))${o.claim ? '.then(() => self.clients.claim())' : ''})`,
    `})`,
    `self.addEventListener('fetch', (e) => {`,
    `  if (new URL(e.request.url).pathname === '/app.js') e.respondWith(new Response(VERSION))`,
    `})`,
  ]
    .filter((l) => l !== null)
    .join('\n')
}

/**
 * The page every tab loads: registers /worker.js and counts `controllerchange`;
 * the recorder reads it through `window.__sw`. It never messages a worker
 * to ask who it is (a busy active worker delays a skipWaiting activation in
 * Chromium): the controller is named by which registration slot holds the
 * same object, and the slot's version comes from DevTools.
 */
export const PAGE = `<!doctype html><html><head><title>sw</title></head><body><script>
window.__changes = 0
navigator.serviceWorker.addEventListener('controllerchange', () => window.__changes++)
navigator.serviceWorker.register('/worker.js')
window.__sw = {
  async read() {
    const r = await navigator.serviceWorker.getRegistration()
    const c = navigator.serviceWorker.controller
    const which = (w) => (!w ? null : !r ? 'other' : w === r.active ? 'active' : w === r.waiting ? 'waiting' : w === r.installing ? 'installing' : 'other')
    const state = (w) => (w ? w.state : null)
    return {
      controller: which(c),
      changes: window.__changes,
      slots: { installing: state(r && r.installing), waiting: state(r && r.waiting), active: state(r && r.active) },
      caches: (await caches.keys()).sort(),
      fetched: window.__fetched === undefined ? null : window.__fetched,
    }
  },
  update: () => navigator.serviceWorker.getRegistration().then((r) => r.update()).catch(() => null),
  fetch() { window.__fetched = 'pending'; fetch('/app.js').then((r) => r.text()).then((t) => (window.__fetched = t)) },
}
</script></body></html>`

/** One thing the recorder does. `snap` names the step whose state it records after the page settles. */
export type SwAction =
  | { do: 'deploy'; v: Version; opts?: WorkerOptions }
  | { do: 'open' | 'reload' | 'close'; tab: TabId }
  | { do: 'update'; tab: TabId }
  | { do: 'release'; gate: 'install' | 'activate'; v: Version }
  | { do: 'fetch'; tab: TabId }
  | { do: 'snap'; as: string }

export type SwScenario = { id: string; actions: readonly SwAction[] }

/** v1 installed and controlling both tabs: the first load registers, a reload is controlled, then B opens. */
const V1_CONTROLS_AB: SwAction[] = [
  { do: 'deploy', v: 'v1' },
  { do: 'open', tab: 'A' },
  { do: 'reload', tab: 'A' },
  { do: 'open', tab: 'B' },
  { do: 'snap', as: 'start' },
]

export const SW_SCENARIOS: readonly SwScenario[] = [
  {
    // The default update: v2 installs while v1 controls A and B, waits through a reload, and activates once no tab uses v1.
    id: 'update-and-reload',
    actions: [
      ...V1_CONTROLS_AB,
      { do: 'deploy', v: 'v2', opts: { holdInstall: true } },
      { do: 'reload', tab: 'B' },
      { do: 'snap', as: 'installing' },
      { do: 'release', gate: 'install', v: 'v2' },
      { do: 'snap', as: 'waiting' },
      { do: 'reload', tab: 'A' },
      { do: 'snap', as: 'reload-a' },
      { do: 'close', tab: 'A' },
      { do: 'snap', as: 'close-a' },
      { do: 'reload', tab: 'B' },
      { do: 'snap', as: 'reload-b' },
      { do: 'close', tab: 'B' },
      { do: 'snap', as: 'close-b' },
      { do: 'open', tab: 'A' },
      { do: 'snap', as: 'reopen-a' },
    ],
  },
  {
    // v2 calls skipWaiting: it activates over v1 with both tabs open.
    id: 'skip-waiting',
    actions: [
      ...V1_CONTROLS_AB,
      { do: 'deploy', v: 'v2', opts: { skip: true, holdInstall: true, holdActivate: true } },
      { do: 'update', tab: 'A' },
      { do: 'snap', as: 'installing' },
      { do: 'release', gate: 'install', v: 'v2' },
      { do: 'snap', as: 'activating' },
      { do: 'release', gate: 'activate', v: 'v2' },
      { do: 'snap', as: 'activated' },
    ],
  },
  {
    // A probe, not drawn: a fetch from a controlled tab while v2 is still activating. Which worker answers, and when?
    id: 'activating-fetch',
    actions: [
      ...V1_CONTROLS_AB,
      { do: 'deploy', v: 'v2', opts: { skip: true, holdInstall: true, holdActivate: true } },
      { do: 'update', tab: 'A' },
      { do: 'release', gate: 'install', v: 'v2' },
      { do: 'snap', as: 'activating' },
      { do: 'fetch', tab: 'A' },
      { do: 'snap', as: 'fetch' },
      { do: 'release', gate: 'activate', v: 'v2' },
      { do: 'snap', as: 'activated' },
    ],
  },
  {
    // The same with clients.claim as well: a contrast the truth test checks (claim adds nothing for tabs v1 already controlled).
    id: 'skip-waiting-claim',
    actions: [
      ...V1_CONTROLS_AB,
      { do: 'deploy', v: 'v2', opts: { skip: true, claim: true, holdInstall: true, holdActivate: true } },
      { do: 'update', tab: 'A' },
      { do: 'snap', as: 'installing' },
      { do: 'release', gate: 'install', v: 'v2' },
      { do: 'snap', as: 'activating' },
      { do: 'release', gate: 'activate', v: 'v2' },
      { do: 'snap', as: 'activated' },
    ],
  },
  {
    // A first visit with clients.claim: the page that registered is uncontrolled until activate claims it.
    id: 'first-install-claim',
    actions: [
      { do: 'deploy', v: 'v1', opts: { claim: true, holdInstall: true, holdActivate: true } },
      { do: 'open', tab: 'A' },
      { do: 'snap', as: 'installing' },
      { do: 'release', gate: 'install', v: 'v1' },
      { do: 'snap', as: 'activating' },
      { do: 'release', gate: 'activate', v: 'v1' },
      { do: 'snap', as: 'claimed' },
    ],
  },
  {
    // The same first visit without clients.claim: uncontrolled after activation, controlled after a reload.
    id: 'first-install',
    actions: [
      { do: 'deploy', v: 'v1', opts: { holdInstall: true, holdActivate: true } },
      { do: 'open', tab: 'A' },
      { do: 'snap', as: 'installing' },
      { do: 'release', gate: 'install', v: 'v1' },
      { do: 'snap', as: 'activating' },
      { do: 'release', gate: 'activate', v: 'v1' },
      { do: 'snap', as: 'activated' },
      { do: 'reload', tab: 'A' },
      { do: 'snap', as: 'reload-a' },
    ],
  },
]

/** A worker in a registration slot: its version and the state the browser reports. */
export type SlotRec = { v: Version; state: 'installing' | 'installed' | 'activating' | 'activated' } | null

/** What one step recorded: the registration (from DevTools, so it is read with no tab open too), each tab, the caches. */
export type SwSnap = {
  slots: { installing: SlotRec; waiting: SlotRec; active: SlotRec }
  /** Versions the browser marked redundant so far. */
  redundant: Version[]
  tabs: Record<TabId, { open: boolean; controller: Version | null; changes: number; fetched: string | null }>
  caches: string[]
}

export type SwRecording = {
  generator: string
  /** sha256 of the scenarios and every worker source they deploy. */
  sha256: string
  browser: string
  scenarios: Record<string, { as: string; snap: SwSnap }[]>
}
