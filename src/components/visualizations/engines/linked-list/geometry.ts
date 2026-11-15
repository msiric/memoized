import { arrowHead, routePath, type Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import type { LLLanes, LLState } from './model'

/**
 * The linked-list drawing (R4 shared visual 3), pure arithmetic on data so
 * the server, the tests and the browser lay it out alike. One row of nodes
 * in creation order, never moving; a `null` column at the end where a
 * pointer holding null sits; every pointer variable in its own lane above or
 * below the row, so a tag sliding to its new node never crosses another
 * tag; every node's `next` as one arrow:
 *
 * - to the right neighbour: straight, on the upper track of the gap;
 * - to the left neighbour: straight, on the lower track (so a two-node
 *   cycle, 1 -> 2 and 2 -> 1, reads as two arrows, never one);
 * - further: an arc over (forward) or under (backward) the row, at a level
 *   chosen once for the whole preset, so an arc never jumps between steps
 *   and two arcs never cross;
 * - null: a short stub ending in a bar (the ground symbol), on the upper
 *   track to the right of the node.
 *
 * Every length is px at the default 16 px root (the svg is sized in rem).
 * The drawing is 288 wide: the stage at a 320 px phone and the narrowest
 * column beside the code from 768, so it is drawn 1:1 at the default text
 * size and only scales down under very large text (where 1 px is more).
 */

export const W = 288

export const SIZE = {
  node: 30,
  /** Node value: mono 13 (`type.value`); tags, null and labels mono 12 (`.vz-12`). */
  value: 13,
  small: 12,
  /** A pointer tag: 18 tall, 5 px inline padding, chip radius. */
  tag: 18,
  tagPad: 5,
  /** Lane pitch: the tag plus 4 px between lanes. */
  lane: 22,
  /** Upper and lower tracks: 5 px either side of the row's middle. */
  track: 5,
  /** Gap between a box edge and the start or end of a straight arrow. */
  inset: 2,
  /** Where an arc leaves or enters a box: 6 px off its centre. */
  arcFoot: 6,
  /** First arc level above the row, then one more per level. */
  arcRise: 9,
  arcStep: 9,
  /** Null stub: its length and the bar's half height. */
  stub: 8,
  bar: 4,
  /** Gap between the lanes and the arc band, and above the console row. */
  bandGap: 4,
  consoleGap: 8,
  consoleRow: 20,
} as const

export type Side = 'above' | 'below'
export type ArcSlot = { side: Side; level: number }

export type ListGeometry = {
  width: number
  height: number
  /** Node centres, then the null column's centre. */
  cols: number[]
  nullX: number
  rowTop: number
  mid: number
  lanes: Record<string, { y: number; side: Side }>
  /** Skip arcs by `from>to`, fixed for the preset. */
  arcs: Record<string, ArcSlot>
  /** Console row baseline-box top, when the preset prints. */
  consoleTop: number | null
}

const key = (from: number, to: number) => `${from}>${to}`

export const tagWidth = (name: string) => Math.ceil(monoWidth(name, SIZE.small) + 2 * SIZE.tagPad)

/** A tag's box: centred on its column, kept inside the drawing. */
export function tagBox(g: ListGeometry, name: string, at: number | null): { x: number; y: number; w: number; h: number } {
  const w = tagWidth(name)
  const c = at === null ? g.nullX : g.cols[at]
  const x = Math.max(0, Math.min(g.width - w, c - w / 2))
  return { x: Math.round(x * 10) / 10, y: g.lanes[name].y, w, h: SIZE.tag }
}

/** Every skip link (not to a neighbour, not null) any state holds, with the states it appears in. */
function skips(states: readonly LLState[]) {
  const out = new Map<string, { from: number; to: number; at: Set<number> }>()
  states.forEach((s, k) =>
    s.next.forEach((to, from) => {
      if (to === null || Math.abs(to - from) === 1) return
      const id = key(from, to)
      if (!out.has(id)) out.set(id, { from, to, at: new Set() })
      out.get(id)!.at.add(k)
    }),
  )
  return out
}

/**
 * Arc sides and levels for a whole preset: forward arcs prefer the top,
 * backward the bottom. On one side two arcs that are drawn together must be
 * disjoint (sharing an end node is fine: one leaves right of centre, the
 * other arrives left of it) or nested with the outer one higher; a partial
 * overlap would cross, so the later arc takes the other side.
 */
export function assignArcs(states: readonly LLState[]): Record<string, ArcSlot> {
  // Inner arcs first, so an arc that contains another takes the level over it.
  const all = [...skips(states).entries()].sort(([, a], [, b]) => Math.abs(a.to - a.from) - Math.abs(b.to - b.from))
  const placed: { id: string; lo: number; hi: number; at: Set<number>; slot: ArcSlot }[] = []
  const out: Record<string, ArcSlot> = {}
  for (const [id, e] of all) {
    const lo = Math.min(e.from, e.to)
    const hi = Math.max(e.from, e.to)
    const prefer: Side = e.to > e.from ? 'above' : 'below'
    const sides: Side[] = [prefer, prefer === 'above' ? 'below' : 'above']
    let slot: ArcSlot | null = null
    for (let level = 1; level <= 4 && !slot; level++)
      for (const side of sides) {
        const ok = placed.every((p) => {
          if (p.slot.side !== side || ![...p.at].some((k) => e.at.has(k))) return true
          if (p.hi <= lo || hi <= p.lo) return true
          const pInside = lo <= p.lo && p.hi <= hi
          const eInside = p.lo <= lo && hi <= p.hi
          if (pInside) return level > p.slot.level
          if (eInside) return level < p.slot.level
          return false
        })
        if (ok) {
          slot = { side, level }
          break
        }
      }
    if (!slot) throw new Error(`linked-list: no arc slot for ${id}`)
    placed.push({ id, lo, hi, at: e.at, slot })
    out[id] = slot
  }
  return out
}

const levels = (arcs: Record<string, ArcSlot>, side: Side) =>
  Math.max(0, ...Object.values(arcs).filter((a) => a.side === side).map((a) => a.level))

const band = (n: number) => (n === 0 ? 0 : SIZE.arcRise + (n - 1) * SIZE.arcStep + SIZE.bandGap)

/** The drawing for one preset: every state shares it, so nothing moves but what the step changes. */
export function layoutList(states: readonly LLState[]): ListGeometry {
  const first = states[0]
  const lanes: LLLanes = first.lanes
  const n = first.nodes.length
  const arcs = assignArcs(states)
  const up = levels(arcs, 'above')
  const down = levels(arcs, 'below')
  // Columns: the first box clears the left edge; the null word clears the right.
  const left = SIZE.node / 2 + 2
  const right = Math.ceil(monoWidth('null', SIZE.small) / 2) + 3
  const pitch = (W - left - right) / n
  const cols = Array.from({ length: n }, (_, i) => left + i * pitch)
  const nullX = left + n * pitch

  let y = 0
  const laneOut: ListGeometry['lanes'] = {}
  lanes.above.forEach((name) => {
    laneOut[name] = { y, side: 'above' }
    y += SIZE.lane
  })
  if (lanes.above.length) y += SIZE.bandGap - (SIZE.lane - SIZE.tag)
  y += band(up)
  const rowTop = y
  y += SIZE.node
  y += band(down)
  if (lanes.below.length) y += SIZE.bandGap
  lanes.below.forEach((name, i) => {
    laneOut[name] = { y, side: 'below' }
    y += i === lanes.below.length - 1 ? SIZE.tag : SIZE.lane
  })
  const prints = states.some((s) => s.output.length > 0)
  let consoleTop: number | null = null
  if (prints) {
    y += SIZE.consoleGap
    consoleTop = y
    y += SIZE.consoleRow
  }
  return { width: W, height: Math.ceil(y), cols, nullX, rowTop, mid: rowTop + SIZE.node / 2, lanes: laneOut, arcs, consoleTop }
}

export type LinkShape = { d: string; head: string; kind: 'next' | 'back' | 'arc' | 'null' }

/** The arrow for node `from`'s `next`: straight to a neighbour, an arc further, a grounded stub for null. */
export function linkShape(g: ListGeometry, from: number, to: number | null): LinkShape {
  const half = SIZE.node / 2
  const c = g.cols[from]
  if (to === null) {
    const y = g.mid - SIZE.track
    const x0 = c + half + SIZE.inset
    const x1 = x0 + SIZE.stub
    return { d: `M${x0} ${y}H${x1}M${x1} ${y - SIZE.bar}V${y + SIZE.bar}`, head: '', kind: 'null' }
  }
  const t = g.cols[to]
  if (to === from + 1) {
    const pts: Point[] = [
      { x: c + half + SIZE.inset, y: g.mid - SIZE.track },
      { x: t - half - SIZE.inset, y: g.mid - SIZE.track },
    ]
    return { d: routePath(pts, 6, 7), head: arrowHead(pts), kind: 'next' }
  }
  if (to === from - 1) {
    const pts: Point[] = [
      { x: c - half - SIZE.inset, y: g.mid + SIZE.track },
      { x: t + half + SIZE.inset, y: g.mid + SIZE.track },
    ]
    return { d: routePath(pts, 6, 7), head: arrowHead(pts), kind: 'back' }
  }
  const slot = g.arcs[key(from, to)]
  const dir = Math.sign(to - from)
  const above = slot.side === 'above'
  const edge = above ? g.rowTop : g.rowTop + SIZE.node
  const off = SIZE.arcRise + (slot.level - 1) * SIZE.arcStep
  const level = above ? edge - off : edge + off
  const pts: Point[] = [
    { x: c + dir * SIZE.arcFoot, y: edge },
    { x: c + dir * SIZE.arcFoot, y: level },
    { x: t - dir * SIZE.arcFoot, y: level },
    { x: t - dir * SIZE.arcFoot, y: edge },
  ]
  return { d: routePath(pts, 6, 7), head: arrowHead(pts), kind: 'arc' }
}
