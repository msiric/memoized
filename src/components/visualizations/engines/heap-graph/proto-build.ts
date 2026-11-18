import type { TreeRecording } from '../annotated-tree/programs/types'
import type { ProtoLookupMark, ProtoObject, ProtoPanel, ProtoResult, ProtoValue } from './proto-model'
import type { ProtoProgram } from './proto-programs'

/**
 * Builds prototype panels from a recording (`proto-programs.ts`): every
 * object, row value, [[Prototype]] link and lookup path drawn is the one the
 * run recorded. The preset chooses which recorded rows to draw per object
 * (`show`: keys, or `'all'`), which lookup to mark, which printed lines to
 * set under the panel, and the words.
 */

export type RecordedValue = { text: string } | { ref: string } | { other: string }
export type RecordedObject = {
  label: string
  fn: boolean
  keys: [key: string, value: RecordedValue, enumerable: boolean][]
  proto: { ref: string } | { other: string } | null
}
export type RecordedLookup = { from: string; key: string; visited: [label: string, own: boolean][]; value: RecordedValue }
export type RecordedGraph = { objects: RecordedObject[]; lookups: RecordedLookup[] }

export type ProtoPanelSpec = {
  program: ProtoProgram
  id: string
  heading: string
  /** Per object label: the recorded keys to draw, in recorded order (`'all'`: every own key). */
  show: Record<string, readonly string[] | 'all'>
  /** Objects whose hidden keys are counted in a muted row (`+11 more`). */
  count?: readonly string[]
  lookup?: readonly [from: string, key: string]
  /** Under the panel: an expression, and the line of the program's output it printed (0-based). */
  results?: readonly (readonly [expr: string, stdoutLine: number])[]
  note?: string
  /** Draw the functions' own [[Prototype]] links too: the two-column layout (Objects and Classes). */
  chains?: true
  /** A `super` lookup: the home object it starts after (its [[Prototype]] link is marked). */
  start?: string
}

/** The one pause a prototype program records: its graph. */
export function recordedGraph(rec: TreeRecording, id: string): RecordedGraph {
  const pause = rec.pauses.find((p) => p.probe === 'graph')
  if (!pause) throw new Error(`${id}: no recorded graph: run yarn viz:prototypes`)
  return pause.vars.graph as RecordedGraph
}

function value(v: RecordedValue, where: string): ProtoValue {
  if ('ref' in v) return { ref: v.ref }
  if ('text' in v) return { text: v.text }
  if (v.other.startsWith('function')) return { fn: true }
  throw new Error(`${where}: ${v.other} is not drawn (add it to the program's targets)`)
}

export function buildProtoPanel(spec: ProtoPanelSpec, recordings: Record<string, TreeRecording>): ProtoPanel {
  const rec = recordings[spec.program.id]
  if (!rec) throw new Error(`no recording for ${spec.program.id}: run yarn viz:prototypes`)
  const graph = recordedGraph(rec, spec.program.id)
  const drawn = new Set(Object.keys(spec.show))
  const objects: ProtoObject[] = graph.objects
    .filter((o) => drawn.has(o.label))
    .map((o) => {
      const show = spec.show[o.label]
      const keys = show === 'all' ? o.keys : o.keys.filter(([k]) => show.includes(k))
      if (show !== 'all') for (const k of show) if (!o.keys.some(([key]) => key === k)) throw new Error(`${spec.id}: ${o.label} has no own ${k}`)
      const rows = keys.map(([key, v]) => ({ key, value: value(v, `${spec.id}: ${o.label}.${key}`) }))
      for (const r of rows) if ('ref' in r.value && !drawn.has(r.value.ref)) throw new Error(`${spec.id}: ${o.label}.${r.key} points at ${r.value.ref}, which is not drawn`)
      const proto = o.proto === null ? null : 'ref' in o.proto && drawn.has(o.proto.ref) ? o.proto.ref : undefined
      if ((!o.fn || spec.chains) && proto === undefined) throw new Error(`${spec.id}: the [[Prototype]] of ${o.label} is not drawn`)
      return {
        id: o.label,
        title: o.label,
        fn: o.fn,
        rows,
        hidden: spec.count?.includes(o.label) ? o.keys.length - rows.length : 0,
        proto: o.fn && !spec.chains ? undefined : proto,
      }
    })
  let lookup: ProtoLookupMark | undefined
  if (spec.lookup) {
    const [from, key] = spec.lookup
    const l = graph.lookups.find((x) => x.from === from && x.key === key)
    if (!l) throw new Error(`${spec.id}: no recorded lookup of ${from}.${key}`)
    const last = l.visited[l.visited.length - 1]
    lookup = { from, key, visited: l.visited.map(([label]) => label), found: last?.[1] ? last[0] : null, ...(spec.start ? { start: spec.start } : {}) }
    if (spec.start && objects.find((o) => o.id === spec.start)?.proto !== from) throw new Error(`${spec.id}: ${from} is not the [[Prototype]] of ${spec.start}`)
    if (lookup.found && !objects.find((o) => o.id === lookup!.found)?.rows.some((r) => r.key === key))
      throw new Error(`${spec.id}: ${key} is found on ${lookup.found}, whose row is not drawn`)
  }
  const results: ProtoResult[] = (spec.results ?? []).map(([expr, line]) => {
    const text = rec.stdout[line]
    if (text === undefined) throw new Error(`${spec.id}: the program printed no line ${line}`)
    return { expr, text }
  })
  return { id: spec.id, heading: spec.heading, objects, lookup, results, note: spec.note, ...(spec.chains ? { columns: 2 as const } : {}) }
}
