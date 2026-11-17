import type { Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import type { PerVariant } from '../../shell/types'
import { layoutCalls } from './calls'
import { isDsa, layoutDsa } from './dsa'
import { layoutGraph } from './graph'
import { layoutGrid } from './grid'
import type { GainPanel, SuffixPanel, TreeData, TreePanel, TriePanel } from './model'
import { shapeLabel, type ShapesPanel } from './shapes'

/**
 * Annotated-tree geometry: pure arithmetic on the data, so the server, the
 * tests and the footprint agree. Every panel is one svg: its heading (mono
 * 12 on a 20 px line, as the pointer frames), the drawing, then its note
 * lines. Lengths are px at the default 16 px root; the svg is sized in rem,
 * so it is drawn 1:1 at the default text size and scales down only where
 * its column is narrower (a 320 px phone, very large text), inside a fixed
 * height.
 *
 * Gain and trie panels are 288 wide (the stage at a 320 px phone): narrow
 * stacks them, wide sets them two to a row (2 x 288 + 16 fits the 606 px
 * stage at 768). A suffix panel has a narrow drawing (288) and a wide one
 * (606) with one more table column; CSS shows the variant's.
 */

export const W = 288
export const W_WIDE = 606

export const SIZE = {
  /** Values: mono 13 (`type.value`); labels, notes and the heading: mono 12 (`.vz-12`, `.vz-u`). */
  value: 13,
  small: 12,
  heading: 20,
  headingGap: 4,
  /** A note or result line under a drawing. */
  line: 16,
  notesGap: 10,
  panelGap: 16,
  columnGap: 16,
} as const

export const HEAD = SIZE.heading + SIZE.headingGap
const smallW = (t: string) => Math.ceil(monoWidth(t, SIZE.small))
const valueW = (t: string) => Math.ceil(monoWidth(t, SIZE.value))

export type Box = { x: number; y: number; w: number; h: number }
export type Label = { x: number; y: number; anchor: 'start' | 'middle' | 'end'; lines: string[] }
export const LABEL_LINE = 14

// ---------------------------------------------------------------------------
// Gain trees: two-cell boxes (value | through), straight edges, a returned
// value beside each edge.
// ---------------------------------------------------------------------------

export const GAIN = {
  box: 28,
  cellPad: 7,
  /** Vertical gap between a box and its children's boxes (room for a two-line edge label). */
  levelGap: 42,
  /** Least gap between two boxes on one level, and least spread of two children. */
  sep: 14,
  spread: 72,
  top: 4,
  /** Gap between an edge and its label. */
  labelGap: 5,
} as const

export type GainBox = Box & { id: string; valueW: number; cx: number }
export type GainEdge = { from: string; to: string; x1: number; y1: number; x2: number; y2: number; label: Label }
export type GainGeometry = {
  width: number
  height: number
  boxes: Record<string, GainBox>
  edges: GainEdge[]
  notesTop: number
}

const fmt = (n: number) => String(n)

export function gainBoxWidth(p: GainPanel, id: string) {
  const n = p.nodes[id]
  const v = valueW(fmt(n.value)) + 2 * GAIN.cellPad
  const t = valueW(fmt(n.through)) + 2 * GAIN.cellPad
  return { w: v + t, valueW: v }
}

/** The label an edge carries: what the child returned, or the clamp its parent applied. */
export function gainLabelLines(p: GainPanel, child: string): string[] {
  const n = p.nodes[child]
  if (p.clamp?.child === child) {
    const parent = Object.values(p.nodes).find((x) => x.left === child || x.right === child)!
    const took = parent.left === child ? parent.gainLeft : parent.gainRight
    return [`max(0, ${n.returned})`, `= ${took}`]
  }
  return [`↑${n.returned}`]
}

/** Width the widest clamp label needs left of a tree's root (one for every gain panel of a figure, so both trees line up). */
export function gainLeftRoom(panels: readonly TreePanel[]): number {
  let room = 0
  for (const p of panels) if (p.kind === 'gain' && p.clamp) room = Math.max(room, ...gainLabelLines(p, p.clamp.child).map(smallW))
  return room ? room + 2 * GAIN.labelGap : 0
}

type Contour = { l: number[]; r: number[] }

/** Reingold-Tilford in miniature: each subtree's contour per depth, children pushed apart until they clear by `sep`. */
function placeX(p: GainPanel, id: string, rel: Record<string, number>): Contour {
  const n = p.nodes[id]
  const { w } = gainBoxWidth(p, id)
  const kids = [n.left, n.right].filter((k): k is string => k !== null)
  const own: Contour = { l: [-w / 2], r: [w / 2] }
  rel[id] = 0
  if (!kids.length) return own
  const cs = kids.map((k) => {
    const sub: Record<string, number> = {}
    const c = placeX(p, k, sub)
    return { k, c, sub }
  })
  let offsets: number[]
  if (cs.length === 1) offsets = [n.left ? -GAIN.spread / 2 : GAIN.spread / 2]
  else {
    const [a, b] = cs.map((x) => x.c)
    let d: number = GAIN.spread
    for (let i = 0; i < Math.min(a.r.length, b.l.length); i++) d = Math.max(d, a.r[i] - b.l[i] + GAIN.sep)
    offsets = [-d / 2, d / 2]
  }
  const out: Contour = { l: [...own.l], r: [...own.r] }
  cs.forEach(({ c, sub }, i) => {
    for (const [k, x] of Object.entries(sub)) rel[k] = x + offsets[i]
    c.l.forEach((v, depth) => (out.l[depth + 1] = Math.min(out.l[depth + 1] ?? Infinity, v + offsets[i])))
    c.r.forEach((v, depth) => (out.r[depth + 1] = Math.max(out.r[depth + 1] ?? -Infinity, v + offsets[i])))
  })
  return out
}

/** Legend lines every gain panel of a figure reserves (the most any has), so side by side the trees line up. */
export const gainLegendLines = (panels: readonly TreePanel[]) => Math.max(0, ...panels.map((p) => (p.kind === 'gain' ? p.legend.length : 0)))

export function layoutGain(p: GainPanel, leftRoom = 0, legendLines = p.legend.length, width = W): GainGeometry {
  const rel: Record<string, number> = {}
  const c = placeX(p, p.root, rel)
  const minL = Math.min(...c.l)
  const maxR = Math.max(...c.r)
  // Centre the tree in the room right of the clamp label, never past either edge.
  const span = maxR - minL
  const free = width - leftRoom
  const ox = leftRoom + Math.max(0, (free - span) / 2) - minL
  const depthOf: Record<string, number> = {}
  const walk = (id: string, d: number) => {
    depthOf[id] = d
    const n = p.nodes[id]
    if (n.left) walk(n.left, d + 1)
    if (n.right) walk(n.right, d + 1)
  }
  walk(p.root, 0)
  const pitch = GAIN.box + GAIN.levelGap
  // Under the heading: the legend line (every gain panel of a figure has one, so the trees line up), then the tree.
  const top = HEAD + legendLines * SIZE.line + GAIN.top
  const boxes: Record<string, GainBox> = {}
  for (const id of Object.keys(p.nodes)) {
    const { w, valueW } = gainBoxWidth(p, id)
    const cx = ox + rel[id]
    boxes[id] = { id, x: cx - w / 2, y: top + depthOf[id] * pitch, w, h: GAIN.box, valueW, cx }
  }
  const edges: GainEdge[] = []
  for (const n of Object.values(p.nodes))
    for (const k of [n.left, n.right]) {
      if (!k) continue
      const a = boxes[n.id]
      const b = boxes[k]
      const x1 = a.cx
      const y1 = a.y + a.h
      const x2 = b.cx
      const y2 = b.y
      const lines = gainLabelLines(p, k)
      const h = lines.length * LABEL_LINE
      const mid = (y1 + y2) / 2
      const bottom = mid + h / 2
      // Beside the edge where it is lowest along the label: right of a right edge, left of a left one.
      const at = x1 + ((x2 - x1) * (bottom - y1)) / (y2 - y1)
      const left = x2 < x1
      edges.push({
        from: n.id,
        to: k,
        x1,
        y1,
        x2,
        y2,
        label: { x: left ? at - GAIN.labelGap : at + GAIN.labelGap, y: bottom - h, anchor: left ? 'end' : 'start', lines },
      })
    }
  const depth = Math.max(...Object.values(depthOf))
  const drawn = top + depth * pitch + GAIN.box
  const notesTop = drawn + SIZE.notesGap
  return { width, height: notesTop + p.notes.length * SIZE.line, boxes, edges, notesTop }
}

// ---------------------------------------------------------------------------
// Tries, left to right: a column per depth, a node keeps its first child's
// row, a later child opens the next free row.
// ---------------------------------------------------------------------------

export const TRIE = {
  r: 13,
  /** The END ring, outside the node. */
  ring: 3,
  root: 4,
  pitch: 40,
  x0: 16,
  rowPitch: 52,
  top: 4,
  /** Baseline of the label under a node (END, pruned), from its centre. */
  labelDy: 30,
  resultsGap: 8,
} as const

export type TrieGeometry = {
  width: number
  height: number
  at: Record<string, { x: number; y: number; row: number }>
  rows: number
  resultsTop: number
}

export function layoutTrie(p: TriePanel, rows?: number): TrieGeometry {
  const at: TrieGeometry['at'] = {}
  let next = 0
  const kids = (id: string) => p.nodes.filter((n) => n.parent === id)
  const place = (id: string, row: number) => {
    const n = p.nodes.find((x) => x.id === id)!
    at[id] = { x: TRIE.x0 + n.depth * TRIE.pitch, y: 0, row }
    kids(id).forEach((k, i) => {
      if (i > 0) next++
      place(k.id, i === 0 ? row : next)
    })
  }
  place('root', 0)
  const n = Math.max(rows ?? 0, next + 1)
  const top = HEAD + TRIE.top + TRIE.r + TRIE.ring
  for (const a of Object.values(at)) a.y = top + a.row * TRIE.rowPitch
  const drawn = top + (n - 1) * TRIE.rowPitch + TRIE.labelDy + 4
  const resultsTop = drawn + TRIE.resultsGap
  return { width: W, height: resultsTop + p.results.length * SIZE.line, at, rows: n, resultsTop }
}

// ---------------------------------------------------------------------------
// Suffix trees, left to right: a row per leaf in suffix-array order, a
// column per node depth, then the table (SA, the suffix on wide, LCP).
// ---------------------------------------------------------------------------

export const SUFFIX = {
  rowPitch: 34,
  /** The column headings' row. */
  header: 18,
  top: 4,
  root: 4,
  pill: 22,
  pillPad: 5,
  leaf: { w: 24, h: 22 },
  /** Where an elbow turns down: this far right of its parent. */
  trunk: 6,
  /** Corner radius of an elbow. */
  corner: 6,
  /** Baselines of an edge's substring (above its line) and range (below). */
  above: -5,
  below: 13,
  notesGap: 8,
} as const

export type SuffixColumns = { depth: number[]; leaf: number; suffix?: number; lcp: number }
export const SUFFIX_COLUMNS: Record<'narrow' | 'wide', SuffixColumns> = {
  // Centres of the internal nodes per depth (0: the root dot), the leaf box's left edge, the LCP column's right edge.
  narrow: { depth: [4, 67, 143], leaf: 220, lcp: 282 },
  wide: { depth: [8, 132, 264], leaf: 400, suffix: 452, lcp: 584 },
}

export type SuffixGeometry = {
  width: number
  height: number
  cols: SuffixColumns
  rowY: number[]
  at: Record<string, { x: number; y: number; w: number }>
  /** Each non-root node's edge: the path from its parent and where its labels sit. */
  edges: { to: string; points: Point[]; label: { x: number; y: number } }[]
  headerY: number
  notesTop: number
}

export const pillWidth = (t: string) => valueW(t) + 2 * SUFFIX.pillPad

export function layoutSuffix(p: SuffixPanel, variant: 'narrow' | 'wide'): SuffixGeometry {
  const cols = SUFFIX_COLUMNS[variant]
  const width = variant === 'wide' ? W_WIDE : W
  const headerY = HEAD + SUFFIX.top + 12
  const first = HEAD + SUFFIX.top + SUFFIX.header + SUFFIX.rowPitch / 2
  const leaves = p.nodes.filter((n) => n.leaf !== undefined)
  const rowY = leaves.map((_, i) => first + i * SUFFIX.rowPitch)
  const at: SuffixGeometry['at'] = {}
  const depthOf: Record<string, number> = { root: 0 }
  // Rows: a leaf's own; an internal node sits on its first child's row.
  const rowOf: Record<string, number> = {}
  leaves.forEach((l, i) => (rowOf[l.id] = i))
  for (const n of [...p.nodes].reverse()) if (n.leaf === undefined) rowOf[n.id] = rowOf[p.nodes.find((k) => k.parent === n.id)!.id]
  for (const n of p.nodes) if (n.parent) depthOf[n.id] = depthOf[n.parent] + 1
  for (const n of p.nodes) {
    const y = rowY[rowOf[n.id]]
    if (n.leaf !== undefined) at[n.id] = { x: cols.leaf + SUFFIX.leaf.w / 2, y, w: SUFFIX.leaf.w }
    else if (n.parent === null) at[n.id] = { x: cols.depth[0], y, w: 2 * SUFFIX.root }
    else at[n.id] = { x: cols.depth[depthOf[n.id]], y, w: pillWidth(n.path!) }
  }
  const edges: SuffixGeometry['edges'] = []
  for (const n of p.nodes) {
    if (!n.parent) continue
    const a = at[n.parent]
    const b = at[n.id]
    const sx = a.x + a.w / 2
    const ex = b.x - b.w / 2
    const firstChild = p.nodes.find((k) => k.parent === n.parent)!.id === n.id
    const tx = sx + SUFFIX.trunk
    const points: Point[] = firstChild
      ? [
          { x: sx, y: a.y },
          { x: ex, y: b.y },
        ]
      : [
          { x: sx, y: a.y },
          { x: tx, y: a.y },
          { x: tx, y: b.y },
          { x: ex, y: b.y },
        ]
    const from = firstChild ? sx : tx
    edges.push({ to: n.id, points, label: { x: (from + ex) / 2, y: b.y } })
  }
  const drawn = rowY[rowY.length - 1] + SUFFIX.rowPitch / 2
  const notesTop = drawn + SUFFIX.notesGap
  return { width, height: notesTop + p.notes.length * SIZE.line, cols, rowY, at, edges, headerY, notesTop }
}

// ---------------------------------------------------------------------------
// The figure: blocks per panel, stacked (narrow) or two to a row (wide).
// ---------------------------------------------------------------------------

export type TreeScene = {
  gainRoom: number
  gainLegend: number
  trieRows: number
  /** Each panel's block height per variant. */
  blocks: PerVariant<number>[]
  /** Panels that take the whole row on wide. */
  full: boolean[]
  height: PerVariant<number>
}

export function layoutTree(d: TreeData): TreeScene {
  const gainRoom = gainLeftRoom(d.panels)
  const gainLegend = gainLegendLines(d.panels)
  // Every trie panel of a figure keeps one row count, so the panels line up.
  const trieRows = Math.max(0, ...d.panels.map((p) => (p.kind === 'trie' ? layoutTrie(p).rows : 0)))
  const blocks = d.panels.map((p): PerVariant<number> => {
    if (p.kind === 'gain') {
      const h = layoutGain(p, gainRoom, gainLegend).height
      return { narrow: h, wide: h }
    }
    if (p.kind === 'trie') {
      const h = layoutTrie(p, trieRows).height
      return { narrow: h, wide: h }
    }
    if (isDsa(p)) {
      const h = layoutDsa(p).height
      return { narrow: h, wide: h }
    }
    if (p.kind === 'shapes') {
      const h = layoutShapes(p).height
      return { narrow: h, wide: h }
    }
    if (p.kind === 'calls') return { narrow: layoutCalls(p, 'narrow').height, wide: layoutCalls(p, 'wide').height }
    if (p.kind === 'graph') {
      const h = layoutGraph(p).height
      return { narrow: h, wide: h }
    }
    if (p.kind === 'grid') {
      const h = layoutGrid(p).height
      return { narrow: h, wide: h }
    }
    return { narrow: layoutSuffix(p, 'narrow').height, wide: layoutSuffix(p, 'wide').height }
  })
  const full = d.panels.map((p) => p.kind === 'suffix' || p.kind === 'calls')
  const narrow = blocks.reduce((s, b) => s + b.narrow, 0) + (blocks.length - 1) * SIZE.panelGap
  let wide = 0
  let rows = 0
  for (let i = 0; i < blocks.length; ) {
    const pair = !full[i] && i + 1 < blocks.length && !full[i + 1]
    wide += Math.max(blocks[i].wide, pair ? blocks[i + 1].wide : 0)
    rows++
    i += pair ? 2 : 1
  }
  wide += (rows - 1) * SIZE.panelGap
  return { gainRoom, gainLegend, trieRows, blocks, full, height: { narrow, wide } }
}

// ---------------------------------------------------------------------------
// Hidden-class trees: a map per node (its keys), top to bottom from the
// empty object, the added key beside each edge, objects under their map.
// ---------------------------------------------------------------------------

export const SHAPES = {
  box: 28,
  pad: 8,
  /** Between a map and its children (room for the `+key` label beside the edge). */
  levelGap: 30,
  sep: 16,
  top: 6,
  /** The objects' line under a map. */
  objects: 18,
  labelGap: 6,
} as const

export type ShapeBox = Box & { id: string; cx: number }
export type ShapeEdge = { from: string; to: string; x1: number; y1: number; x2: number; y2: number; label: Label }
export type ShapeGeometry = { width: number; height: number; boxes: Record<string, ShapeBox>; edges: ShapeEdge[]; resultsTop: number }

export function layoutShapes(p: ShapesPanel): ShapeGeometry {
  const kids = (id: string) => p.nodes.filter((n) => n.parent === id).map((n) => n.id)
  const byId = new Map(p.nodes.map((n) => [n.id, n]))
  const boxW = (id: string) => valueW(shapeLabel(byId.get(id)!.keys)) + 2 * SHAPES.pad
  const objW = (id: string) => (byId.get(id)!.objects.length ? smallW(byId.get(id)!.objects.join(', ')) : 0)
  const span = new Map<string, number>()
  const measure = (id: string): number => {
    const c = kids(id)
    const own = Math.max(boxW(id), objW(id))
    const sum = c.reduce((s, k) => s + measure(k), 0) + Math.max(0, c.length - 1) * SHAPES.sep
    span.set(id, Math.max(own, sum))
    return span.get(id)!
  }
  const root = p.nodes[0].id
  const total = measure(root)
  if (total > W) throw new Error(`${p.id}: the tree needs ${total}px, more than ${W}px`)
  const boxes: Record<string, ShapeBox> = {}
  const depthOf = (id: string): number => (byId.get(id)!.parent ? depthOf(byId.get(id)!.parent!) + 1 : 0)
  const levelY = (d: number) => HEAD + SHAPES.top + d * (SHAPES.box + SHAPES.levelGap)
  const place = (id: string, left: number) => {
    const s = span.get(id)!
    const c = kids(id)
    const sum = c.reduce((a, k) => a + span.get(k)!, 0) + Math.max(0, c.length - 1) * SHAPES.sep
    let x = left + (s - sum) / 2
    for (const k of c) {
      place(k, x)
      x += span.get(k)! + SHAPES.sep
    }
    const cx = c.length ? (boxes[c[0]].cx + boxes[c[c.length - 1]].cx) / 2 : left + s / 2
    const w = boxW(id)
    boxes[id] = { id, x: Math.round(cx - w / 2), y: levelY(depthOf(id)), w, h: SHAPES.box, cx: Math.round(cx) }
  }
  place(root, (W - total) / 2)
  const edges: ShapeEdge[] = p.nodes
    .filter((n) => n.parent)
    .map((n) => {
      const a = boxes[n.parent!]
      const b = boxes[n.id]
      const siblings = kids(n.parent!)
      const left = siblings.length > 1 && siblings.indexOf(n.id) < siblings.length / 2 - 0.25
      const mx = (a.cx + b.cx) / 2
      const my = (a.y + a.h + b.y) / 2
      return {
        from: n.parent!,
        to: n.id,
        x1: a.cx,
        y1: a.y + a.h,
        x2: b.cx,
        y2: b.y,
        // Clear of a slanted edge: the run of the edge across the label's height, plus the gap.
        label: { x: mx + (left ? -1 : 1) * (SHAPES.labelGap + Math.ceil((Math.abs(b.cx - a.cx) / SHAPES.levelGap) * 7)), y: my - 7, anchor: left ? 'end' : 'start', lines: [`+${n.keys[n.keys.length - 1]}`] },
      }
    })
  const depth = Math.max(...p.nodes.map((n) => depthOf(n.id)))
  const deepestHasObjects = p.nodes.some((n) => n.objects.length)
  const resultsTop = levelY(depth) + SHAPES.box + (deepestHasObjects ? SHAPES.objects : 0) + SIZE.notesGap
  const height = resultsTop + (p.results.length + p.notes.length) * SIZE.line + 4
  return { width: W, height, boxes, edges, resultsTop }
}
