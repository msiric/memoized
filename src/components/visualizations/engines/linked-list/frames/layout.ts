import { arrowHead, routePath, type Point } from '../../../substrates/box-arrow'
import { monoWidth } from '../../../substrates/text-metrics'
import type { PerVariant } from '../../../shell/types'
import { SIZE, W, layoutList, tagWidth, type ListGeometry } from '../geometry'
import type { FramePanel, FramesData, RhoPanel, RowPanel } from './model'

/**
 * Frame geometry: every panel is a heading (mono 13 on a 20 px line), a
 * drawing and, for the rho, the recorded pairs under it. Row panels share
 * one list geometry (the step engine's), so the strip's columns and lanes
 * line up from pass to pass. Narrow stacks the panels; wide sets them two to
 * a row (2 x 288 + 16 fits the 606 px stage at 768). Heights are fixed per
 * variant.
 */

export const FRAME_G = {
  /** The panel heading and the pairs line, drawn in the panel's svg (they scale with it under large text). */
  heading: 20,
  headingGap: 4,
  pairs: 20,
  pairsGap: 4,
  panelGap: 16,
  columnGap: 16,
  footnote: 20,
  footnoteGap: 12,
} as const

export const RHO = {
  /** Centre to centre, across and down: the square's inside holds `c = 4`. */
  pitch: 68,
  /** Room over the top row for the distance labels and the entry label. */
  top: 30,
  labelBase: 12,
  dimY: 22,
  tick: 4,
} as const

export type RhoGeometry = {
  width: number
  height: number
  pos: Record<number, { x: number; y: number }>
  rowTop: [number, number]
  /** Where the drawing starts (under the heading). */
  dy: number
}

/** The rho: the tail along the top row into the cycle's top-left corner, the cycle clockwise round a square. */
export function layoutRho(p: RhoPanel, dy = 0): RhoGeometry {
  const { tail, cycle } = p.rho
  if (cycle.length !== 4) throw new Error('linked-list frames: the rho layout draws a four-node cycle')
  const half = SIZE.node / 2
  const x0 = half + 2
  const pos: RhoGeometry['pos'] = {}
  const top0 = RHO.top + dy
  const top1 = top0 + RHO.pitch
  tail.forEach((n, i) => (pos[n] = { x: x0 + i * RHO.pitch, y: top0 + half }))
  const cx = x0 + tail.length * RHO.pitch
  const corners = [
    { x: cx, y: top0 + half },
    { x: cx + RHO.pitch, y: top0 + half },
    { x: cx + RHO.pitch, y: top1 + half },
    { x: cx, y: top1 + half },
  ]
  cycle.forEach((n, i) => (pos[n] = corners[i]))
  // Tags stack under their node; the tallest stack sets the height.
  const stacks = new Map<number, number>()
  for (const ptr of p.state.pointers) if (ptr.at !== null) stacks.set(ptr.at, (stacks.get(ptr.at) ?? 0) + 1)
  let bottom = top1 + SIZE.node
  for (const [n, k] of stacks) bottom = Math.max(bottom, pos[n].y + half + SIZE.bandGap + k * SIZE.lane - (SIZE.lane - SIZE.tag))
  return { width: W, height: Math.ceil(bottom), pos, rowTop: [top0, top1], dy }
}

/** A straight arrow between two rho nodes (neighbours on the grid). */
export function rhoLink(g: RhoGeometry, from: number, to: number): { d: string; head: string } {
  const a = g.pos[from]
  const b = g.pos[to]
  const half = SIZE.node / 2 + SIZE.inset
  const dx = Math.sign(b.x - a.x)
  const dy = Math.sign(b.y - a.y)
  const pts: Point[] = [
    { x: a.x + dx * half, y: a.y + dy * half },
    { x: b.x - dx * half, y: b.y - dy * half },
  ]
  return { d: routePath(pts, 6, 6), head: arrowHead(pts) }
}

/** Tag boxes under each node of the rho, in the panel's pointer order. */
export function rhoTags(g: RhoGeometry, p: RhoPanel) {
  const seen = new Map<number, number>()
  return p.state.pointers
    .filter((ptr) => ptr.at !== null)
    .map((ptr) => {
      const k = seen.get(ptr.at!) ?? 0
      seen.set(ptr.at!, k + 1)
      const w = tagWidth(ptr.name)
      const c = g.pos[ptr.at!]
      return { name: ptr.name, at: ptr.at!, x: Math.max(0, Math.min(g.width - w, c.x - w / 2)), y: c.y + SIZE.node / 2 + SIZE.bandGap + k * SIZE.lane, w, h: SIZE.tag }
    })
}

export const labelWidth = (t: string) => Math.ceil(monoWidth(t, SIZE.small))

/** The step engine's list geometry moved down by `dy` (under the panel heading). */
export function shiftList(g: ListGeometry, dy: number): ListGeometry {
  return {
    ...g,
    height: g.height + dy,
    rowTop: g.rowTop + dy,
    mid: g.mid + dy,
    lanes: Object.fromEntries(Object.entries(g.lanes).map(([k, l]) => [k, { ...l, y: l.y + dy }])),
    consoleTop: g.consoleTop === null ? null : g.consoleTop + dy,
  }
}

export const HEAD = FRAME_G.heading + FRAME_G.headingGap
export const PAIRS = FRAME_G.pairsGap + FRAME_G.pairs

export type FramesScene = {
  row?: ListGeometry
  rho: Record<string, RhoGeometry>
  /** Each panel's block height (heading, drawing, pairs). */
  blocks: number[]
  height: PerVariant<number>
}

function rowPanels(d: FramesData) {
  return d.panels.filter((p): p is RowPanel => p.kind === 'row')
}

export function layoutFrames(d: FramesData): FramesScene {
  const rows = rowPanels(d)
  const row = rows.length ? shiftList(layoutList(rows.map((p) => p.state)), HEAD) : undefined
  const rho: Record<string, RhoGeometry> = {}
  const blocks = d.panels.map((p: FramePanel) => {
    if (p.kind === 'row') return row!.height
    const g = layoutRho(p, HEAD)
    rho[p.id] = { ...g, height: g.height + PAIRS }
    return g.height + PAIRS
  })
  const foot = d.footnote ? FRAME_G.footnoteGap + FRAME_G.footnote : 0
  const narrow = blocks.reduce((s, h) => s + h, 0) + (blocks.length - 1) * FRAME_G.panelGap + foot
  let wide = 0
  for (let i = 0; i < blocks.length; i += 2) wide += Math.max(blocks[i], blocks[i + 1] ?? 0) + (i ? FRAME_G.panelGap : 0)
  return { row, rho, blocks, height: { narrow, wide: wide + foot } }
}
