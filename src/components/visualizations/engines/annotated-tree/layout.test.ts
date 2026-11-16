// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { intersects, type Rect } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { staticFootprints } from '../../shell/static-footprint'
import { annotatedTreeDescriptor } from './descriptor'
import {
  GAIN,
  HEAD,
  LABEL_LINE,
  SIZE,
  SUFFIX,
  TRIE,
  layoutGain,
  layoutSuffix,
  layoutTree,
  layoutTrie,
} from './layout'
import type { GainPanel, SuffixPanel, TreePanel, TriePanel } from './model'

/**
 * Every annotated-tree panel is laid out from data, so its collisions are
 * checkable without a browser: each text run fits its svg at the default
 * size (mono advance, an upper bound), boxes never overlap, a label never
 * sits on a box or another label, an edge label clears its edge, and every
 * reserved height is a whole pixel.
 */

const small = (t: string) => monoWidth(t, SIZE.small)
const value = (t: string) => monoWidth(t, SIZE.value)
/** A text run's box from its baseline: 12 px type rises about 10 px and drops 3. */
const run = (x: number, base: number, w: number, anchor: 'start' | 'middle' | 'end' = 'start', size: number = SIZE.small): Rect => ({
  x: anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w,
  y: base - size * 0.8,
  w,
  h: size,
})
const inside = (r: Rect, width: number) => r.x >= -0.5 && r.x + r.w <= width + 0.5

const presets = annotatedTreeDescriptor.presets
const panels: [string, TreePanel][] = presets.flatMap((p) => p.data.panels.map((x) => [`${p.id}/${x.id}`, x] as [string, TreePanel]))

function headingRuns(p: TreePanel, width: number): Rect[] {
  return [run(0, 14, small(p.heading))].map((r) => {
    expect(inside(r, width), `heading "${p.heading}" fits`).toBe(true)
    return r
  })
}

function gainRuns(p: GainPanel, room: number, legend: number) {
  const g = layoutGain(p, room, legend)
  const texts: Rect[] = [...headingRuns(p, g.width)]
  p.legend.forEach((l, i) => texts.push(run(0, 14 + (i + 1) * SIZE.line, small(l))))
  p.notes.forEach((l, i) => texts.push(run(0, g.notesTop + i * SIZE.line + 12, small(l))))
  const boxes = Object.values(g.boxes) as Rect[]
  const labels = g.edges.map((e) => {
    const w = Math.max(...e.label.lines.map(small))
    return { e, r: { x: e.label.anchor === 'end' ? e.label.x - w : e.label.x, y: e.label.y, w, h: e.label.lines.length * LABEL_LINE } }
  })
  return { g, texts, boxes, labels }
}

describe('annotated-tree layout', () => {
  it('reserves whole pixels: every stage height and footprint', () => {
    for (const p of presets) {
      const s = layoutTree(p.data)
      expect(Number.isInteger(s.height.narrow) && Number.isInteger(s.height.wide), p.id).toBe(true)
      for (const b of s.blocks) expect(Number.isInteger(b.narrow) && Number.isInteger(b.wide), p.id).toBe(true)
      for (const h of staticFootprints(annotatedTreeDescriptor)[p.id]) expect(Number.isInteger(h), p.id).toBe(true)
    }
  })

  it.each(panels.filter(([, p]) => p.kind === 'gain'))('%s: boxes apart, labels clear of boxes, edges and each other, text inside', (_, p) => {
    const preset = presets.find((x) => x.data.panels.includes(p))!
    const scene = layoutTree(preset.data)
    const { g, texts, boxes, labels } = gainRuns(p as GainPanel, scene.gainRoom, scene.gainLegend)
    for (const t of texts) expect(inside(t, g.width)).toBe(true)
    for (const b of boxes) expect(inside(b, g.width), 'box inside').toBe(true)
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) expect(intersects(boxes[i], boxes[j], GAIN.sep - 1), 'boxes overlap').toBe(false)
    for (const { e, r } of labels) {
      expect(inside(r, g.width), `label ${e.label.lines.join(' ')} inside`).toBe(true)
      for (const b of boxes) expect(intersects(r, b, 1), `label ${e.label.lines.join(' ')} on a box`).toBe(false)
      for (const t of texts) expect(intersects(r, t), `label ${e.label.lines.join(' ')} on text`).toBe(false)
      // The label's near corners stay on their side of every edge at their height.
      for (const f of g.edges) {
        for (const y of [r.y, r.y + r.h]) {
          if (y < f.y1 || y > f.y2) continue
          const x = f.x1 + ((f.x2 - f.x1) * (y - f.y1)) / (f.y2 - f.y1)
          expect(x > r.x + 0.5 && x < r.x + r.w - 0.5, `label ${e.label.lines.join(' ')} crosses the edge to ${f.to}`).toBe(false)
        }
      }
    }
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) expect(intersects(labels[i].r, labels[j].r, 2), 'labels overlap').toBe(false)
    // Value and through fit their cells.
    for (const b of Object.values(g.boxes)) {
      const n = (p as GainPanel).nodes[b.id]
      expect(value(String(n.value)) + 2 * GAIN.cellPad).toBeLessThanOrEqual(b.valueW + 0.5)
      expect(value(String(n.through)) + 2 * GAIN.cellPad).toBeLessThanOrEqual(b.w - b.valueW + 0.5)
    }
  })

  it.each(panels.filter(([, p]) => p.kind === 'trie'))('%s: nodes, END labels and results inside, labels apart', (_, p) => {
    const preset = presets.find((x) => x.data.panels.includes(p))!
    const t = p as TriePanel
    const g = layoutTrie(t, layoutTree(preset.data).trieRows)
    const texts = [...headingRuns(t, g.width)]
    for (const n of t.nodes) {
      const a = g.at[n.id]
      const r = TRIE.r + TRIE.ring
      expect(a.x - r >= 0 && a.x + r <= g.width, `${n.id} inside`).toBe(true)
      const label = n.mark === 'cleared' ? 'END cleared' : n.end && n.mark !== 'pruned' ? 'END' : null
      if (label) texts.push(run(a.x, a.y + TRIE.labelDy, small(label), 'middle'))
    }
    t.results.forEach((r, i) => {
      const text = `${r.call}${r.value !== undefined ? ` → ${r.value} ` : r.call ? ': ' : ''}${r.note ?? ''}`
      texts.push(run(0, g.resultsTop + i * SIZE.line + 12, small(text)))
    })
    for (const x of texts) expect(inside(x, g.width), 'text inside').toBe(true)
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) expect(intersects(texts[i], texts[j], 2), 'texts overlap').toBe(false)
    // An END label sits between its node and the next row's ring.
    expect(TRIE.labelDy + 3 < TRIE.rowPitch - TRIE.r - TRIE.ring).toBe(true)
  })

  it.each(panels.filter(([, p]) => p.kind === 'suffix'))('%s: both variants: edge labels apart and clear of nodes, the table inside', (_, p) => {
    const s = p as SuffixPanel
    for (const variant of ['narrow', 'wide'] as const) {
      const g = layoutSuffix(s, variant)
      const texts = [...headingRuns(s, g.width)]
      s.notes.forEach((l, i) => texts.push(run(0, g.notesTop + i * SIZE.line + 12, small(l))))
      const nodes: Rect[] = s.nodes.map((n) => {
        const a = g.at[n.id]
        const h = n.leaf !== undefined ? SUFFIX.leaf.h : n.parent === null ? 2 * SUFFIX.root : SUFFIX.pill
        return { x: a.x - a.w / 2, y: a.y - h / 2, w: a.w, h }
      })
      const labels: Rect[] = []
      for (const e of g.edges) {
        const n = s.nodes.find((x) => x.id === e.to)!
        const up = run(e.label.x, e.label.y + SUFFIX.above, value(n.edge!.text), 'middle', SIZE.value)
        const down = run(e.label.x, e.label.y + SUFFIX.below, small(`[${n.edge!.start},${n.edge!.end}]`), 'middle')
        // The labels sit on the edge's last run, between where it turns (or leaves its parent) and its child.
        const last = e.points[e.points.length - 1]
        const from = e.points[e.points.length - 2]
        for (const r of [up, down]) {
          expect(r.x >= from.x - 0.5 && r.x + r.w <= last.x + 0.5, `${variant} ${e.to}: label within its run`).toBe(true)
          labels.push(r)
        }
      }
      for (const l of labels) for (const n of nodes) expect(intersects(l, n), `${variant}: label on a node`).toBe(false)
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) expect(intersects(labels[i], labels[j], 1), `${variant}: labels overlap`).toBe(false)
      for (const r of [...texts, ...labels, ...nodes]) expect(inside(r, g.width), `${variant}: inside`).toBe(true)
      expect(g.cols.lcp).toBeLessThanOrEqual(g.width)
      expect(HEAD).toBeLessThan(g.headerY)
      if (g.cols.suffix !== undefined)
        for (const row of s.rows) expect(g.cols.suffix + value(row.suffix)).toBeLessThan(g.cols.lcp - SUFFIX.leaf.w)
    }
  })
})
