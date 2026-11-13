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
import { lintEnvDiagram } from './lint'
import { CONTAINER, EnvRecordsStage, hitBands } from './EnvRecordsStage'
import { HINT, LABELS, SIZE, STAGE, layoutDiagram, layoutSection, type SectionScene } from './layout'
import { sansWidth } from '../../substrates/text-metrics'
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
        // One word per kind at every width (critique F-CL-05), never a fallback.
        if (kinds.has('env')) expect(labels, s.id).toContain(LABELS.env)
        if (kinds.has('outer')) expect(labels, s.id).toContain(LABELS.outer)
        expect(labels.every((l) => l === LABELS.env || l === LABELS.outer), s.id).toBe(true)
      }
  })

  it('names the owner of each labelled link, so the label lights with its path (R2M-14)', () => {
    for (const { scenes } of scene.sections)
      for (const s of scenes)
        for (const t of s.texts.filter((x) => x.kind === 'label'))
          expect(t.node, t.edge).toBe(t.edge!.slice(t.edge!.indexOf(':') + 1))
  })

  it('keeps the hatch out of every run of text in an unused record (R16)', () => {
    const html = renderToStaticMarkup(<EnvRecordsStage data={data} uid="x" />)
    const unused = scene.sections.flatMap(({ scenes }) => scenes.flatMap((s) => s.boxes.filter((b) => b.unused)))
    for (const b of unused) {
      const g = html.match(new RegExp(`<g data-node="${b.id}" class="vz-m">([\\s\\S]*?)</g>`))![1]
      const plates = [...g.matchAll(/M([\d.]+) ([\d.]+)h([\d.]+)v([\d.]+)/g)].map((m) => m.slice(1).map(Number))
      const texts = [...g.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>([^<]+)<\/text>/g)]
      expect(texts.length).toBeGreaterThan(0)
      expect(plates).toHaveLength(texts.length)
      // The plate is drawn after the hatch and before the text.
      expect(g.indexOf('class="vz-p"')).toBeGreaterThan(g.indexOf('url(#'))
      expect(g.indexOf('class="vz-p"')).toBeLessThan(g.indexOf('<text'))
      texts.forEach((m, i) => {
        const [x, y, text] = [Number(m[1]), Number(m[2]), m[3]]
        const size = m[0].includes('vz-t') || m[0].includes('vz-12') ? SIZE.header : SIZE.value
        const [px, py, pw, ph] = plates[i]
        expect(px).toBeLessThanOrEqual(x - 1)
        expect(px + pw).toBeGreaterThanOrEqual(x + textWidth(text, size) + 1)
        expect(py).toBeLessThanOrEqual(y - 0.75 * size)
        expect(py + ph).toBeGreaterThanOrEqual(y + 0.2 * size)
      })
    }
  })

  it('rests every link in the line role: lime is only the traced path (R1)', () => {
    const html = renderToStaticMarkup(<EnvRecordsStage data={data} uid="x" />)
    const markup = html.replace(/<style>[\s\S]*?<\/style>/, '')
    // Links, heads and dots draw in currentColor (line grey at rest); no `now` class is left.
    expect(markup).not.toMatch(/\bvz-n\b|\bvz-nf\b|lime/)
    expect(markup).not.toMatch(/\bitalic\b/)
  })

  it('switches every width with a literal container-query class', () => {
    for (const w of scene.widths.slice(1))
      expect(CONTAINER[w], `add ${w} to CONTAINER`).toBeDefined()
  })
})

describe('the layout follows the links', () => {
  const [varSection, letSection] = envRecordsDescriptor.presets[0].data.sections
  const at = (s: EnvSection, w: number) =>
    layoutSection(s, w, w)

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

describe('the hatch note sits under its mark (critique F-CL-06)', () => {
  const letSection = envRecordsDescriptor.presets[0].data.sections[1]
  // [width, the narrowest width of its variant]: the wrap is decided there.
  it.each([
    [288, 288],
    [343, 288],
    [295, 295],
    [359, 295],
  ])('right-aligned to the hatched record, one wrap per variant @ %i', (w, min) => {
    const s = layoutSection(letSection, w, min)
    const notes = s.texts.filter((t) => t.kind === 'note')
    const ghost = s.boxes.find((b) => b.unused)!.rect
    const swatch = SIZE.swatch + SIZE.swatchGap
    const right = Math.max(...notes.map((t) => t.rect.x + t.rect.w))
    expect(right).toBeLessThanOrEqual(ghost.x + ghost.w + 0.5)
    expect(right).toBeGreaterThan(ghost.x + ghost.w - 12)
    for (const t of notes) {
      expect(t.rect.x).toBe(notes[0].rect.x)
      expect(t.rect.w).toBeLessThanOrEqual(SIZE.noteMax - swatch)
    }
    expect(notes[0].rect.x - swatch).toBeGreaterThanOrEqual(0)
  })
})

describe('factory: functions beside the module (D18)', () => {
  const [counters] = envRecordsDescriptor.presets[1].data.sections
  it.each([288, 295, 343, 359])('aliases converge on one function without a detour @ %i', (w) => {
    const s = layoutSection(counters, w, Math.min(w, 288))
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

describe('authoring lint (A3, A9, A10)', () => {
  it.each(envRecordsDescriptor.presets.map((p) => [p.id, p.data] as const))('%s passes', (_id, data) => {
    expect(lintEnvDiagram(data)).toEqual([])
  })
  it('names the over-long heading and the tier that does not fit', () => {
    const byId = Object.fromEntries(ENV_PRESETS.map((p) => [p.id, lintEnvDiagram(p.data).join('\n')]))
    expect(byId['er-text-limit']).toMatch(/heading \(narrow\): \d+px > 288px/)
    expect(byId['er-long-names']).toMatch(/does not fit/)
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

describe('static markup budget (spec §6.5, raised to 36 KB by H3 R11 for the traced path)', () => {
  it.each(envRecordsDescriptor.presets.map((p) => [p.id, p.data] as const))(
    '%s',
    (_id, data) => {
      const html = renderToStaticMarkup(<EnvRecordsStage data={data} uid="x" />)
      expect(html.length).toBeLessThan(36_000)
    },
  )
})

describe('the interaction hint (R11)', () => {
  it('fits one line at the narrowest stage, in both wordings', () => {
    for (const text of [HINT.hover, HINT.tap]) {
      expect(sansWidth(text, HINT.size)).toBeLessThanOrEqual(STAGE.narrow.min)
      expect(text).not.toMatch(/\u2014/)
    }
  })
  it('is reserved in the footprint only when the figure has a function to trace', () => {
    for (const p of envRecordsDescriptor.presets) {
      const html = renderToStaticMarkup(<EnvRecordsStage data={p.data} uid="x" />)
      expect(html.match(/data-viz-part="hint"/g)).toHaveLength(2)
    }
  })
})

describe('touch targets (R11)', () => {
  it.each(cases)('%s: every function has a 44 px hit area, and no two overlap', (_n, data, variant) => {
    for (const { scenes } of layoutDiagram(data, variant).sections)
      for (const s of scenes) {
        const bands = hitBands(s.boxes)
        const hits = s.boxes
          .filter((x) => x.kind === 'function')
          .map((b) => {
            const d = bands.get(b.id)!
            // The drawn box is rect - 1 px; the band adds its sides.
            const r = { x: b.rect.x - d.l, y: b.rect.y - d.t, w: b.rect.w - 1 + d.l + d.r, h: b.rect.h - 1 + d.t + d.b }
            expect(r.h, `${b.id} @ ${s.width}`).toBeGreaterThanOrEqual(44)
            expect(r.w, `${b.id} @ ${s.width}`).toBeGreaterThanOrEqual(44)
            return { id: b.id, r }
          })
        for (let i = 0; i < hits.length; i++)
          for (let j = i + 1; j < hits.length; j++)
            expect(intersects(hits[i].r, hits[j].r), `${hits[i].id} x ${hits[j].id} @ ${s.width}`).toBe(false)
      }
  })
})
