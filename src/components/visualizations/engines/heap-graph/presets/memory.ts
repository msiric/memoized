import type { HashedProgram, StaticPreset } from '../../../shell/static-types'
import type { HeapDiagram, HeapPanel } from '../model'
import { buildReachPanel, verifiedReach, type ReachPanelSpec } from '../reach-build'
import { closureShared, cycleCleared, cycleHeld, domCache, domWeakHeld, weakKeyDropped } from '../reach-programs'
import leaksRecording from '../recordings/reach-memory-leaks.json'
import managementRecording from '../recordings/reach-memory-management.json'
import type { GcRecording } from '../truth/record-gc'

/**
 * The reachability presets of the heap graph (R4 rows
 * js-track/core-fundamentals/memory-management, `gc-reachability-cycle-and-weak-edge`,
 * and js-track/advanced-concepts/memory-leaks, `retainer-paths`): the names
 * column is the root set, a weak link is dashed, and what the first full GC
 * after the snapshot freed is greyed and dashed. Built from the committed GC
 * recordings (`yarn viz:reach`); the truth test rebuilds them from fresh runs.
 */

export const MM_RECORDINGS = managementRecording as unknown as Record<string, GcRecording>
export const ML_RECORDINGS = leaksRecording as unknown as Record<string, GcRecording>

export const managementPanels: ReachPanelSpec[] = [
  { program: cycleHeld, snapshot: 'held', id: 'held', heading: 'after link(): registry keeps node2', mark: { root: 'registry', key: '0' } },
  {
    program: cycleCleared,
    snapshot: 'cleared',
    id: 'cleared',
    heading: 'registry.length = 0',
    badges: true,
    island: 'collectible',
  },
  { program: weakKeyDropped, snapshot: 'after', id: 'weak', heading: 'user and data out of scope', island: 'collectible' },
]

export const leaksPanels: ReachPanelSpec[] = [
  { program: domCache, snapshot: 'removed', id: 'cache', heading: 'removed from the page, kept by cache', mark: { root: 'cache', key: "'panel'" } },
  { program: domWeakHeld, snapshot: 'removed', id: 'weak-held', heading: 'WeakMap cache, key still in keys', mark: { root: 'keys', key: "'panel'" } },
]

/**
 * The shared closure context. V8's contexts are not visible to JavaScript, so
 * the handler, the timer callback and their one context are drawn from the
 * answer's code (the scope analysis it describes); the values (huge's length,
 * config) and what survived the collections are the run's.
 */
export function closurePanel(rec: GcRecording): HeapPanel {
  const snap = rec.snapshots.scope
  const [huge, config] = snap.roots.map(([, v]) => ('ref' in v ? snap.objects.find((o) => o.id === v.ref)! : undefined))
  if (!huge || !config || huge.size === undefined) throw new Error('closure-shared: huge and config were not recorded')
  const dead = new Set(rec.dead)
  return {
    id: 'context',
    heading: 'one context, shared by both closures',
    roots: 'roots',
    island: 'ran: collectible',
    bindings: [{ id: 'v-node', name: 'node', value: { ref: 'button' } }],
    objects: [
      { id: 'button', title: ['<button>'], rows: [{ key: 'click', value: { ref: 'handler' } }] },
      { id: 'handler', title: ['ƒ click handler'], rows: [{ key: 'context', value: { ref: 'ctx' } }] },
      { id: 'ctx', title: ['Context'], rows: [{ key: 'huge', value: { ref: 'huge' } }, { key: 'config', value: { ref: 'config' } }] },
      { id: 'huge', title: ['Array'], rows: [], note: `length ${huge.size}`, ...(dead.has(huge.id) ? { gone: true as const } : {}) },
      { id: 'config', title: ['Object'], rows: config.rows.map(([key, v]) => ({ key, value: 'text' in v ? { text: v.text } : { text: '?' } })), ...(dead.has(config.id) ? { gone: true as const } : {}) },
      // Named, not drawn: a fourth arrow into Context would have to cross the two leaving it.
      { id: 'timer', title: ['ƒ timer handler'], rows: [{ key: 'context', value: { text: 'Context' } }], gone: true },
    ],
    changed: { edge: 'ref:handler.context' },
  }
}

const managementData: HeapDiagram = {
  panels: managementPanels.map((s) => buildReachPanel(s, MM_RECORDINGS)),
  model:
    'Array A, Node B and so on label objects in each run; they are not memory addresses. Every root, object, link and value is recorded from a real Node 24 run of the lesson code, and the greyed objects are exactly those a full garbage collection (--expose-gc) freed after that point.',
}

const leaksData: HeapDiagram = {
  panels: [...leaksPanels.map((s) => buildReachPanel(s, ML_RECORDINGS)), closurePanel(ML_RECORDINGS['closure-shared'])],
  model:
    'The first two panels are recorded from the practice answers run in Chromium: roots, objects, links, and the greyed objects a full garbage collection freed (with keys.delete as written, the key and the panel are freed too). The last panel draws V8’s shared closure context, which JavaScript cannot inspect; huge’s length and its survival are recorded, and without the timer line the same run frees it.',
}

export const gcReachabilityCycleAndWeakEdge: StaticPreset<HeapDiagram, HashedProgram> = {
  id: 'gc-reachability-cycle-and-weak-edge',
  label: 'GC reachability',
  title: 'Reachable from a root, or freed',
  caption: 'Tracing GC keeps what a root reaches: a dropped cycle goes, though each node still has one reference, and a WeakMap value goes with its key.',
  programs: [cycleHeld, cycleCleared, weakKeyDropped].map((p) => verifiedReach(p, MM_RECORDINGS[p.id])),
  claims: [],
  data: managementData,
}

export const retainerPaths: StaticPreset<HeapDiagram, HashedProgram> = {
  id: 'retainer-paths',
  label: 'Retainer paths',
  title: 'What still keeps it alive',
  caption: 'An object leaks while any root path reaches it: a cache entry, a WeakMap key another Map still holds, or a context a live closure shares.',
  programs: [domCache, domWeakHeld, closureShared].map((p) => verifiedReach(p, ML_RECORDINGS[p.id])),
  claims: [],
  data: leaksData,
}
