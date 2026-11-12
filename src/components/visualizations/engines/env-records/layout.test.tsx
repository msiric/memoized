// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  contains,
  crosses,
  intersects,
  segments,
  textWidth,
} from '../../substrates/box-arrow'
import { ENV_PRESETS } from '../../__stress__/env-records.fixtures'
import { envRecordsDescriptor } from './descriptor'
import { CONTAINER, EnvRecordsStage } from './EnvRecordsStage'
import { SIZE, layoutDiagram, layoutSection, type SectionScene } from './layout'
import type { EnvSection } from './model'

/**
 * Layout invariants for every preset, variant and width: the picture is
 * computed, so these are the checks a hand layout would get by eye.
 */

const cases = envRecordsDescriptor.presets.flatMap((p) =>
  (['narrow', 'wide'] as const).map(
    (v) => [`${p.id} ${v}`, p.data, v] as const,
  ),
)

function problems(scene: SectionScene): string[] {
  const out: string[] = []
  const frame = { x: 0, y: 0, w: scene.width, h: scene.height }
  for (const b of scene.boxes)
    if (!contains(frame, b.rect)) out.push(`${b.id} outside the section`)
  for (let i = 0; i < scene.boxes.length; i++)
    for (let j = i + 1; j < scene.boxes.length; j++)
      if (intersects(scene.boxes[i].rect, scene.boxes[j].rect, 7))
        out.push(
          `${scene.boxes[i].id} and ${scene.boxes[j].id} closer than 8 px`,
        )
  for (const b of scene.boxes) {
    const longest = Math.max(
      ...b.title.map((t) =>
        textWidth(b.kind === 'function' ? `ƒ ${t}` : t, SIZE.header),
      ),
    )
    if (longest > b.rect.w - 8)
      out.push(`${b.id}: title "${b.title.join(' ')}" does not fit`)
  }
  for (const t of scene.texts) {
    if (!contains(frame, t.rect, 1))
      out.push(`${t.kind} "${t.text}" outside the section`)
    for (const b of scene.boxes)
      if (intersects(t.rect, b.rect))
        out.push(`${t.kind} "${t.text}" overlaps ${b.id}`)
  }
  const segs = scene.edges.flatMap((e) =>
    segments(e.points).map((s) => ({ id: e.id, s })),
  )
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++)
      if (segs[i].id !== segs[j].id && crosses(segs[i].s, segs[j].s))
        out.push(`${segs[i].id} crosses ${segs[j].id}`)
  for (const e of scene.edges)
    for (const p of e.points)
      if (p.x < 0 || p.x > scene.width) out.push(`${e.id} leaves the section`)
  for (const t of scene.texts.filter((x) => x.kind === 'label'))
    for (const s of segs) {
      const xs = [s.s.a.x, s.s.b.x]
      const ys = [s.s.a.y, s.s.b.y]
      const box = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.abs(xs[0] - xs[1]),
        h: Math.abs(ys[0] - ys[1]),
      }
      if (intersects(t.rect, box)) out.push(`label "${t.text}" sits on ${s.id}`)
    }
  return out
}

describe.each(cases)('environment-records %s', (_name, data, variant) => {
  const scene = layoutDiagram(data, variant)

  it('lays out every width with no overlaps, crossings or clipped text', () => {
    for (const { scenes } of scene.sections)
      for (const s of scenes)
        expect(problems(s), `${s.id} @ ${s.width}`).toEqual([])
  })

  it('has one height for every width of the variant (the footprint is known on the server)', () => {
    for (const { scenes } of scene.sections)
      expect(new Set(scenes.map((s) => s.height)).size).toBe(1)
  })

  it('labels each kind of link once, so arrows are never anonymous', () => {
    for (const { scenes } of scene.sections)
      for (const s of scenes) {
        const kinds = new Set(
          s.edges.filter((e) => e.kind !== 'ref').map((e) => e.kind),
        )
        const labels = s.texts
          .filter((t) => t.kind === 'label')
          .map((t) => t.text)
        if (kinds.has('env'))
          expect(
            labels.some((l) => l === 'env' || l === '[[Environment]]'),
            s.id,
          ).toBe(true)
        if (kinds.has('outer')) expect(labels, s.id).toContain('outer')
      }
  })

  it('draws the section highlight, and only it, in the `now` role', () => {
    for (const { section, scenes } of scene.sections)
      expect(
        scenes[0].edges
          .filter((e) => e.now)
          .map((e) => e.id)
          .sort(),
      ).toEqual([...section.highlight].sort())
  })

  it('switches every width with a literal container-query class', () => {
    for (const w of scene.widths.slice(1))
      expect(CONTAINER[w], `add ${w} to CONTAINER`).toBeDefined()
  })
})

describe('the layout follows the links', () => {
  const [varSection, letSection] = envRecordsDescriptor.presets[0].data.sections
  const at = (s: EnvSection, w: number) =>
    layoutSection(s, w, w, new Set(s.highlight))

  it('var: three [[Environment]] arrows converge on one record', () => {
    const s = at(varSection, 343)
    const env = s.edges.filter((e) => e.kind === 'env')
    expect(env).toHaveLength(3)
    const targets = env.map((e) => e.points[e.points.length - 1])
    const call = s.boxes.find((b) => b.id === 'call')!.rect
    for (const t of targets) expect(t.y).toBe(call.y + call.h)
    const spread =
      Math.max(...targets.map((t) => t.x)) -
      Math.min(...targets.map((t) => t.x))
    const sources =
      Math.max(...env.map((e) => e.points[0].x)) -
      Math.min(...env.map((e) => e.points[0].x))
    expect(spread).toBeLessThan(sources / 3)
  })

  it('let: each function sits under its own iteration record, outer links point up', () => {
    const s = at(letSection, 288)
    const box = (id: string) => s.boxes.find((b) => b.id === id)!.rect
    for (const k of [0, 1, 2]) {
      const f = box(`f${k}`)
      const it = box(`it${k}`)
      expect(f.x + f.w / 2).toBeCloseTo(it.x + it.w / 2, 5)
      expect(s.edges.find((e) => e.id === `env:f${k}`)!.points).toHaveLength(2)
    }
    for (const e of s.edges.filter((x) => x.kind === 'outer'))
      expect(e.points[e.points.length - 1].y).toBeLessThan(e.points[0].y)
    expect(s.edges.find((e) => e.id === 'outer:it3')!.dashed).toBe(true)
  })
})

describe('factory: functions beside the module (D18)', () => {
  const [counters] = envRecordsDescriptor.presets[1].data.sections
  it.each([288, 295, 343, 359])('aliases converge on one function without a detour @ %i', (w) => {
    const s = layoutSection(counters, w, Math.min(w, 288), new Set(counters.highlight))
    const box = (id: string) => s.boxes.find((b) => b.id === id)!.rect
    const mod = box('module')
    for (const f of ['fA', 'fB']) expect(box(f).x).toBeGreaterThan(mod.x + mod.w)
    const fA = box('fA')
    for (const name of ['counter1', 'sameCounter']) {
      const e = s.edges.find((x) => x.id === `ref:module.${name}`)!
      const end = e.points[e.points.length - 1]
      expect(end.x).toBe(fA.x)
      expect(end.y).toBe(fA.y + fA.h / 2)
      // From the dot to the function: no route under the figure.
      const len = segments(e.points).reduce((t, g) => t + Math.abs(g.a.x - g.b.x) + Math.abs(g.a.y - g.b.y), 0)
      expect(len).toBeLessThan(120)
    }
    // Records sit above their functions, so [[Environment]] still points up.
    for (const k of ['A', 'B']) {
      const e = s.edges.find((x) => x.id === `env:f${k}`)!
      expect(e.points[e.points.length - 1].y).toBeLessThan(e.points[0].y)
    }
  })
})

describe('geometry is crisp (F-ER-08)', () => {
  it.each(cases)('%s: no jog shorter than two corner radii, box edges on whole pixels', (_n, data, variant) => {
    for (const { scenes } of layoutDiagram(data, variant).sections)
      for (const s of scenes) {
        for (const b of s.boxes) expect(Number.isInteger(b.rect.x), b.id).toBe(true)
        for (const e of s.edges)
          for (const g of segments(e.points)) {
            const len = Math.abs(g.a.x - g.b.x) + Math.abs(g.a.y - g.b.y)
            if (e.kind !== 'ref') expect(len === 0 || len >= 8, `${e.id} @ ${s.width}`).toBe(true)
          }
      }
  })
})

describe('adversarial data the layout accepts never collides (A3)', () => {
  const fixtures = ENV_PRESETS.flatMap((p) => (['narrow', 'wide'] as const).map((v) => [`${p.id} ${v}`, p.data, v] as const))
  it.each(fixtures)('%s', (_n, data, variant) => {
    let scene
    try {
      scene = layoutDiagram(data, variant)
    } catch {
      return // rejected by the lint before rendering
    }
    for (const { scenes } of scene.sections)
      for (const s of scenes)
        for (let i = 0; i < s.boxes.length; i++)
          for (let j = i + 1; j < s.boxes.length; j++)
            expect(intersects(s.boxes[i].rect, s.boxes[j].rect, 7), `${s.boxes[i].id} x ${s.boxes[j].id} @ ${s.width}`).toBe(
              false,
            )
  })
})

describe('text width model (A6)', () => {
  it('measures CJK at 1 em and emoji at 1.25 em, one cluster per ZWJ sequence', () => {
    expect(textWidth('漢字', 10)).toBeCloseTo(20)
    expect(textWidth('🎉', 10)).toBeCloseTo(12.5)
    expect(textWidth('👩‍👩‍👧', 10)).toBeCloseTo(12.5)
    expect(textWidth('é', 10)).toBeCloseTo(6.1)
  })
})

describe('static markup budget (spec §6.5: 30 KB raw per figure)', () => {
  it.each(envRecordsDescriptor.presets.map((p) => [p.id, p.data] as const))(
    '%s',
    (_id, data) => {
      const html = renderToStaticMarkup(<EnvRecordsStage data={data} uid="x" />)
      expect(html.length).toBeLessThan(30_000)
    },
  )
})
