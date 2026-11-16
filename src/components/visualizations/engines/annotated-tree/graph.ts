import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W } from './layout'
import type { GraphEdgeView, GraphNodeView, GraphPanel } from './model'
import type { TreeRecording } from './programs/types'

/**
 * Weighted graphs whose accepted edges form a spanning tree (wave 3A,
 * Minimum Spanning Trees: Optimize Water Distribution). Build: the edge list
 * is the recorded one (the pipes plus each well as an edge to node 0, as
 * the answer builds and sorts it); an edge is accepted when the run paused
 * at its `ans += c` line, in that order; an edge the loop never tried is
 * marked so (the run broke out once every house was joined). Layout: the
 * houses on one row, the source centred over them, so every well is a
 * dashed edge down to its house. One panel is 288 wide (two to a row from
 * 768, as the gain and trie panels).
 */

type Edge = [number, number, number]

const edgeList = (v: unknown): Edge[] => {
  if (!Array.isArray(v) || v.some((e) => !Array.isArray(e) || e.length !== 3)) throw new Error('graph: the edge list was not recorded')
  return v as Edge[]
}

/** The recorded run: every edge (sorted as the answer sorted it), the accepted ones in order, the total printed. */
export function waterRun(rec: TreeRecording): {
  edges: Edge[]
  accepted: Edge[]
  tried: Edge[]
  total: string
} {
  const edges = edgeList(rec.pauses.find((p) => p.probe === 'edges')?.vars.pipes)
  const pick = (probe: string) => rec.pauses.filter((p) => p.probe === probe).map((p) => [p.vars.a, p.vars.b, p.vars.c] as Edge)
  return {
    edges,
    accepted: pick('accept'),
    tried: pick('try'),
    total: rec.stdout[0],
  }
}

const same = (a: Edge, b: Edge) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2]

export function waterPanel(rec: TreeRecording, opts: { id: string; heading: string; withSource: boolean; notes: string[] }): GraphPanel {
  const run = waterRun(rec)
  const houses = [...new Set(run.edges.flatMap(([a, b]) => [a, b]))].filter((v) => v !== 0).sort((x, y) => x - y)
  const wellOf = (h: number) => run.edges.find(([a, b]) => a === 0 && b === h)![2]
  const nodes: GraphNodeView[] = [
    ...(opts.withSource ? [{ id: 'n0', label: 'source 0', source: true }] : []),
    ...houses.map((h) => ({
      id: `n${h}`,
      label: String(h),
      ...(opts.withSource ? {} : { note: `well ${wellOf(h)}` }),
    })),
  ]
  const edges: GraphEdgeView[] = run.edges
    .filter(([a]) => opts.withSource || a !== 0)
    .map((e) => {
      const k = run.accepted.findIndex((x) => same(x, e))
      return {
        a: `n${e[0]}`,
        b: `n${e[1]}`,
        w: e[2],
        ...(e[0] === 0 ? { well: true } : {}),
        ...(opts.withSource && k >= 0 ? { accepted: k + 1 } : {}),
        ...(opts.withSource && !run.tried.some((x) => same(x, e)) ? { untried: true } : {}),
      }
    })
  return {
    kind: 'graph',
    id: opts.id,
    heading: opts.heading,
    nodes,
    edges,
    notes: opts.notes,
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const GRAPH = {
  r: 14,
  source: { h: 24, pad: 8 },
  /** The houses' row: this far under the source's centre. */
  drop: 84,
  top: 8,
  /** Under a house: its note's baseline from the house's centre. */
  noteDy: 30,
  labelGap: 5,
  /** A well's cost: this far off its line's middle, along the normal. */
  wellLabel: 12,
  /** Room over a houses-only row for the pipes' cost labels. */
  pipeLabel: 20,
  notesGap: 10,
} as const

export type GraphGeometry = {
  width: number
  height: number
  at: Record<string, { x: number; y: number; w?: number }>
  edges: {
    a: string
    b: string
    x1: number
    y1: number
    x2: number
    y2: number
    label: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
  }[]
  notesTop: number
}

export const sourceWidth = (label: string) => Math.ceil(monoWidth(label, SIZE.value)) + 2 * GRAPH.source.pad

/** Every graph panel of a figure keeps one drawing height (with or without the source), so side by side they line up. */
export function layoutGraph(p: GraphPanel): GraphGeometry {
  const houses = p.nodes.filter((n) => !n.source)
  const step = W / houses.length
  const src = p.nodes.find((n) => n.source)
  const sy = HEAD + GRAPH.top + GRAPH.source.h / 2
  // Without the source the houses sit right under the heading.
  const hy = src ? sy + GRAPH.drop : HEAD + GRAPH.top + GRAPH.pipeLabel + GRAPH.r
  const at: GraphGeometry['at'] = {}
  houses.forEach((h, k) => (at[h.id] = { x: step / 2 + k * step, y: hy }))
  if (src) at[src.id] = { x: W / 2, y: sy, w: sourceWidth(src.label) }
  const edges: GraphGeometry['edges'] = p.edges.map((e) => {
    const a = at[e.a]
    const b = at[e.b]
    if (e.well) {
      // From the source's bottom edge to the house's rim, the label beside the line's middle, outward.
      const y1 = a.y + GRAPH.source.h / 2
      const dx = b.x - a.x
      const dy = b.y - y1
      const len = Math.hypot(dx, dy)
      const x2 = b.x - (dx / len) * GRAPH.r
      const y2 = b.y - (dy / len) * GRAPH.r
      const mx = (a.x + x2) / 2
      const my = (y1 + y2) / 2
      // Off the line's middle along its normal, on the outer side (a vertical well: to its right).
      const side = Math.abs(dx) < 1 ? 1 : Math.sign(dx)
      const nx = (side * dy) / len
      const ny = -Math.abs(dx) / len
      const anchor = side < 0 ? 'end' : 'start'
      return { a: e.a, b: e.b, x1: a.x, y1, x2, y2, label: { x: mx + nx * GRAPH.wellLabel, y: my + ny * GRAPH.wellLabel + 4, anchor } }
    }
    // A pipe between neighbouring houses: rim to rim, its cost over the middle (the one row holds no other pipe).
    if (Math.abs(houses.findIndex((h) => h.id === e.a) - houses.findIndex((h) => h.id === e.b)) !== 1)
      throw new Error(`graph: pipe ${e.a}-${e.b} does not join neighbours`)
    return {
      a: e.a,
      b: e.b,
      x1: a.x + GRAPH.r,
      y1: a.y,
      x2: b.x - GRAPH.r,
      y2: b.y,
      label: { x: (a.x + b.x) / 2, y: a.y - GRAPH.labelGap, anchor: 'middle' as const },
    }
  })
  const drawn = hy + GRAPH.noteDy + 4
  const notesTop = drawn + GRAPH.notesGap
  return {
    width: W,
    height: notesTop + p.notes.length * SIZE.line,
    at,
    edges,
    notesTop,
  }
}
