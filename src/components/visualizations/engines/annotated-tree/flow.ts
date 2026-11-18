import { ARROW_HEAD, type Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W, W_WIDE } from './layout'
import type { TreePause, TreeRecording } from './programs/types'

/**
 * Residual graphs (wave 4B, Maximum Flow and Network Flow Algorithms): a
 * flow network whose edges carry flow / capacity, with each edge's reverse
 * residual arrow (dashed, worth the edge's flow) where the panel shows
 * them, one augmenting path marked, or the minimum cut: the vertices the
 * source still reaches through positive residual capacity, shaded, and the
 * edges that leave that set marked.
 *
 * Build: every value comes from the recorded residual lists
 * (`this.graph[u]` entries [v, residual, pair]). An entry added with a
 * positive capacity is an edge (its capacity is its residual at the start);
 * its pair, added with 0, is its reverse. An edge's flow is its capacity
 * less its residual; its reverse residual is the pair's residual. A path
 * is the recorded `parent` and `parentEdge` walked from the sink, so a hop
 * through a reverse entry is known by the entry, never guessed from the
 * vertices.
 */

export type Entry = [v: number, residual: number, pair: number]
export type Residual = Entry[][]

export type ResidualNodeView = {
  id: string
  label: string
  at: readonly [number, number]
}
export type ResidualEdgeView = {
  from: string
  to: string
  cap: number
  flow: number
  /** On the marked path (forward), or a cut edge. */
  mark?: 'path' | 'cut'
  /** The reverse residual (= flow), drawn dashed where positive and the panel shows reverses; `path`: the marked path runs back along it. */
  back?: { residual: number; mark?: 'path' }
}

export type ResidualPanel = {
  kind: 'residual'
  id: string
  heading: string
  nodes: ResidualNodeView[]
  edges: ResidualEdgeView[]
  /** Draw each edge's reverse residual (dashed) where it is positive. */
  reverse: boolean
  /** The minimum cut's source side: shaded. */
  cut?: string[]
  /** A narrow (288) and a wide (606) drawing; else one 288 drawing, two panels to a row from 768. */
  wide?: boolean
  legend: string[]
  notes: string[]
}

// ---------------------------------------------------------------------------
// The recorded run
// ---------------------------------------------------------------------------

const graphOf = (p: TreePause | undefined, what: string): Residual => {
  const g = p?.vars.graph
  if (!Array.isArray(g))
    throw new Error(`residual: ${what} graph was not recorded`)
  return g as Residual
}

export type Hop = {
  u: number
  v: number
  /** The forward edge this hop uses or runs back along, as [from, index in from's list]. */ edge: [
    number,
    number,
  ]
  reverse: boolean
}

export type FlowRun = {
  start: Residual
  augments: { graph: Residual; hops: Hop[]; pathFlow: number }[]
  final: Residual
  maxFlow: number
  stdout: string[]
}

/** Edges: the entries added with a positive capacity, as [from, index]. */
export function forwardEntries(start: Residual): [number, number][] {
  return start.flatMap((list, u) =>
    list.flatMap((e, i) => (e[1] > 0 ? [[u, i] as [number, number]] : [])),
  )
}

export function flowRun(
  rec: TreeRecording,
  source = 0,
  sink?: number,
): FlowRun {
  const start = graphOf(
    rec.pauses.find((p) => p.probe === 'start'),
    'the starting',
  )
  const t = sink ?? start.length - 1
  const augments = rec.pauses
    .filter((p) => p.probe === 'augment')
    .map((p) => {
      const parent = p.vars.parent as number[]
      const parentEdge = p.vars.parentEdge as number[]
      const hops: Hop[] = []
      for (let v = t; v !== source; v = parent[v]) {
        const u = parent[v]
        const i = parentEdge[v]
        const entry = start[u][i]
        if (entry[0] !== v)
          throw new Error(
            `residual: parentEdge[${v}] does not lead from ${u} to ${v}`,
          )
        const reverse = entry[1] === 0
        hops.unshift({ u, v, reverse, edge: reverse ? [v, entry[2]] : [u, i] })
        if (hops.length > start.length)
          throw new Error(
            'residual: the recorded path does not reach the source',
          )
      }
      return {
        graph: graphOf(p, 'an augmented'),
        hops,
        pathFlow: p.vars.pathFlow as number,
      }
    })
  const end = rec.pauses.find((p) => p.probe === 'return')
  return {
    start,
    augments,
    final: graphOf(end, 'the final'),
    maxFlow: end!.vars.maxFlow as number,
    stdout: rec.stdout,
  }
}

/** Vertices the source reaches through entries with positive residual capacity. */
export function reachable(g: Residual, source = 0): number[] {
  const seen = new Set([source])
  const queue = [source]
  while (queue.length) {
    const u = queue.shift()!
    for (const [v, r] of g[u])
      if (r > 0 && !seen.has(v)) {
        seen.add(v)
        queue.push(v)
      }
  }
  return [...seen].sort((a, b) => a - b)
}

/** True when the sink is reachable using forward entries only (the greedy run with no reverse edges). */
export function reachesWithoutReverse(
  start: Residual,
  g: Residual,
  source: number,
  sink: number,
): boolean {
  const seen = new Set([source])
  const queue = [source]
  while (queue.length) {
    const u = queue.shift()!
    g[u].forEach(([v, r], i) => {
      if (start[u][i][1] > 0 && r > 0 && !seen.has(v)) {
        seen.add(v)
        queue.push(v)
      }
    })
  }
  return seen.has(sink)
}

/** The edges leaving the source side, with their flows. */
export function cutEdges(
  run: FlowRun,
  side: readonly number[],
): { u: number; v: number; cap: number; flow: number }[] {
  return forwardEntries(run.start)
    .map(([u, i]) => ({
      u,
      v: run.start[u][i][0],
      cap: run.start[u][i][1],
      flow: run.start[u][i][1] - run.final[u][i][1],
    }))
    .filter((e) => side.includes(e.u) && !side.includes(e.v))
}

/**
 * A panel of the residual graph `g` (the state after some augmentations),
 * with an optional path marked or the cut of `g` shaded.
 */
export function residualPanel(
  run: FlowRun,
  g: Residual,
  o: {
    id: string
    heading: string
    names: readonly string[]
    at: readonly (readonly [number, number])[]
    reverse: boolean
    path?: Hop[]
    cut?: boolean
    wide?: boolean
    legend: string[]
    notes: string[]
  },
): ResidualPanel {
  const id = (v: number) => `v${v}`
  const side = o.cut ? reachable(g) : undefined
  const edges = forwardEntries(run.start).map(([u, i]): ResidualEdgeView => {
    const [v, cap, pair] = run.start[u][i]
    const flow = cap - g[u][i][1]
    const hop = o.path?.find((h) => h.edge[0] === u && h.edge[1] === i)
    const cutEdge = side && side.includes(u) && !side.includes(v)
    return {
      from: id(u),
      to: id(v),
      cap,
      flow,
      ...(hop && !hop.reverse
        ? { mark: 'path' as const }
        : cutEdge
          ? { mark: 'cut' as const }
          : {}),
      back: {
        residual: g[v][pair][1],
        ...(hop?.reverse ? { mark: 'path' as const } : {}),
      },
    }
  })
  return {
    kind: 'residual',
    id: o.id,
    heading: o.heading,
    nodes: o.names.map((label, v) => ({ id: id(v), label, at: o.at[v] })),
    edges,
    reverse: o.reverse,
    ...(side ? { cut: side.map(id) } : {}),
    ...(o.wide ? { wide: true } : {}),
    legend: o.legend,
    notes: o.notes,
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const FLOW = {
  r: 14,
  /** Margin left and right of the outer nodes' centres (room for a label beside an edge). */
  margin: 30,
  pitchY: { narrow: 48, wide: 60 },
  top: 10,
  bottom: 10,
  /** A line's offset from the centre line when the panel draws reverses (the forward edge right of its travel, the reverse left). */
  lane: 3.5,
  /** Gap between a line and its label's box. */
  labelGap: 4,
  labelH: 12,
  /** The cut region: this far around each source-side centre. */
  hull: 22,
} as const

export type FlowLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  head: string
}
export type FlowGeometry = {
  width: number
  height: number
  at: Record<string, Point>
  edges: {
    from: string
    to: string
    line: FlowLine
    back: FlowLine
    label: { x: number; y: number; w: number; text: string }
  }[]
  hull?: string
  legendTop: number
  drawTop: number
  notesTop: number
}

const smallW = (t: string) => Math.ceil(monoWidth(t, SIZE.small))
export const flowLabel = (e: Pick<ResidualEdgeView, 'flow' | 'cap'>) =>
  `${e.flow}/${e.cap}`

function head(tip: Point, ux: number, uy: number): string {
  const { length: l, halfWidth: w } = ARROW_HEAD
  const bx = tip.x - ux * l
  const by = tip.y - uy * l
  const f = (n: number) => Math.round(n * 10) / 10
  return `M${f(tip.x)} ${f(tip.y)}L${f(bx - uy * w)} ${f(by + ux * w)}L${f(bx + uy * w)} ${f(by - ux * w)}Z`
}

/** A line from circle a to circle b, `off` px right of the centre line (screen coordinates), ending at the rims. */
function offsetLine(a: Point, b: Point, off: number): FlowLine {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  // Right of travel in screen coordinates (y down).
  const nx = -uy
  const ny = ux
  const along = Math.sqrt(FLOW.r * FLOW.r - off * off) + 1
  const x1 = a.x + nx * off + ux * along
  const y1 = a.y + ny * off + uy * along
  const tip = { x: b.x + nx * off - ux * along, y: b.y + ny * off - uy * along }
  return {
    x1,
    y1,
    // The line runs on under the head to 2 px short of its tip, so it meets the target however the drawing scales.
    x2: tip.x - ux * 2,
    y2: tip.y - uy * 2,
    head: head(tip, ux, uy),
  }
}

/** The outline of the points' convex hull grown by `r` (a circle for one point, a stadium for two). */
export function hullPath(points: Point[], r: number): string {
  const f = (n: number) => Math.round(n * 10) / 10
  if (points.length === 1) {
    const [p] = points
    return `M${f(p.x - r)} ${f(p.y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
  }
  // Monotone chain, counter-clockwise on screen (y down: clockwise in the math frame).
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Point[] = []
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop()
    lower.push(p)
  }
  const upper: Point[] = []
  for (const p of [...pts].reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop()
    upper.push(p)
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)]
  // Each edge's outward normal (away from the centroid, which a convex hull holds).
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  const normals = hull.map((p, i) => {
    const q = hull[(i + 1) % hull.length]
    const len = Math.hypot(q.x - p.x, q.y - p.y)
    let nx = (q.y - p.y) / len
    let ny = -(q.x - p.x) / len
    if (hull.length > 2 && (p.x - cx) * nx + (p.y - cy) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    return { nx, ny, dx: (q.x - p.x) / len, dy: (q.y - p.y) / len }
  })
  if (hull.length === 2)
    normals[1] = {
      nx: -normals[0].nx,
      ny: -normals[0].ny,
      dx: -normals[0].dx,
      dy: -normals[0].dy,
    }
  let d = ''
  hull.forEach((p, i) => {
    const q = hull[(i + 1) % hull.length]
    const n = normals[i]
    const next = normals[(i + 1) % hull.length]
    // Around the corner the short way, outward (a half turn, for two points, toward where the edge was heading).
    const c = n.nx * next.ny - n.ny * next.nx
    const sweep =
      Math.abs(c) > 1e-9
        ? c > 0
          ? 1
          : 0
        : n.nx * n.dy - n.ny * n.dx > 0
          ? 1
          : 0
    if (i === 0) d += `M${f(p.x + n.nx * r)} ${f(p.y + n.ny * r)}`
    d += `L${f(q.x + n.nx * r)} ${f(q.y + n.ny * r)}`
    d += `A${r} ${r} 0 0 ${sweep} ${f(q.x + next.nx * r)} ${f(q.y + next.ny * r)}`
  })
  return `${d}Z`
}

/** Legend lines every residual panel of a figure reserves (the most any has), so side by side the drawings line up. */
export const flowLegendLines = (
  panels: readonly { kind: string; legend?: string[] }[],
) =>
  Math.max(
    0,
    ...panels.map((p) => (p.kind === 'residual' ? (p.legend ?? []).length : 0)),
  )
/** Note lines every residual panel of a figure reserves. */
export const flowNoteLines = (
  panels: readonly { kind: string; notes?: string[] }[],
) =>
  Math.max(
    0,
    ...panels.map((p) => (p.kind === 'residual' ? (p.notes ?? []).length : 0)),
  )

export function layoutResidual(
  p: ResidualPanel,
  variant: 'narrow' | 'wide' = 'narrow',
  legendLines = p.legend.length,
  noteLines = p.notes.length,
): FlowGeometry {
  const width = p.wide && variant === 'wide' ? W_WIDE : W
  // A panel with a wide drawing has six vertices and more labels: it keeps the taller pitch at both widths.
  const pitchY = FLOW.pitchY[p.wide ? 'wide' : 'narrow']
  const xs = p.nodes.map((n) => n.at[0])
  const ys = p.nodes.map((n) => n.at[1])
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  const pitchX = (width - 2 * FLOW.margin) / (maxX - minX || 1)
  const legendTop = HEAD
  const drawTop = legendTop + legendLines * SIZE.line + FLOW.top
  const at: Record<string, Point> = {}
  for (const n of p.nodes)
    at[n.id] = {
      x: FLOW.margin + (n.at[0] - minX) * pitchX,
      y: drawTop + FLOW.r + (n.at[1] - minY) * pitchY,
    }
  const centre = {
    x: p.nodes.reduce((s, n) => s + at[n.id].x, 0) / p.nodes.length,
    y: p.nodes.reduce((s, n) => s + at[n.id].y, 0) / p.nodes.length,
  }
  const antiparallel = (e: ResidualEdgeView) =>
    p.edges.some((x) => x.from === e.to && x.to === e.from)
  const edges = p.edges.map((e) => {
    const a = at[e.from]
    const b = at[e.to]
    const split = p.reverse || antiparallel(e)
    const line = offsetLine(a, b, split ? FLOW.lane : 0)
    const back = offsetLine(b, a, split ? FLOW.lane : 0)
    // The label beside the edge: on its own side for an antiparallel pair, else away from the drawing's centre.
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    let nx = -(b.y - a.y) / len
    let ny = (b.x - a.x) / len
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    if (!antiparallel(e) && (mx - centre.x) * nx + (my - centre.y) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    // A centred edge (the diamond's middle) keeps its label right of it.
    if (
      !antiparallel(e) &&
      Math.abs((mx - centre.x) * nx + (my - centre.y) * ny) < 1 &&
      nx < 0
    ) {
      nx = -nx
      ny = -ny
    }
    const text = flowLabel(e)
    const w = smallW(text)
    const reach =
      (split ? FLOW.lane : 0) +
      FLOW.labelGap +
      Math.abs(nx) * (w / 2) +
      Math.abs(ny) * (FLOW.labelH / 2)
    return {
      from: e.from,
      to: e.to,
      line,
      back,
      label: { x: mx + nx * reach, y: my + ny * reach, w, text },
    }
  })
  const drawBottom = drawTop + 2 * FLOW.r + (maxY - minY) * pitchY + FLOW.bottom
  const notesTop = drawBottom + SIZE.notesGap - 6
  return {
    width,
    height: notesTop + noteLines * SIZE.line,
    at,
    edges,
    ...(p.cut
      ? {
          hull: hullPath(
            p.cut.map((id) => at[id]),
            FLOW.hull,
          ),
        }
      : {}),
    legendTop,
    drawTop,
    notesTop,
  }
}
