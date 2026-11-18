import { ARROW_HEAD, contains, intersects, type Point, type Rect } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W } from './layout'

/**
 * The `boxes` panel kind (wave 4D): one generic box-and-arrow scene for the
 * frontend figures (a component tree, Module Federation containers, a DOM
 * tree beside its accessibility tree, commit graphs). The figure's builder
 * (`./frontend.ts`) places every node, edge and label in px from a recorded
 * run; this module only measures text, writes the shared geometry (borders,
 * routes, tags, keys) and checks a finished scene (`checkBoxes`); the markup
 * is `BoxesSvg.tsx`, in the substrate's vocabulary.
 *
 * Shapes: `box` (the glyph rectangle), `pill` (a rounded glyph: an element
 * that is not a component, a ref name), `circle` (a commit), `row` (a line
 * of an outline tree, no outline). States, one mark family per panel (H3
 * R2 Q9, never lime): `mark`, the neutral changed tint (rendered, created,
 * moved); `ghost`, a dashed outline with muted text (skipped, unreferenced);
 * `gone`, muted text struck through (left out of a tree).
 */

export type BoxShape = 'box' | 'pill' | 'circle' | 'row'
export type BoxState = 'mark' | 'ghost' | 'gone'

export type BoxNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
  shape: BoxShape
  /** The first line in mono 13, the rest in mono 12 secondary ink. */
  lines: string[]
  /** Text alignment inside the node (rows read from the left). */
  align: 'middle' | 'start'
  /** The first line in mono 12 too (an outline tree's rows, as DevTools draws them). */
  small?: boolean
  state?: BoxState
  /** `data-*` attributes for the gates (the recorded value each node draws). */
  data?: Record<string, string | number>
}

export type BoxEdge = {
  id: string
  from: string
  to: string
  points: Point[]
  dashed?: boolean
  mark?: boolean
  /** Draw an arrowhead at the last point (default true). */
  head?: boolean
  /** A word on the line (a glyph such as `memo`), on a plate, centred at `at`. */
  tag?: { text: string; at: Point }
  data?: Record<string, string | number>
}

export type BoxLabel = {
  x: number
  /** The baseline. */
  y: number
  text: string
  anchor: 'start' | 'middle' | 'end'
  /** `note` secondary ink (mono 12), `muted` (mono 12), `result` amber (mono 12), `tag` a pill around the text (a ref). */
  tone: 'note' | 'muted' | 'result' | 'tag'
  /** A tag drawn with the panel's mark (the ref that moved). */
  mark?: boolean
  /** A tag drawn dashed (a reflog entry: not a ref). */
  dashed?: boolean
  part: string
  for?: string
}

/** A key line under the heading: line samples with their meaning. */
export type BoxKey = { sample: 'solid' | 'dashed'; text: string }

export type BoxesPanel = {
  kind: 'boxes'
  id: string
  heading: string
  width: number
  height: number
  keys: BoxKey[]
  nodes: BoxNode[]
  edges: BoxEdge[]
  labels: BoxLabel[]
  notes: string[]
  notesTop: number
}

export const BOX = {
  /** Node heights: one line, two lines; an outline row. */
  h1: 28,
  h2: 40,
  row: 22,
  pad: 8,
  circle: 11,
  /** A tag pill: its height and its text inset. */
  tagH: 16,
  tagPad: 4,
  /** Gap between a key's line sample and its words, and between keys. */
  keySample: 18,
  keyGap: 14,
  corner: 6,
} as const

export const valueW = (t: string) => monoWidth(t, SIZE.value)
export const smallW = (t: string) => monoWidth(t, SIZE.small)

/** A node's width for its lines. */
export const nodeW = (lines: readonly string[]) => Math.ceil(Math.max(...lines.map((l, i) => (i ? smallW(l) : valueW(l))))) + 2 * BOX.pad
export const nodeH = (lines: readonly string[]) => (lines.length > 1 ? BOX.h1 + (lines.length - 1) * 12 : BOX.h1)

/** The drawing's first y below the heading and the key line. */
export const bodyTop = (keys: readonly BoxKey[]) => HEAD + (keys.length ? SIZE.line + 4 : 0) + 4

/** A node's anchor on a side (t from 0 to 1 along that side, default the middle). */
export function port(n: Pick<BoxNode, 'x' | 'y' | 'w' | 'h' | 'shape'>, side: 'top' | 'bottom' | 'left' | 'right', t = 0.5): Point {
  if (n.shape === 'circle') {
    const r = n.h / 2
    const c = { x: n.x + n.w / 2, y: n.y + n.h / 2 }
    return side === 'top' ? { x: c.x, y: c.y - r } : side === 'bottom' ? { x: c.x, y: c.y + r } : side === 'left' ? { x: c.x - r, y: c.y } : { x: c.x + r, y: c.y }
  }
  if (side === 'top') return { x: n.x + n.w * t, y: n.y }
  if (side === 'bottom') return { x: n.x + n.w * t, y: n.y + n.h }
  if (side === 'left') return { x: n.x, y: n.y + n.h * t }
  return { x: n.x + n.w, y: n.y + n.h * t }
}

/** Where the segment from `from` toward a circle's centre meets its rim. */
export function rim(c: Point, r: number, from: Point): Point {
  const dx = from.x - c.x
  const dy = from.y - c.y
  const len = Math.hypot(dx, dy) || 1
  return { x: c.x + (dx / len) * r, y: c.y + (dy / len) * r }
}

/** A tag pill's box for its text, centred on `at`. */
export function tagBox(text: string, at: Point): Rect {
  const w = Math.ceil(smallW(text)) + 2 * BOX.tagPad
  return { x: at.x - w / 2, y: at.y - BOX.tagH / 2, w, h: BOX.tagH }
}

/** The box a label's text takes (a tag's pill included). */
export function labelBox(l: BoxLabel): Rect {
  const w = Math.ceil(smallW(l.text)) + (l.tone === 'tag' ? 2 * BOX.tagPad : 0)
  const x = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2
  return l.tone === 'tag' ? { x, y: l.y - 12, w, h: BOX.tagH } : { x, y: l.y - 10, w, h: 13 }
}

/** The box a node's text takes. */
export function textBox(n: BoxNode): Rect {
  const w = Math.max(...n.lines.map((l, i) => (i || n.small ? smallW(l) : valueW(l))))
  const h = n.lines.length > 1 ? 13 + (n.lines.length - 1) * 12 : 13
  const x = n.align === 'start' ? n.x + (n.shape === 'row' ? 0 : BOX.pad) : n.x + n.w / 2 - w / 2
  return { x, y: n.y + n.h / 2 - h / 2, w, h }
}

/** Notes and height for a panel whose drawing ends at `drawBottom`. */
export function finish(p: Omit<BoxesPanel, 'height' | 'notesTop' | 'width'> & { width?: number }, drawBottom: number): BoxesPanel {
  const notesTop = drawBottom + SIZE.notesGap - 6
  return { ...p, width: p.width ?? W, notesTop, height: notesTop + p.notes.length * SIZE.line + 4 }
}

/** The rectangle a node draws (a circle's bounding box). */
const nodeRect = (n: BoxNode): Rect => ({ x: n.x, y: n.y, w: n.w, h: n.h })

/** A segment's distance from a point. */
function segDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Does the segment pass through the rectangle (shrunk by `inset`)? */
function segHitsRect(a: Point, b: Point, r: Rect, inset: number): boolean {
  const x0 = r.x + inset
  const x1 = r.x + r.w - inset
  const y0 = r.y + inset
  const y1 = r.y + r.h - inset
  if (x1 <= x0 || y1 <= y0) return false
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    if (x > x0 && x < x1 && y > y0 && y < y1) return true
  }
  return false
}

/**
 * Layout problems of a finished panel: anything outside the panel, text
 * over text or over another node, an edge that does not end on its nodes
 * or runs through a node it does not join, a tag off its line.
 */
export function checkBoxes(p: BoxesPanel): string[] {
  const out: string[] = []
  const frame: Rect = { x: 0, y: 0, w: p.width, h: p.height }
  const byId = new Map(p.nodes.map((n) => [n.id, n]))
  const texts: { what: string; r: Rect; owner?: string }[] = []
  p.notes.forEach((t, i) => {
    if (smallW(t) > p.width + 0.5) out.push(`${p.id}: note ${i + 1} is wider than the panel`)
  })
  if (smallW(p.heading) > p.width + 0.5) out.push(`${p.id}: the heading is wider than the panel`)
  for (const n of p.nodes) {
    if (!contains(frame, nodeRect(n), 0.5)) out.push(`${p.id}: node ${n.id} is outside the panel`)
    const t = textBox(n)
    if (n.shape === 'row' && (n.x - 4 < -0.5 || n.x + n.w + 6 > p.width + 0.5)) out.push(`${p.id}: the box of row ${n.id} leaves the panel`)
    if (n.shape !== 'row' && !contains(nodeRect(n), t, 1)) out.push(`${p.id}: the text of ${n.id} leaves its node`)
    if (!contains(frame, t, 0.5)) out.push(`${p.id}: the text of ${n.id} leaves the panel`)
    texts.push({ what: `node ${n.id}`, r: n.shape === 'row' ? t : nodeRect(n), owner: n.id })
  }
  for (const l of p.labels) {
    const r = labelBox(l)
    if (!contains(frame, r, 0.5)) out.push(`${p.id}: label "${l.text}" leaves the panel`)
    texts.push({ what: `label "${l.text}"`, r, owner: l.for })
  }
  for (const e of p.edges)
    if (e.tag) {
      const r = tagBox(e.tag.text, e.tag.at)
      if (!contains(frame, r, 0.5)) out.push(`${p.id}: tag "${e.tag.text}" leaves the panel`)
      texts.push({ what: `tag "${e.tag.text}"`, r, owner: e.id })
      const onLine = e.points.slice(1).some((b, i) => segDist(e.tag!.at, e.points[i], b) < 1)
      if (!onLine) out.push(`${p.id}: tag "${e.tag.text}" is off its edge ${e.id}`)
    }
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i]
      const b = texts[j]
      if (a.owner && (a.owner === b.owner || a.owner === b.what.replace(/^node /, '') || b.owner === a.what.replace(/^node /, ''))) continue
      if (intersects(a.r, b.r, -0.5)) out.push(`${p.id}: ${a.what} overlaps ${b.what}`)
    }
  for (const e of p.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) {
      out.push(`${p.id}: edge ${e.id} joins a missing node`)
      continue
    }
    const first = e.points[0]
    const last = e.points[e.points.length - 1]
    const onBorder = (n: BoxNode, q: Point) => {
      if (n.shape === 'circle') return Math.abs(Math.hypot(q.x - (n.x + n.w / 2), q.y - (n.y + n.h / 2)) - n.h / 2) < 1.5
      if (n.shape === 'row') {
        const t = textBox(n)
        return q.x >= t.x - 12 && q.x <= t.x + t.w + 12 && Math.abs(q.y - (n.y + n.h / 2)) <= n.h / 2 + 0.5
      }
      const inX = q.x >= n.x - 0.5 && q.x <= n.x + n.w + 0.5
      const inY = q.y >= n.y - 0.5 && q.y <= n.y + n.h + 0.5
      const edgeX = Math.abs(q.x - n.x) < 0.75 || Math.abs(q.x - n.x - n.w) < 0.75
      const edgeY = Math.abs(q.y - n.y) < 0.75 || Math.abs(q.y - n.y - n.h) < 0.75
      return (inX && edgeY) || (inY && edgeX)
    }
    if (!onBorder(a, first)) out.push(`${p.id}: edge ${e.id} does not start on ${a.id}`)
    if (!onBorder(b, last)) out.push(`${p.id}: edge ${e.id} does not end on ${b.id}`)
    for (const n of p.nodes) {
      if (n.id === e.from || n.id === e.to) continue
      const r = n.shape === 'row' ? textBox(n) : nodeRect(n)
      if (e.points.slice(1).some((q, i) => segHitsRect(e.points[i], q, r, 1))) out.push(`${p.id}: edge ${e.id} runs through ${n.id}`)
    }
    for (const t of texts) {
      if (t.owner === e.id || t.owner === e.from || t.owner === e.to || t.what === `node ${e.from}` || t.what === `node ${e.to}`) continue
      if (t.what.startsWith('node ')) continue
      if (e.points.slice(1).some((q, i) => segHitsRect(e.points[i], q, t.r, 0))) out.push(`${p.id}: edge ${e.id} crosses ${t.what}`)
    }
    // The head must fit on the last segment.
    const pen = e.points[e.points.length - 2]
    if (e.head !== false && Math.hypot(last.x - pen.x, last.y - pen.y) < ARROW_HEAD.length + 1) out.push(`${p.id}: edge ${e.id}'s last segment is shorter than its head`)
  }
  return out
}
