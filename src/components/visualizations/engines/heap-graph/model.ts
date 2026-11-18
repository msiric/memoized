import type { VerifiedProgram } from '../../shell/static-types'

/**
 * Heap graphs (R4 shared visual 4, identity mode): bindings on the left,
 * heap objects on the right, an arrow meaning "this value identifies that
 * object". A diagram is pure data with no coordinates: `layout.ts` derives
 * columns, rows and routes, and every panel is built from a recording of a
 * real Node run (`recording.ts`, `build.ts`), so the picture cannot disagree
 * with the run.
 */

/** A label with fallbacks, longest first. */
export type Label = readonly [string, ...string[]]

export type HeapValue =
  /** A primitive, as Node prints it (`2`, `'Alice'`, `true`). */
  | { text: string }
  /**
   * A value that identifies an object: a dot with an arrow to that object.
   * `weak`: a reference the collector does not follow (a WeakMap key), drawn
   * dashed (the reachability presets).
   */
  | { ref: string; weak?: true }

/** A name in scope at the snapshot: drawn as its own box in the left column. */
export type HeapBinding = { id: string; name: string; value: HeapValue }

export type HeapRow = { key: string; value: HeapValue }

/** An object on the heap: a header naming it (`Object A`) and its own properties. */
export type HeapObject = {
  id: string
  title: Label
  rows: HeapRow[]
  /** Reachability presets: collected by the first GC after this snapshot (recorded): drawn greyed and dashed. */
  gone?: true
  /** A short tag in the header's right end (`rc 1`: the strong references into it). */
  badge?: string
  /** A muted line under the rows (`100 li`, a collapsed subtree): words, not a property. */
  note?: string
}

/**
 * The panel's one rest emphasis, "changed" (H3 R2 Q9: the neutral changed
 * role, never lime): the row a mutation wrote, or the arrow a rebinding moved.
 */
export type HeapMark =
  | { row: { object: string; key: string } }
  | { binding: string }
  /** Reachability presets: the arrow that still retains the island (`ref:<object>.<key>` or `bind:<binding>`). */
  | { edge: HeapEdgeId }

/** A line of the program's own output, drawn under the panel: `original === alias › true`. */
export type HeapResult = { expr: string; text: string }

/** Edge ids: `bind:<binding id>` (a name to its object) and `ref:<object id>.<key>` (a property to its object). */
export type HeapEdgeId = `bind:${string}` | `ref:${string}.${string}`

export type HeapPanel = {
  id: string
  /** One line of the program naming the case, shown above the panel (whitespace runs collapsed). */
  heading: string
  /** The part of the heading set in full ink. */
  emphasis?: string
  bindings: HeapBinding[]
  objects: HeapObject[]
  changed?: HeapMark
  /** The line of code that made the change the mark shows (for the text alternative). */
  changedBy?: string
  results?: HeapResult[]
  /** Reachability presets: the names column is labelled as the GC roots. */
  roots?: string
  /** Reachability presets: the label under the greyed objects (`collectible`). */
  island?: string
}

export type HeapDiagram = {
  panels: HeapPanel[]
  /** The text alternative's note on what is modelled, when it differs from the identity figures'. */
  model?: string
}

// ---------------------------------------------------------------------------
// What a preset declares, and what a real run records.
// ---------------------------------------------------------------------------

/**
 * A point in a program where the heap is recorded: after the (unique) line
 * whose trimmed text is `after`, or at the end. `bindings` are the names in
 * scope there that the panel draws, in order; `results` are expressions
 * evaluated there (each one a `console.log` of the program, so the drawn
 * value is the program's own output).
 */
export type HeapSnapshotSpec = {
  id: string
  after: string | 'end'
  bindings: string[]
  results?: string[]
}

export type HeapProgram = VerifiedProgram & { snapshots: HeapSnapshotSpec[] }

/** A recorded value: a primitive printed by `util.inspect`, or an object by its discovery index. */
export type RecordedValue = { text: string } | { ref: number }

export type RecordedSnapshot = {
  bindings: [name: string, value: RecordedValue][]
  /** Objects in discovery order (bindings first, then breadth first), own enumerable properties in key order. */
  objects: { id: number; array: boolean; rows: [key: string, value: RecordedValue][] }[]
  results: [expr: string, text: string][]
}

export type HeapRecording = {
  /** The program's sha256 when it was recorded. */
  sha256: string
  /** What the instrumented run printed: the same as the program's own output. */
  observed: string[]
  snapshots: Record<string, RecordedSnapshot>
}

export const isRef = (v: HeapValue): v is { ref: string } => 'ref' in v

export function objectById(panel: HeapPanel, id: string): HeapObject {
  const o = panel.objects.find((x) => x.id === id)
  if (!o) throw new Error(`${panel.id}: unknown object "${id}"`)
  return o
}

/** The object a binding identifies, or null for a primitive. */
export function targetOf(panel: HeapPanel, bindingId: string): string | null {
  const b = panel.bindings.find((x) => x.id === bindingId)
  if (!b) throw new Error(`${panel.id}: unknown binding "${bindingId}"`)
  return isRef(b.value) ? b.value.ref : null
}

/** Every object reachable from a binding, in visiting order (its traced path). */
export function reachable(panel: HeapPanel, bindingId: string): string[] {
  const out: string[] = []
  const visit = (id: string) => {
    if (out.includes(id)) return
    out.push(id)
    for (const r of objectById(panel, id).rows) if (isRef(r.value)) visit(r.value.ref)
  }
  const t = targetOf(panel, bindingId)
  if (t) visit(t)
  return out
}

/** Resolves a path such as `copy.stats.count`: the object holding the last key, and the key. */
export function resolvePath(panel: HeapPanel, path: string): { object: string; key: string } {
  const [name, ...keys] = path.split('.')
  const b = panel.bindings.find((x) => x.name === name)
  if (!b || !isRef(b.value) || !keys.length) throw new Error(`${panel.id}: cannot resolve ${path}`)
  let at = b.value.ref
  for (let i = 0; i < keys.length - 1; i++) {
    const row = objectById(panel, at).rows.find((r) => r.key === keys[i])
    if (!row || !isRef(row.value)) throw new Error(`${panel.id}: ${path} leaves the heap at ${keys[i]}`)
    at = row.value.ref
  }
  const key = keys[keys.length - 1]
  if (!objectById(panel, at).rows.some((r) => r.key === key)) throw new Error(`${panel.id}: ${path} has no ${key}`)
  return { object: at, key }
}
