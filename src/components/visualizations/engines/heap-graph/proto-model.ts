/**
 * The prototype object graph (R4 shared visual 3, `prototype-object-graph`),
 * an extension of the heap graph: the same object boxes, rows and arrows,
 * laid out as a chain. Objects linked by [[Prototype]] stand in one column
 * (the spine), from the instance down to `null`; a constructor function
 * stands beside the object its `.prototype` names. Three edge styles: the
 * [[Prototype]] link (the spine, an internal slot, no dot), a `.prototype`
 * property (a solid arrow from its row's dot) and a `.constructor` property
 * (a dashed arrow from its row's dot). The panel's one mark (H3 R2 Q9, the
 * neutral `changed` role, never lime) is a lookup: the [[Prototype]] links it
 * followed and the row that answered it.
 *
 * Every object, row, link and lookup is recorded from a real Node run
 * (`proto-programs.ts`, `proto-build.ts`); a preset chooses only which
 * recorded rows to draw and the words around them.
 */

/** A row's value: a primitive as Node prints it, a function (ƒ), or an arrow to a drawn object. */
export type ProtoValue = { text: string } | { fn: true } | { ref: string }

export type ProtoRow = { key: string; value: ProtoValue }

export type ProtoObject = {
  id: string
  /** The expression that reaches it (`Person.prototype`): its header. */
  title: string
  /** A function: drawn as a named pill with a `prototype` arrow, beside its prototype object. */
  fn: boolean
  rows: ProtoRow[]
  /** Own properties recorded but not drawn (`+11 more`); a box with no rows says how many it has. */
  hidden: number
  /** The recorded [[Prototype]]: a drawn object, null, or not drawn (a function's). */
  proto: string | null | undefined
}

export type ProtoLookupMark = {
  /** The receiver and the key (`alice`, `toString`). */
  from: string
  key: string
  /** The objects the lookup visited, receiver first; the last owns the key (or none did). */
  visited: string[]
  found: string | null
}

/** A line of the program's own output under the panel: `alice.toString()  › [object Object]`. */
export type ProtoResult = { expr: string; text: string }

export type ProtoPanel = {
  id: string
  heading: string
  objects: ProtoObject[]
  lookup?: ProtoLookupMark
  results: ProtoResult[]
  /** A short line under the results (words, not code). */
  note?: string
}

export type ProtoDiagram = { panels: ProtoPanel[] }

/** The spine: from the first object down its [[Prototype]] links (functions stand beside it). */
export function spineOf(p: ProtoPanel): ProtoObject[] {
  const byId = new Map(p.objects.map((o) => [o.id, o]))
  const out: ProtoObject[] = []
  let at: ProtoObject | undefined = p.objects.find((o) => !o.fn)
  while (at) {
    if (out.includes(at)) throw new Error(`${p.id}: a [[Prototype]] cycle at ${at.id}`)
    out.push(at)
    at = typeof at.proto === 'string' ? byId.get(at.proto) : undefined
  }
  const left = p.objects.filter((o) => !o.fn && !out.includes(o))
  if (left.length) throw new Error(`${p.id}: ${left.map((o) => o.id).join(', ')} not on the spine`)
  return out
}

/** The object a function's `prototype` row names (the function stands beside it). */
export function besideOf(p: ProtoPanel, fn: ProtoObject): string {
  const row = fn.rows.find((r) => r.key === 'prototype')
  if (!row || !('ref' in row.value)) throw new Error(`${p.id}: function ${fn.id} draws no prototype row`)
  return row.value.ref
}

export const isRefValue = (v: ProtoValue): v is { ref: string } => 'ref' in v
