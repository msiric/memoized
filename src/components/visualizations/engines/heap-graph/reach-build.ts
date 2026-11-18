import type { HashedProgram } from '../../shell/static-types'
import type { HeapBinding, HeapEdgeId, HeapMark, HeapObject, HeapPanel, HeapValue } from './model'
import type { ReachProgram } from './reach-programs'
import type { GcRecording, GcValue } from './truth/record-gc'

/**
 * Builds a reachability panel from a GC recording (`truth/record-gc.ts`):
 * the roots, every object a root reaches (and the island earlier probes saw),
 * their links, which links are weak, and which objects the collections freed
 * are all the run's. The preset adds the words, the reference-count badges
 * (counted from the drawn strong links, so they cannot disagree with the
 * drawing) and which link to mark as the one that still retains.
 */

export type ReachPanelSpec = {
  program: ReachProgram
  snapshot: string
  id: string
  heading: string
  /** Badge every object with its strong references in the drawing (`rc 1`). */
  badges?: boolean
  /** The retaining link to mark: out of a root (`key` absent) or out of the object a root names (its row `key`). */
  mark?: { root: string; key?: string }
  island?: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const safe = (s: string) => s.replace(/[^\w-]/g, '_')

/** Object titles in discovery order: `Array A`, `Node B`; elements by tag, `<div>`. */
function titleOf(kind: string, k: number): string {
  if (/^[a-z]/.test(kind)) return `<${kind}>`
  return `${kind} ${LETTERS[k] ?? k + 1}`
}

export function buildReachPanel(spec: ReachPanelSpec, recordings: Record<string, GcRecording>): HeapPanel {
  const rec = recordings[spec.program.id]
  if (!rec) throw new Error(`no recording for ${spec.program.id}: run yarn viz:reach`)
  const snap = rec.snapshots[spec.snapshot]
  if (!snap) throw new Error(`${spec.program.id}: no recorded snapshot ${spec.snapshot}: run yarn viz:reach`)
  const order = snap.objects.map((o) => o.id)
  const oid = (n: number) => `o${order.indexOf(n) + 1}`
  const value = (v: GcValue): HeapValue => ('ref' in v ? { ref: oid(v.ref), ...(v.weak ? { weak: true as const } : {}) } : { text: v.text })
  const bindings: HeapBinding[] = snap.roots.map(([name, v]) => ({ id: `v-${safe(name)}`, name, value: value(v) }))
  const dead = new Set(rec.dead)
  const objects: HeapObject[] = snap.objects.map((o, k) => {
    const empty = o.kind === 'body' && !o.rows.length
    const note = o.children ? (o.children.count ? `${o.children.count} ${o.children.tag}` : 'no children') : empty ? 'no children' : o.size !== undefined ? `length ${o.size}` : undefined
    return {
      id: oid(o.id),
      title: [titleOf(o.kind, k)],
      rows: o.rows.map(([key, v]) => ({ key, value: value(v) })),
      ...(dead.has(o.id) ? { gone: true as const } : {}),
      ...(note ? { note } : {}),
    }
  })
  if (spec.badges)
    for (const o of objects) {
      const n =
        bindings.filter((b) => 'ref' in b.value && b.value.ref === o.id).length +
        objects.reduce((s, x) => s + x.rows.filter((r) => 'ref' in r.value && r.value.ref === o.id && !r.value.weak).length, 0)
      o.badge = `rc ${n}`
    }
  let changed: HeapMark | undefined
  if (spec.mark) {
    const b = bindings.find((x) => x.name === spec.mark!.root)
    if (!b || !('ref' in b.value)) throw new Error(`${spec.id}: ${spec.mark.root} is not a drawn reference`)
    let edge: HeapEdgeId = `bind:${b.id}`
    if (spec.mark.key !== undefined) {
      const owner = objects.find((o) => o.id === (b.value as { ref: string }).ref)!
      const row = owner.rows.find((r) => r.key === spec.mark!.key)
      if (!row || !('ref' in row.value)) throw new Error(`${spec.id}: ${owner.title[0]} has no link ${spec.mark.key}`)
      edge = `ref:${owner.id}.${row.key}`
    }
    changed = { edge }
  }
  return { id: spec.id, heading: spec.heading, bindings, objects, roots: 'roots', ...(spec.island ? { island: spec.island } : {}), ...(changed ? { changed } : {}) }
}

/** What survives, by drawn object: the ids a panel greys must be exactly the recording's dead ones. */
export function goneIds(panel: HeapPanel): string[] {
  return panel.objects.filter((o) => o.gone).map((o) => o.id)
}

/** The recorded run as a preset lists it: its runtime and output, never its code. */
export function verifiedReach(p: ReachProgram, rec: GcRecording): HashedProgram {
  return { id: p.id, runtime: rec.env.startsWith('node') ? 'node@24.x' : rec.env, sha256: rec.sha256, observed: rec.stdout }
}
