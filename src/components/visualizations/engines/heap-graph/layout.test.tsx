// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HEAP_PRESETS } from '../../__stress__/heap-graph.fixtures'
import { StaticFigure } from '../../shell/StaticFigure'
import { contains, crosses, intersects, segments, textWidth } from '../../substrates/box-arrow'
import { sansWidth } from '../../substrates/text-metrics'
import { CONTAINER } from '../env-records/EnvRecordsStage'
import { heapGraphDescriptor, heapGraphEngineCore } from './descriptor'
import { HeapGraphStage, hitBands } from './HeapGraphStage'
import { HINT, MIN_JOG, SIZE, STAGE, fitColumn, layoutDiagram, placePorts, type PanelScene } from './layout'
import { lintHeapDiagram } from './lint'
import type { HeapDiagram } from './model'
import { pathCss, pathParts, traceable } from './paths'

/**
 * Layout invariants for every preset and every accepted stress fixture, at
 * every variant and width: the picture is computed, so these are the checks
 * a hand layout would get by eye.
 */

const accepted = HEAP_PRESETS.filter((p) => lintHeapDiagram(p.data).length === 0)
const all = [...heapGraphDescriptor.presets, ...accepted]
const cases = all.flatMap((p) => (['narrow', 'wide'] as const).map((v) => [`${p.id} ${v}`, p.data, v] as const))

function problems(scene: PanelScene): string[] {
  const out: string[] = []
  const frame = { x: 0, y: 0, w: scene.width, h: scene.height }
  for (const b of scene.boxes) if (!contains(frame, b.rect)) out.push(`${b.id} outside the panel`)
  for (let i = 0; i < scene.boxes.length; i++)
    for (let j = i + 1; j < scene.boxes.length; j++)
      if (intersects(scene.boxes[i].rect, scene.boxes[j].rect, 7))
        out.push(`${scene.boxes[i].id} and ${scene.boxes[j].id} closer than 8 px`)
  for (const b of scene.boxes) {
    if (b.kind === 'object') {
      if (textWidth(b.title, SIZE.header) > b.rect.w - 2 * SIZE.cellPad) out.push(`${b.id}: header does not fit`)
      for (const r of b.rows) {
        if (textWidth(r.key, SIZE.value) > r.keyWidth - 2 * SIZE.cellPad + 0.5) out.push(`${b.id}.${r.key}: key does not fit`)
        if (r.value !== null && r.keyWidth + textWidth(r.value, SIZE.value) + 2 * SIZE.cellPad > b.rect.w + 0.5)
          out.push(`${b.id}.${r.key}: value does not fit`)
      }
    } else if (b.value === undefined && textWidth(b.title, SIZE.value) > b.rect.w - 2 * SIZE.bindPad + 0.5)
      out.push(`${b.id}: name does not fit`)
  }
  for (const t of scene.texts) {
    if (!contains(frame, t.rect, 1)) out.push(`${t.kind} "${t.text}" outside the panel`)
    for (const b of scene.boxes) if (intersects(t.rect, b.rect)) out.push(`${t.kind} "${t.text}" overlaps ${b.id}`)
  }
  const segs = scene.edges.flatMap((e) => segments(e.points).map((s) => ({ id: e.id, s })))
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segs[i].id !== segs[j].id && crosses(segs[i].s, segs[j].s)) out.push(`${segs[i].id} crosses ${segs[j].id}`)
  for (const e of scene.edges) {
    for (const p of e.points) if (p.x < 0 || p.x > scene.width || p.y < 0 || p.y > scene.height) out.push(`${e.id} leaves the panel`)
    // F-ER-08: an arrow is straight, or every jog is a real turn.
    for (const s of segments(e.points).slice(1, -1)) {
      const len = Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y)
      if (len > 0.5 && len < MIN_JOG) out.push(`${e.id}: a ${len}px jog reads as a kink`)
    }
    // No arrow runs through a box it does not join.
    for (const b of scene.boxes) {
      if (b.id === e.from || b.id === e.to) continue
      const inner = { x: b.rect.x + 1, y: b.rect.y + 1, w: b.rect.w - 2, h: b.rect.h - 2 }
      for (const s of segments(e.points)) {
        const box = { x: Math.min(s.a.x, s.b.x), y: Math.min(s.a.y, s.b.y), w: Math.abs(s.a.x - s.b.x), h: Math.abs(s.a.y - s.b.y) }
        if (intersects(inner, box)) out.push(`${e.id} runs through ${b.id}`)
      }
    }
    // The head lands on its target's edge, the start on its source.
    const last = e.points[e.points.length - 1]
    const T = scene.boxes.find((b) => b.id === e.to)!.rect
    const onEdge = Math.abs(last.x - T.x) < 0.5 || Math.abs(last.x - T.x - T.w) < 0.5 || Math.abs(last.y - T.y) < 0.5
    if (!onEdge) out.push(`${e.id} does not end on ${e.to}'s edge`)
  }
  return out
}

describe.each(cases)('heap-graph layout: %s', (_name, data, variant) => {
  const scene = layoutDiagram(data, variant)

  it('lays out at every width of the variant with one height', () => {
    for (const { scenes } of scene.panels) {
      scenes.forEach((s, i) => expect(s.width).toBeLessThanOrEqual(scene.widths[i]))
      expect(scene.widths[0]).toBe(STAGE[variant].min)
      expect(new Set(scenes.map((s) => s.height)).size).toBe(1)
    }
  })

  it('boxes, arrows and results never collide, cross, kink or leave the panel', () => {
    for (const { panel, scenes } of scene.panels)
      for (const s of scenes) expect(problems(s), `${panel.id} @${s.width}`).toEqual([])
  })

  it('columns line up from panel to panel', () => {
    for (let i = 0; i < scene.widths.length; i++) {
      const lefts = (kind: 'binding' | 'object') =>
        new Set(scene.panels.flatMap(({ scenes }) => scenes[i].boxes.filter((b) => b.kind === kind).map((b) => b.rect.x)))
      expect(lefts('binding').size, 'one name column').toBe(1)
    }
  })

  it('every traceable name has a touch target of at least 44 px, and no two targets overlap', () => {
    for (const { scenes } of scene.panels)
      for (const s of scenes) {
        const bands = hitBands(s.boxes)
        const rects = s.boxes
          .filter((b) => b.kind === 'binding' && b.value === undefined)
          .map((b) => {
            const k = bands.get(b.id)!
            return { x: b.rect.x - k.l, y: b.rect.y - k.t, w: b.rect.w + k.l + k.r, h: b.rect.h + k.t + k.b }
          })
        for (const r of rects) {
          expect(r.h).toBeGreaterThanOrEqual(44)
          expect(r.w).toBeGreaterThanOrEqual(44)
        }
        for (let a = 0; a < rects.length; a++)
          for (let b = a + 1; b < rects.length; b++) expect(intersects(rects[a], rects[b])).toBe(false)
      }
  })

  it('every sub-width has a container class', () => {
    for (const w of scene.widths.slice(1)) expect(CONTAINER[w], `CONTAINER[${w}]`).toBeDefined()
  })
})

describe('heap-graph presets', () => {
  it('the hint fits one line at the narrowest stage, both wordings', () => {
    for (const t of [HINT.hover, HINT.tap]) expect(sansWidth(t, HINT.size)).toBeLessThanOrEqual(STAGE.narrow.min)
  })

  it('the registered presets pass the lint', () => {
    for (const p of heapGraphDescriptor.presets) expect(lintHeapDiagram(p.data), p.id).toEqual([])
  })

  it('the lint rejects a name no phone can hold, and the figure falls back to a note', () => {
    const over = HEAP_PRESETS.find((p) => p.id === 'hg-overlong')!
    expect(lintHeapDiagram(over.data).join('\n')).toMatch(/layout \(narrow\)/)
    const def = { ...heapGraphDescriptor, presets: [over], defaultPreset: over.id, engine: { ...heapGraphEngineCore, Stage: HeapGraphStage } }
    expect(renderToStaticMarkup(<StaticFigure def={def} />)).toContain('data-viz-layout-failed')
  })

  it('stage height is the layout height at both variants', () => {
    for (const p of heapGraphDescriptor.presets) {
      const h = heapGraphEngineCore.stageHeight(p.data)
      expect(h).toEqual({ narrow: layoutDiagram(p.data, 'narrow').height, wide: layoutDiagram(p.data, 'wide').height })
    }
  })

  it('draws the preset with one changed mark per panel at most, and never a lime one at rest', () => {
    for (const p of heapGraphDescriptor.presets) {
      const html = renderToStaticMarkup(<HeapGraphStage data={p.data} uid="t" />)
      const svgs = html.split('<svg').slice(1)
      for (const svg of svgs) expect((svg.match(/data-changed=""/g) ?? []).length).toBeLessThanOrEqual(1)
      expect(html).not.toMatch(/lime/)
    }
  })

  // Spec §6.5 budgets 30 KB of inline SVG; the closures figures, text
  // alternative and trace CSS included, are 36 and 44 KB as shipped.
  it('the whole figure stays within the closures figures\' size', () => {
    for (const p of heapGraphDescriptor.presets) {
      const def = { ...heapGraphDescriptor, engine: { ...heapGraphEngineCore, Stage: HeapGraphStage } }
      const html = renderToStaticMarkup(<StaticFigure def={def} preset={p.id} />)
      expect(html.length, p.id).toBeLessThanOrEqual(44 * 1024)
    }
  })
})

describe('heap-graph trace (CSS only)', () => {
  const [alias, rebind, spread] = heapGraphDescriptor.presets[0].data.panels

  it('a name lights itself, its arrow, its object and what that object reaches', () => {
    expect(pathParts(spread, 'v-copy')).toEqual([
      '[data-node=v-copy]',
      '[data-edge="bind:v-copy"]',
      '[data-node=oB]',
      '[data-edge="ref:oB.stats"]',
      '[data-node=oC]',
    ])
    // Two names, one object: both traces light Object A.
    expect(pathParts(alias, 'v-original')).toContain('[data-node=oA]')
    expect(pathParts(alias, 'v-alias')).toContain('[data-node=oA]')
    // The rebound parameter reaches only its new object.
    expect(pathParts(rebind, 'v-record')).not.toContain('[data-node=oA]')
  })

  it('writes hover, focus-visible and touch rules for every traceable name, screen only', () => {
    const css = pathCss(heapGraphDescriptor.presets[0].data)
    expect(css.startsWith('@media screen and (hover:hover){')).toBe(true)
    expect(css).toContain('@media screen and (hover:none){')
    for (const p of heapGraphDescriptor.presets[0].data.panels)
      for (const b of traceable(p)) {
        expect(css).toContain(`:has([data-node=${b.id}]:hover)`)
        expect(css).toContain(`:has([data-node=${b.id}]:focus-visible)`)
        expect(css).toContain(`:has([data-node=${b.id}]:focus)`)
      }
  })
})

describe('placement primitives', () => {
  it('fitColumn keeps order and gaps, and wishes where it can', () => {
    expect(fitColumn([32, 32], [16], [0, 0], [1, 1])).toEqual([0, 48])
    expect(fitColumn([32, 32], [16], [10, 100], [1, 1])).toEqual([10, 100])
    expect(fitColumn([32, 32], [16], [40, 40], [1, 1])).toEqual([16, 64])
  })

  it('placePorts runs arrows straight where they fit, never into a short jog', () => {
    expect(placePorts([20], 10, 50)).toEqual([20])
    expect(placePorts([20, 40], 10, 50)).toEqual([20, 40])
    // Two names 48 apart into a 56 px box: a symmetric fan-in, not two kinks.
    const p = placePorts([16, 64], 18, 62)
    expect(p.every((y, i) => Math.abs(y - [16, 64][i]) >= MIN_JOG)).toBe(true)
  })

  it('the stress fixtures the lint accepts include CJK, many names and a cycle', () => {
    expect(accepted.map((p) => p.id)).toEqual(['hg-long-names', 'hg-many-names', 'hg-cjk', 'hg-cycle-chain'])
  })
})

export type { HeapDiagram }
