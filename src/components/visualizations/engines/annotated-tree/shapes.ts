import type { MapRecording, RecordedMap } from './truth/record-maps'

/**
 * Hidden-class transition trees (engine-and-runtime, the annotated tree's
 * `shapes` panel kind): one node per V8 map, joined to the map it was
 * reached from (its back pointer), labelled with the object's own keys in
 * order; each object stands under the map it has at the end of the program.
 * A node V8 printed only as another map's back pointer is `inferred`: its
 * keys are its child's minus the last, and a root shared by such nodes is
 * drawn as the empty object they start from (dashed, said in words).
 */

export type ShapeNode = {
  id: string
  parent: string | null
  keys: string[]
  /** The objects on this map at the end of the run. */
  objects: string[]
  inferred?: boolean
}

export type ShapeResult = { expr: string; value: string }

export type ShapesPanel = {
  kind: 'shapes'
  id: string
  heading: string
  /** Root first, then each node after its parent, children in the order they appeared. */
  nodes: ShapeNode[]
  results: ShapeResult[]
  /** Short lines under the results (words). */
  notes: string[]
}

export const shapeLabel = (keys: string[]) => (keys.length ? `{${keys.join(', ')}}` : '{}')

/**
 * The tree a recording proves: every map printed at a pause, joined by its
 * back pointer; the end pause puts the objects on their leaves. Values
 * written into existing fields add no node (`obj1.c = 3` keeps its map).
 */
export function shapesPanel(
  rec: MapRecording,
  spec: { id: string; heading: string; objects: readonly string[]; results: readonly (readonly [expr: string, watch: string])[]; notes?: string[] },
): ShapesPanel {
  const seen = new Map<string, ShapeNode>()
  const order: string[] = []
  const add = (m: RecordedMap) => {
    if (!seen.has(m.map)) {
      seen.set(m.map, { id: m.map, parent: m.parent, keys: m.keys, objects: [] })
      order.push(m.map)
    }
    const n = seen.get(m.map)!
    if (n.parent !== m.parent || n.keys.join() !== m.keys.join()) throw new Error(`${spec.id}: map ${m.map} recorded twice with different keys or parents`)
  }
  for (const p of rec.pauses) for (const m of Object.values(p.maps)) add(m)
  const end = rec.pauses.filter((p) => p.probe === 'end').at(-1)
  if (!end) throw new Error(`${spec.id}: no end pause`)
  for (const o of spec.objects) {
    const m = end.maps[o]
    if (!m) throw new Error(`${spec.id}: no map recorded for ${o}`)
    seen.get(m.map)!.objects.push(o)
  }
  // Parents printed only as back pointers: inferred from the child, one key fewer.
  for (const id of [...order]) {
    const n = seen.get(id)!
    if (n.parent && !seen.has(n.parent)) {
      seen.set(n.parent, { id: n.parent, parent: 'root', keys: n.keys.slice(0, -1), objects: [], inferred: true })
      order.push(n.parent)
    }
  }
  if ([...seen.values()].some((n) => n.parent === 'root')) {
    if ([...seen.values()].some((n) => n.inferred && n.keys.length !== 1)) throw new Error(`${spec.id}: an inferred map more than one key from the root`)
    seen.set('root', { id: 'root', parent: null, keys: [], objects: [], inferred: true })
    order.unshift('root')
  }
  // Root first, each node after its parent (depth first, in recorded order).
  const nodes: ShapeNode[] = []
  const visit = (id: string) => {
    nodes.push(seen.get(id)!)
    for (const c of order) if (seen.get(c)!.parent === id) visit(c)
  }
  const roots = order.filter((id) => seen.get(id)!.parent === null)
  if (roots.length !== 1) throw new Error(`${spec.id}: ${roots.length} roots`)
  visit(roots[0])
  if (nodes.length !== seen.size) throw new Error(`${spec.id}: a map is not under the root`)
  const results = spec.results.map(([expr, w]) => {
    if (!(w in end.vars)) throw new Error(`${spec.id}: no recorded ${w}`)
    return { expr, value: String(end.vars[w]) }
  })
  return { kind: 'shapes', id: spec.id, heading: spec.heading, nodes, results, notes: spec.notes ?? [] }
}
