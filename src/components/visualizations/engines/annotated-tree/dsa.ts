import type { Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W } from './layout'

/**
 * Wave 4A panels of the annotated-tree substrate (the DSA static figures),
 * pure data and geometry, so the server, the tests and the footprint agree:
 *
 * - `segment`: a segment tree drawn top down, each node its [start, end],
 *   its sum and its tree[] index; one mark per panel: how a query covered
 *   the node (full, partial, disjoint), the update path (old -> new sums)
 *   or the lazy tags a range update left;
 * - `forest`: a union-find parent forest, node i in column i above the
 *   parent[] (and rank[]) cells it is linked to, arrows child to parent;
 * - `heap`: a heap array's complete binary tree above its indexed cells,
 *   each cell linked to its node;
 * - `recursion`: a recursion's call tree drawn top down, memo hits as small
 *   leaves, with the memo table it filled;
 * - `interval`: an interval dp table (upper triangle), its values or the
 *   order a loop fills them, with the cells one cell reads.
 *
 * Three building blocks are shared by these panels: the array-cells row
 * (`arrayRow`, with a link from each cell to its node), the lazy-tag mark
 * (`TAG`, a small changed pill on a node) and the memo-hit leaf (`HIT`).
 * Every panel is 288 wide (the stage at a 320 px phone): narrow stacks the
 * panels, wide sets them two to a row.
 */

export const smallW = (t: string) => Math.ceil(monoWidth(t, SIZE.small))
export const valueW = (t: string) => Math.ceil(monoWidth(t, SIZE.value))

// ---------------------------------------------------------------------------
// Panel data
// ---------------------------------------------------------------------------

export type SegCover = 'full' | 'partial' | 'disjoint'

export type SegNodeView = {
  /** tree[] index. */
  idx: number
  start: number
  end: number
  sum: number
  /** The sum before this panel's call wrote it (an old -> new pair). */
  was?: number
  cover?: SegCover
  /** A pending lazy tag (lazy[idx] after the call). */
  tag?: number
  /** On the update path (the panel's mark). */
  path?: boolean
}

export type SegmentPanel = {
  kind: 'segment'
  id: string
  heading: string
  /** Which family the panel marks: query cover, the update path, or lazy tags. */
  mark: 'cover' | 'path' | 'lazy'
  /** In tree[] index order. */
  nodes: SegNodeView[]
  legend: string[]
  notes: string[]
}

export type ArrayRowView = { name: string; values: (number | string)[]; changed?: number[] }

export type ForestPanel = {
  kind: 'forest'
  id: string
  heading: string
  /** parent[i] as recorded. */
  parent: number[]
  /** The rows under the forest: parent[] first, then rank[] or size[]. */
  rows: ArrayRowView[]
  /** Nodes whose parent pointer this panel's call wrote (the mark: node, arrow and parent[] cell). */
  changed: number[]
  notes: string[]
}

export type HeapPanel = {
  kind: 'heap'
  id: string
  heading: string
  heap: number[]
  /** The sift-down step the panel shows: the node compared and its children, the smaller one (or none: it stops). */
  compare?: { at: number; kids: number[]; smaller: number | null }
  /** The index formula on the root's two edges. */
  formulas: boolean
  notes: string[]
}

export type RecNode = {
  id: string
  n: number
  parent: string | null
  /** A memo hit: returned memo[n] without a call below it. */
  hit?: boolean
  /** The panel's mark: a subproblem computed more than once. */
  repeat?: boolean
}

export type RecursionPanel = {
  kind: 'recursion'
  id: string
  heading: string
  /** In call (pre-) order. */
  nodes: RecNode[]
  /** The memo table, in write order. */
  memo?: { n: number; value: number }[]
  legend: string[]
  notes: string[]
}

export type IntervalCell = { i: number; j: number; value: number; order?: number }

export type IntervalPanel = {
  kind: 'interval'
  id: string
  heading: string
  s: string
  /** Upper triangle (i <= j), as recorded. */
  cells: IntervalCell[]
  show: 'value' | 'order'
  /** The cell the arrows leave (the panel's mark). */
  target: [number, number]
  /** The cells the target reads: the inner cell (used here or not) and the two neighbours. */
  arrows: { to: [number, number]; used: boolean }[]
  legend: string[]
  notes: string[]
}

export type DsaPanel = SegmentPanel | ForestPanel | HeapPanel | RecursionPanel | IntervalPanel

// ---------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------

export const legendTop = (lines: number) => HEAD + lines * SIZE.line

/** Notes block: its top and the panel height it gives. */
const withNotes = (drawn: number, notes: number) => {
  const notesTop = drawn + SIZE.notesGap
  return { notesTop, height: notesTop + notes * SIZE.line }
}

/**
 * A tidy tree (Reingold-Tilford in miniature): each subtree's contour per
 * depth, siblings pushed apart until they clear by `sep`, a parent centred
 * over its first and last child. Returns centres relative to the root.
 */
export function tidy(root: string, kids: (id: string) => string[], w: (id: string) => number, sep: number): Record<string, number> {
  type C = { l: number[]; r: number[] }
  const place = (id: string): { c: C; x: Record<string, number> } => {
    const ww = w(id)
    const ks = kids(id)
    if (!ks.length) return { c: { l: [-ww / 2], r: [ww / 2] }, x: { [id]: 0 } }
    const subs = ks.map(place)
    const acc: C = { l: [...subs[0].c.l], r: [...subs[0].c.r] }
    const offs = [0]
    for (let k = 1; k < subs.length; k++) {
      const c = subs[k].c
      let d = -Infinity
      for (let i = 0; i < Math.min(acc.r.length, c.l.length); i++) d = Math.max(d, acc.r[i] - c.l[i] + sep)
      offs.push(d)
      c.l.forEach((v, i) => (acc.l[i] = Math.min(acc.l[i] ?? Infinity, v + d)))
      c.r.forEach((v, i) => (acc.r[i] = Math.max(acc.r[i] ?? -Infinity, v + d)))
    }
    const mid = (offs[0] + offs[offs.length - 1]) / 2
    const x: Record<string, number> = { [id]: 0 }
    subs.forEach((s, k) => {
      for (const [kk, v] of Object.entries(s.x)) x[kk] = v + offs[k] - mid
    })
    return { c: { l: [-ww / 2, ...acc.l.map((v) => v - mid)], r: [ww / 2, ...acc.r.map((v) => v - mid)] }, x }
  }
  return place(root).x
}

/** Shift relative centres so the tree is centred in `width` (throws if it does not fit). */
function centre(rel: Record<string, number>, w: (id: string) => number, width: number, what: string): Record<string, number> {
  const ids = Object.keys(rel)
  const minL = Math.min(...ids.map((id) => rel[id] - w(id) / 2))
  const maxR = Math.max(...ids.map((id) => rel[id] + w(id) / 2))
  if (maxR - minL > width) throw new Error(`${what}: the tree needs ${Math.ceil(maxR - minL)}px, more than ${width}px`)
  const ox = (width - (maxR - minL)) / 2 - minL
  return Object.fromEntries(ids.map((id) => [id, ox + rel[id]]))
}

/** An arrow head at `tip`, pointing along from -> tip (any angle). */
export function slantHead(from: Point, tip: Point, length = 7, half = 4): string {
  const len = Math.hypot(tip.x - from.x, tip.y - from.y) || 1
  const ux = (tip.x - from.x) / len
  const uy = (tip.y - from.y) / len
  const bx = tip.x - ux * length
  const by = tip.y - uy * length
  const f = (n: number) => Math.round(n * 10) / 10
  return `M${f(tip.x)} ${f(tip.y)}L${f(bx - uy * half)} ${f(by + ux * half)}L${f(bx + uy * half)} ${f(by - ux * half)}Z`
}

/**
 * The array-cells row (shared): optional index header, then one row of
 * cells per array, a gutter name left of each; cell `k` centred at `xs[k]`.
 */
export const ROW = { cell: { h: 24 }, header: 16, gap: 4, gutterGap: 6 } as const
export type ArrayRowGeometry = {
  /** Baseline of the index header, if any. */
  headerY: number | null
  /** Top of each row's cells. */
  rowY: number[]
  bottom: number
}
export function arrayRows(top: number, rows: number, header: boolean): ArrayRowGeometry {
  const headerY = header ? top + 12 : null
  let y = top + (header ? ROW.header : 0)
  const rowY: number[] = []
  for (let k = 0; k < rows; k++) {
    rowY.push(y)
    y += ROW.cell.h + ROW.gap
  }
  return { headerY, rowY, bottom: y - ROW.gap }
}

/** The lazy-tag mark (shared): a changed pill carrying `+v`, beside the node's index. */
export const TAG = { h: 14, pad: 4, gap: 3 } as const
export const tagText = (v: number) => `+${v}`
export const tagWidth = (v: number) => smallW(tagText(v)) + 2 * TAG.pad

/** The memo-hit leaf (shared): a small changed box naming the memo cell read. */
export const HIT = { h: 20, pad: 5 } as const
export const hitText = (n: number) => `memo[${n}]`
export const hitWidth = (n: number) => smallW(hitText(n)) + 2 * HIT.pad

// ---------------------------------------------------------------------------
// Segment trees
// ---------------------------------------------------------------------------

export const SEG = { h: 46, pad: 5, minW: 42, levelGap: 22, sep: 4, top: 4, rows: [13, 28, 41] } as const

export const rangeText = (n: SegNodeView) => `[${n.start},${n.end}]`
export const sumText = (n: SegNodeView) => (n.was !== undefined && n.was !== n.sum ? `${n.was}→${n.sum}` : String(n.sum))
export const idxText = (n: SegNodeView) => `#${n.idx}`

export function segBoxWidth(n: SegNodeView): number {
  const idxRow = smallW(idxText(n)) + (n.tag ? TAG.gap + tagWidth(n.tag) + 2 : 0)
  return Math.max(SEG.minW, smallW(rangeText(n)) + 2 * SEG.pad, valueW(sumText(n)) + 2 * SEG.pad, idxRow + 2 * SEG.pad)
}

export type SegBox = { idx: number; x: number; y: number; w: number; cx: number; depth: number }
export type SegGeometry = { width: number; height: number; boxes: Record<number, SegBox>; edges: { from: number; to: number }[]; notesTop: number }

export function layoutSegment(p: SegmentPanel): SegGeometry {
  const by = new Map(p.nodes.map((n) => [n.idx, n]))
  const kids = (id: string) => [2 * Number(id) + 1, 2 * Number(id) + 2].filter((k) => by.has(k)).map(String)
  const w = (id: string) => segBoxWidth(by.get(Number(id))!)
  const x = centre(tidy('0', kids, w, SEG.sep), w, W, p.id)
  const top = legendTop(p.legend.length) + SEG.top
  const boxes: Record<number, SegBox> = {}
  const depthOf = (i: number): number => (i === 0 ? 0 : depthOf(Math.floor((i - 1) / 2)) + 1)
  let deepest = 0
  for (const n of p.nodes) {
    const d = depthOf(n.idx)
    deepest = Math.max(deepest, d)
    const ww = segBoxWidth(n)
    const cx = x[String(n.idx)]
    boxes[n.idx] = { idx: n.idx, x: cx - ww / 2, y: top + d * (SEG.h + SEG.levelGap), w: ww, cx, depth: d }
  }
  const edges = p.nodes.filter((n) => n.idx > 0).map((n) => ({ from: Math.floor((n.idx - 1) / 2), to: n.idx }))
  const drawn = top + deepest * (SEG.h + SEG.levelGap) + SEG.h
  return { width: W, boxes, edges, ...withNotes(drawn, p.notes.length) }
}

// ---------------------------------------------------------------------------
// Union-find forests
// ---------------------------------------------------------------------------

export const FOREST = { r: 10, pitch: 24, cellW: 22, gutter: 46, top: 8, levelGap: 34, rowsGap: 14 } as const

export type ForestGeometry = {
  width: number
  height: number
  colX: number[]
  at: { x: number; y: number; depth: number }[]
  rows: ArrayRowGeometry
  /** Each non-root's arrow to its parent: a path and its head. */
  arrows: { from: number; to: number; d: string; head: string }[]
  notesTop: number
}

export function forestDepth(parent: readonly number[], i: number): number {
  let d = 0
  for (let k = i; parent[k] !== k; k = parent[k]) {
    d++
    if (d > parent.length) throw new Error('forest: parent[] has a cycle')
  }
  return d
}

export function layoutForest(p: ForestPanel): ForestGeometry {
  const n = p.parent.length
  const colX = Array.from({ length: n }, (_, i) => FOREST.gutter + i * FOREST.pitch + FOREST.cellW / 2)
  if (colX[n - 1] + FOREST.cellW / 2 > W) throw new Error(`${p.id}: ${n} columns do not fit ${W}px`)
  const top = HEAD + FOREST.top + FOREST.r
  const depth = Array.from({ length: n }, (_, i) => forestDepth(p.parent, i))
  const at = depth.map((d, i) => ({ x: colX[i], y: top + d * FOREST.levelGap, depth: d }))
  const arrows: ForestGeometry['arrows'] = []
  for (let i = 0; i < n; i++) {
    const j = p.parent[i]
    if (j === i) continue
    const a = at[i]
    const b = at[j]
    // A pointer that passes over a column between them arcs up, clear of that column's node.
    const span = Math.abs(j - i)
    const lift = span > 1 ? 10 + 6 * (span - 2) : 0
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2 - lift
    const ua = unit(a, { x: mx, y: my })
    const ub = unit(b, { x: mx, y: my })
    const s = { x: a.x + ua.x * (FOREST.r + 1), y: a.y + ua.y * (FOREST.r + 1) }
    const e = { x: b.x + ub.x * (FOREST.r + 2), y: b.y + ub.y * (FOREST.r + 2) }
    const f = (v: number) => Math.round(v * 10) / 10
    const d = lift ? `M${f(s.x)} ${f(s.y)}Q${f(mx)} ${f(my)} ${f(e.x)} ${f(e.y)}` : `M${f(s.x)} ${f(s.y)}L${f(e.x)} ${f(e.y)}`
    arrows.push({ from: i, to: j, d, head: slantHead(lift ? { x: mx, y: my } : s, e) })
  }
  const deepest = Math.max(...depth)
  const rowsTop = top + deepest * FOREST.levelGap + FOREST.r + FOREST.rowsGap
  const rows = arrayRows(rowsTop, p.rows.length, true)
  return { width: W, colX, at, rows, arrows, ...withNotes(rows.bottom, p.notes.length) }
}

const unit = (a: Point, b: Point) => {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
  return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
}

// ---------------------------------------------------------------------------
// Heaps
// ---------------------------------------------------------------------------

export const HEAP = { r: 15, levelGap: 40, top: 6, cellW: 36, cellGap: 4, rowsGap: 44, labelGap: 6, under: 16 } as const

export type HeapGeometry = {
  width: number
  height: number
  at: { x: number; y: number }[]
  cellX: number[]
  rows: ArrayRowGeometry
  /** Where the cell links start to bend: below the deepest node. */
  bend: number
  /** The formula labels on the root's edges. */
  formulas: { x: number; y: number; anchor: 'start' | 'end'; text: string }[]
  notesTop: number
}

export const outcomeText = (p: HeapPanel) => {
  const c = p.compare
  if (!c) return null
  if (c.smaller === null) return `${p.heap[c.at]} ≤ ${c.kids.map((k) => p.heap[k]).join(', ')}: stop`
  return `smaller child: ${p.heap[c.smaller]}`
}

export function layoutHeap(p: HeapPanel): HeapGeometry {
  const levels = Math.floor(Math.log2(p.heap.length)) + 1
  const top = HEAD + HEAP.top + HEAP.r
  const at = p.heap.map((_, i) => {
    const L = Math.floor(Math.log2(i + 1))
    const slot = i + 1 - 2 ** L
    const slots = 2 ** (levels - 1)
    // Slots of the deepest level; a node centres over the slots under it.
    const span = slots / 2 ** L
    const pitch = W / slots
    return { x: (slot * span + span / 2) * pitch, y: top + L * HEAP.levelGap }
  })
  const n = p.heap.length
  const rowW = n * HEAP.cellW + (n - 1) * HEAP.cellGap
  const cellX = p.heap.map((_, i) => (W - rowW) / 2 + i * (HEAP.cellW + HEAP.cellGap) + HEAP.cellW / 2)
  const formulas: HeapGeometry['formulas'] = []
  if (p.formulas)
    for (const [k, text] of [
      [1, '2i+1'],
      [2, '2i+2'],
    ] as const) {
      if (k >= n) continue
      const a = at[0]
      const b = at[k]
      const left = b.x < a.x
      formulas.push({ x: (a.x + b.x) / 2 + (left ? -HEAP.labelGap : HEAP.labelGap), y: (a.y + b.y) / 2 - 2, anchor: left ? 'end' : 'start', text })
    }
  const deepest = top + (levels - 1) * HEAP.levelGap + HEAP.r
  const rows = arrayRows(deepest + HEAP.rowsGap, 1, true)
  return { width: W, at, cellX, rows, formulas, bend: deepest + 4, ...withNotes(rows.bottom, p.notes.length) }
}

// ---------------------------------------------------------------------------
// Recursion trees
// ---------------------------------------------------------------------------

export const REC = { r: 12, levelGap: 18, sep: 8, top: 6, cellW: 30, cellGap: 4, rowsGap: 14, gutter: 50 } as const

export const recWidth = (n: RecNode) => (n.hit ? hitWidth(n.n) : 2 * REC.r)

export type RecGeometry = {
  width: number
  height: number
  at: Record<string, { x: number; y: number; depth: number }>
  memo: { cellX: number[]; rows: ArrayRowGeometry } | null
  notesTop: number
}

export function layoutRecursion(p: RecursionPanel): RecGeometry {
  const by = new Map(p.nodes.map((n) => [n.id, n]))
  const kids = (id: string) => p.nodes.filter((n) => n.parent === id).map((n) => n.id)
  const w = (id: string) => recWidth(by.get(id)!)
  const x = centre(tidy(p.nodes[0].id, kids, w, REC.sep), w, W, p.id)
  const top = legendTop(p.legend.length) + REC.top + REC.r
  const depth: Record<string, number> = {}
  for (const n of p.nodes) depth[n.id] = n.parent ? depth[n.parent] + 1 : 0
  const pitch = 2 * REC.r + REC.levelGap
  const at = Object.fromEntries(p.nodes.map((n) => [n.id, { x: x[n.id], y: top + depth[n.id] * pitch, depth: depth[n.id] }]))
  const deepest = top + Math.max(...Object.values(depth)) * pitch + REC.r
  let memo: RecGeometry['memo'] = null
  let drawn = deepest
  if (p.memo) {
    const rows = arrayRows(deepest + REC.rowsGap, 2, true)
    const cellX = p.memo.map((_, k) => REC.gutter + k * (REC.cellW + REC.cellGap) + REC.cellW / 2)
    memo = { cellX, rows }
    drawn = rows.bottom
  }
  return { width: W, at, memo, ...withNotes(drawn, p.notes.length) }
}

// ---------------------------------------------------------------------------
// Interval dp tables
// ---------------------------------------------------------------------------

export const INTERVAL = { cell: { w: 36, h: 26 }, gap: 14, gutter: 40, header: 30, top: 4 } as const

export type IntervalGeometry = {
  width: number
  height: number
  x: number[]
  y: number[]
  /** Baselines of the two column-header lines (j, then s[j]). */
  headerY: [number, number]
  arrows: { to: [number, number]; used: boolean; d: string; head: string }[]
  /** Where the lower triangle's label sits (two lines). */
  empty: { x: number; y: number }
  notesTop: number
}

export function layoutInterval(p: IntervalPanel): IntervalGeometry {
  const n = p.s.length
  const pitchX = INTERVAL.cell.w + INTERVAL.gap
  const pitchY = INTERVAL.cell.h + INTERVAL.gap
  const x = Array.from({ length: n }, (_, j) => INTERVAL.gutter + j * pitchX)
  if (x[n - 1] + INTERVAL.cell.w > W) throw new Error(`${p.id}: ${n} columns do not fit ${W}px`)
  const top = legendTop(p.legend.length) + INTERVAL.top
  const headerY: [number, number] = [top + 12, top + 26]
  const y = Array.from({ length: n }, (_, i) => top + INTERVAL.header + 4 + i * pitchY)
  const [ti, tj] = p.target
  const arrows = p.arrows.map((a) => {
    const [ai, aj] = a.to
    // From the target's edge facing the cell it reads to that cell's facing edge.
    const dx = Math.sign(aj - tj)
    const dy = Math.sign(ai - ti)
    const cx = (j: number) => x[j] + INTERVAL.cell.w / 2
    const cy = (i: number) => y[i] + INTERVAL.cell.h / 2
    const hw = INTERVAL.cell.w / 2 + 2
    const hh = INTERVAL.cell.h / 2 + 2
    const s = { x: cx(tj) + dx * (dy ? hw - 8 : hw), y: cy(ti) + dy * (dx ? hh - 4 : hh) }
    const e = { x: cx(aj) - dx * (dy ? hw - 8 : hw), y: cy(ai) - dy * (dx ? hh - 4 : hh) }
    const f = (v: number) => Math.round(v * 10) / 10
    return { to: a.to, used: a.used, d: `M${f(s.x)} ${f(s.y)}L${f(e.x)} ${f(e.y)}`, head: slantHead(s, e, 6, 3.5) }
  })
  const empty = { x: x[0] + 10, y: y[n - 1] + INTERVAL.cell.h / 2 + 4 }
  const drawn = y[n - 1] + INTERVAL.cell.h
  return { width: W, x, y, headerY, arrows, empty, ...withNotes(drawn, p.notes.length) }
}

export function layoutDsa(p: DsaPanel): { height: number } {
  if (p.kind === 'segment') return layoutSegment(p)
  if (p.kind === 'forest') return layoutForest(p)
  if (p.kind === 'heap') return layoutHeap(p)
  if (p.kind === 'recursion') return layoutRecursion(p)
  return layoutInterval(p)
}

export const isDsa = (p: { kind: string }): p is DsaPanel => ['segment', 'forest', 'heap', 'recursion', 'interval'].includes(p.kind)
