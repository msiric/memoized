/**
 * BoxArrow geometry (spec §6.1 substrates): the pure half of every
 * box-and-arrow diagram (environment records, prototype graphs, heap graphs).
 *
 * Everything here is deterministic arithmetic on data, so the same layout
 * runs on the server, in tests and in the browser, and a diagram never needs
 * client JavaScript to measure itself. Text widths come from the shared
 * width model (`text-metrics.ts`): monospace advance for Latin, 1 em for CJK,
 * 1.25 em for emoji, so wide scripts fit their cells (VIZ-H A6).
 */

import { MONO_ADVANCE, monoWidth, wrapByWidth } from './text-metrics'

export { MONO_ADVANCE }

export function textWidth(text: string, size: number): number {
  return monoWidth(text, size)
}

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }

export const right = (r: Rect) => r.x + r.w
export const bottom = (r: Rect) => r.y + r.h
export const centerX = (r: Rect) => r.x + r.w / 2

export function intersects(a: Rect, b: Rect, pad = 0): boolean {
  return (
    a.x < b.x + b.w + pad &&
    b.x < a.x + a.w + pad &&
    a.y < b.y + b.h + pad &&
    b.y < a.y + a.h + pad
  )
}

export function contains(outer: Rect, inner: Rect, tolerance = 0.5): boolean {
  return (
    inner.x >= outer.x - tolerance &&
    inner.y >= outer.y - tolerance &&
    right(inner) <= right(outer) + tolerance &&
    bottom(inner) <= bottom(outer) + tolerance
  )
}

/** An axis-aligned segment of an orthogonal route. */
export type Segment = { a: Point; b: Point }

export function segments(points: Point[]): Segment[] {
  const out: Segment[] = []
  for (let i = 1; i < points.length; i++)
    out.push({ a: points[i - 1], b: points[i] })
  return out
}

export function segmentBox(s: Segment, pad = 0): Rect {
  const x = Math.min(s.a.x, s.b.x)
  const y = Math.min(s.a.y, s.b.y)
  return {
    x: x - pad,
    y: y - pad,
    w: Math.abs(s.a.x - s.b.x) + 2 * pad,
    h: Math.abs(s.a.y - s.b.y) + 2 * pad,
  }
}

/**
 * Two axis-aligned segments cross when one is horizontal, the other vertical
 * and each passes strictly through the other's span. Shared endpoints and
 * collinear overlaps (two arrows joining one lane) are not crossings.
 */
export function crosses(s: Segment, t: Segment): boolean {
  const sh = s.a.y === s.b.y
  const th = t.a.y === t.b.y
  if (sh === th) return false
  const [h, v] = sh ? [s, t] : [t, s]
  const hx0 = Math.min(h.a.x, h.b.x)
  const hx1 = Math.max(h.a.x, h.b.x)
  const vy0 = Math.min(v.a.y, v.b.y)
  const vy1 = Math.max(v.a.y, v.b.y)
  const eps = 0.5
  return (
    v.a.x > hx0 + eps &&
    v.a.x < hx1 - eps &&
    h.a.y > vy0 + eps &&
    h.a.y < vy1 - eps
  )
}

/** Drop repeated and collinear interior points, so a route is its corners only. */
export function simplify(points: Point[]): Point[] {
  const out: Point[] = []
  for (const p of points) {
    const last = out[out.length - 1]
    if (last && last.x === p.x && last.y === p.y) continue
    out.push(p)
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1]
    const b = out[i]
    const c = out[i + 1]
    if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y))
      out.splice(i, 1)
  }
  return out
}

const r1 = (n: number) => Math.round(n * 10) / 10

/**
 * SVG path data for an orthogonal route with rounded corners (spec §2.2:
 * 8 px corners), shortened at the end by `inset` so the arrowhead, drawn
 * separately, sits on the target edge.
 */
export function routePath(points: Point[], corner = 8, inset = 0): string {
  const pts = simplify(points).map((p) => ({ ...p }))
  if (pts.length < 2) return ''
  if (inset > 0) {
    const a = pts[pts.length - 2]
    const b = pts[pts.length - 1]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const k = Math.max(0, len - inset) / (len || 1)
    pts[pts.length - 1] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
  }
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1]
    const p = pts[i]
    const next = pts[i + 1]
    const inLen = Math.hypot(p.x - prev.x, p.y - prev.y)
    const outLen = Math.hypot(next.x - p.x, next.y - p.y)
    const r = Math.min(corner, inLen / 2, outLen / 2)
    const ux = Math.sign(p.x - prev.x)
    const uy = Math.sign(p.y - prev.y)
    const vx = Math.sign(next.x - p.x)
    const vy = Math.sign(next.y - p.y)
    d += `L${r1(p.x - ux * r)} ${r1(p.y - uy * r)}Q${r1(p.x)} ${r1(p.y)} ${r1(p.x + vx * r)} ${r1(p.y + vy * r)}`
  }
  const last = pts[pts.length - 1]
  d += `L${r1(last.x)} ${r1(last.y)}`
  return d
}

export const ARROW_HEAD = { length: 7, halfWidth: 4 } as const

/** A filled arrowhead (6 to 7 px) whose tip is the last point of the route. */
export function arrowHead(points: Point[]): string {
  const pts = simplify(points)
  const tip = pts[pts.length - 1]
  const from = pts[pts.length - 2]
  const dx = Math.sign(tip.x - from.x)
  const dy = Math.sign(tip.y - from.y)
  const { length: l, halfWidth: w } = ARROW_HEAD
  const bx = tip.x - dx * l
  const by = tip.y - dy * l
  return `M${r1(tip.x)} ${r1(tip.y)}L${r1(bx - dy * w)} ${r1(by + dx * w)}L${r1(bx + dy * w)} ${r1(by - dx * w)}Z`
}

/** Greedy word wrap by measured width (monospace model). */
export function wrapMono(text: string, maxWidth: number, size: number): string[] {
  return wrapByWidth(text, maxWidth, (t) => textWidth(t, size))
}
