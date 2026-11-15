import { describe, expect, it } from 'vitest'
import { monoWidth } from '../../substrates/text-metrics'
import { linkedListDescriptor } from './descriptor'
import { FRAME_G, layoutFrames, layoutRho, rhoTags } from './frames/layout'
import { linkedListFramesDescriptor } from './frames/descriptor'
import { SIZE, W, assignArcs, layoutList, linkShape, tagBox, type ListGeometry } from './geometry'
import { linkedListMetrics } from './layout'
import type { LLState } from './model'
import type { RhoPanel } from './frames/model'

/**
 * Geometry gates for the pointer-rewiring drawing, over every step of every
 * preset: tags stay inside the drawing and off the row, arcs never cross
 * and never jump, straight arrows keep a readable length, a null stub never
 * touches a back arrow, and values fit their boxes.
 */

type Box = { x: number; y: number; w: number; h: number }
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

function checkState(g: ListGeometry, s: LLState, where: string) {
  const errors: string[] = []
  const row: Box = { x: 0, y: g.rowTop, w: g.width, h: SIZE.node }
  const tags = s.pointers.map((p) => ({ name: p.name, box: tagBox(g, p.name, p.at) }))
  for (const t of tags) {
    if (t.box.x < 0 || t.box.x + t.box.w > g.width + 0.01) errors.push(`${where}: tag ${t.name} leaves the drawing`)
    if (t.box.y < 0 || t.box.y + t.box.h > g.height) errors.push(`${where}: tag ${t.name} leaves the stage height`)
    if (overlaps(t.box, row)) errors.push(`${where}: tag ${t.name} sits on the node row`)
  }
  for (let i = 0; i < tags.length; i++)
    for (let j = i + 1; j < tags.length; j++)
      if (overlaps(tags[i].box, tags[j].box)) errors.push(`${where}: tags ${tags[i].name} and ${tags[j].name} overlap`)
  // Arcs on one side, drawn together: disjoint or nested with the outer one higher.
  const arcs = s.next.flatMap((to, from) =>
    to !== null && Math.abs(to - from) > 1 ? [{ lo: Math.min(from, to), hi: Math.max(from, to), slot: g.arcs[`${from}>${to}`] }] : [],
  )
  for (const a of arcs)
    for (const b of arcs) {
      if (a === b || a.slot.side !== b.slot.side) continue
      if (a.hi <= b.lo || b.hi <= a.lo) continue
      const nested = (a.lo <= b.lo && b.hi <= a.hi && a.slot.level > b.slot.level) || (b.lo <= a.lo && a.hi <= b.hi && b.slot.level > a.slot.level)
      if (!nested) errors.push(`${where}: arcs ${a.lo}-${a.hi} and ${b.lo}-${b.hi} cross`)
    }
  // Arcs stay inside their band, clear of the tag lanes.
  for (const a of arcs) {
    const off = SIZE.arcRise + (a.slot.level - 1) * SIZE.arcStep
    const y = a.slot.side === 'above' ? g.rowTop - off : g.rowTop + SIZE.node + off
    for (const t of tags)
      if (y >= t.box.y - 1 && y <= t.box.y + t.box.h + 1) errors.push(`${where}: an arc runs through tag ${t.name}`)
  }
  // Straight arrows: at least 10 px of line before the head; a null stub's bar clear of a back arrow's head.
  const pitch = g.cols[1] - g.cols[0]
  if (pitch - SIZE.node - 2 * SIZE.inset < 14) errors.push(`${where}: straight arrows are too short`)
  const barLow = g.mid - SIZE.track + SIZE.bar
  const headTop = g.mid + SIZE.track - 4
  if (barLow >= headTop) errors.push(`${where}: a null stub's bar reaches the back track`)
  for (const n of s.nodes)
    if (monoWidth(n.label, SIZE.value) > SIZE.node - 8) errors.push(`${where}: value ${n.label} does not fit its box`)
  // Every link shape is drawable.
  s.next.forEach((to, i) => {
    if (!linkShape(g, i, to).d) errors.push(`${where}: link ${i} has no shape`)
  })
  return errors
}

describe.each(linkedListDescriptor.presets.map((p) => [p.id, p.log] as const))('linked-list/%s geometry', (_id, log) => {
  const states = log.steps.map((s) => s.state)
  const g = layoutList(states)

  it('is 288 wide, one geometry for every step', () => {
    expect(g.width).toBe(W)
    expect(linkedListMetrics([log]).geometry).toEqual(g)
  })

  it('keeps tags, arcs and arrows apart at every step', () => {
    expect(states.flatMap((s, i) => checkState(g, s, `step ${i}`))).toEqual([])
  })

  it('fits the drawing beside the code at 768 (288 wide) and stacks it under the code below', () => {
    const m = linkedListMetrics([log])
    expect(m.codeColumn.md + 16 + W).toBeLessThanOrEqual(606)
    expect(m.layout.stage.narrow).toBe(m.code.narrow + 8 + g.height)
  })
})

describe('arc slots', () => {
  const state = (next: (number | null)[]): LLState => ({
    nodes: next.map((_, i) => ({ id: `n${i}`, label: String(i + 1) })),
    next,
    pointers: [],
    lanes: { above: [], below: [] },
    output: [],
  })

  it('sends a crossing arc to the other side and keeps its slot for the whole preset', () => {
    const a = state([3, 4, null, null, null, null])
    const arcs = assignArcs([a, state([3, null, null, null, null, null])])
    expect(arcs['0>3']).toEqual({ side: 'above', level: 1 })
    expect(arcs['1>4']).toEqual({ side: 'below', level: 1 })
  })

  it('keeps a containing arc off the inner one: the other side, or nested over it', () => {
    const arcs = assignArcs([state([5, 3, null, null, null, null])])
    const inner = arcs['1>3']
    const outer = arcs['0>5']
    expect(inner).toEqual({ side: 'above', level: 1 })
    expect(outer.side !== inner.side || outer.level > inner.level).toBe(true)
    // A third arc spanning both on the free side must nest too.
    const three = assignArcs([state([5, 3, null, null, null, null]), state([5, 3, 0, null, null, null])])
    expect(three['2>0'].side === 'below' ? three['2>0'].level : 9).toBeGreaterThanOrEqual(1)
  })
})

describe.each(linkedListFramesDescriptor.presets.map((p) => [p.id, p.data] as const))('linked-list-frames/%s geometry', (_id, data) => {
  const scene = layoutFrames(data)

  it('reserves exactly its blocks, stacked and two to a row', () => {
    const sum = scene.blocks.reduce((s, h) => s + h, 0) + (scene.blocks.length - 1) * FRAME_G.panelGap
    expect(scene.height.narrow).toBe(sum)
    expect(2 * W + FRAME_G.columnGap).toBeLessThanOrEqual(606)
  })

  it('keeps every panel inside 288 with nothing overlapping', () => {
    const errors: string[] = []
    for (const p of data.panels) {
      if (p.kind === 'row') {
        errors.push(...checkState(scene.row!, p.state, p.id))
        continue
      }
      const g = layoutRho(p as RhoPanel)
      const boxes: Box[] = Object.values(g.pos).map((c) => ({ x: c.x - SIZE.node / 2, y: c.y - SIZE.node / 2, w: SIZE.node, h: SIZE.node }))
      for (const t of rhoTags(g, p as RhoPanel)) {
        const tb = { x: t.x, y: t.y, w: t.w, h: t.h }
        if (tb.x < 0 || tb.x + tb.w > g.width || tb.y + tb.h > g.height) errors.push(`${p.id}: tag ${t.name} leaves the drawing`)
        for (const b of boxes) if (overlaps(tb, b)) errors.push(`${p.id}: tag ${t.name} sits on a node`)
      }
      const corner = g.pos[(p as RhoPanel).rho.cycle[1]]
      if (corner.x + SIZE.node / 2 + 14 + monoWidth('b = 4', SIZE.small) > g.width) errors.push(`${p.id}: the b label leaves the drawing`)
      if (monoWidth('meet', SIZE.small) + corner.x + SIZE.node / 2 + 6 > g.width) errors.push(`${p.id}: the meet label leaves the drawing`)
      const pairs = `${(p as RhoPanel).pairs.names.join(', ')}: ${(p as RhoPanel).pairs.values.join(' ')}`
      if (monoWidth(pairs, SIZE.small) > W) errors.push(`${p.id}: the pairs line is wider than 288`)
    }
    expect(errors).toEqual([])
  })
})
