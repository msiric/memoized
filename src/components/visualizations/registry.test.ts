import { describe, expect, it } from 'vitest'
import { VIZ_TABLE } from './entry-table'
import {
  VIZ_DESCRIPTORS,
  buildVizManifest,
  vizFootprint,
  vizStaticFootprints,
  vizStaticTextAlternative,
  vizStepFootprints,
  vizTextAlternative,
} from './registry'
import { VIZ_SERVER } from './registry.server'
import { definitionMetrics } from './shell/footprint'
import { LIMITS, validateDescriptor } from './step-log/validate'

describe('visualization registry', () => {
  const ids = Object.keys(VIZ_DESCRIPTORS).sort()

  it('keeps the entry table, the server renderers and the registry in step', () => {
    expect(Object.keys(VIZ_TABLE).sort()).toEqual(ids)
    expect(Object.keys(VIZ_SERVER).sort()).toEqual(ids)
  })

  it.each(ids)('%s: the entry table reserves exactly the computed footprint', (id) => {
    const [, narrow, wide, statics, steps] = VIZ_TABLE[id]
    expect([narrow, wide], 'update entry-table.ts').toEqual([...vizFootprint(id)!])
    const d = VIZ_DESCRIPTORS[id as keyof typeof VIZ_DESCRIPTORS]
    if (d.form === 'static') {
      // Per preset, default first: the placeholder after a client-side navigation.
      expect(JSON.parse(JSON.stringify(statics)), 'update entry-table.ts').toEqual(
        JSON.parse(JSON.stringify(vizStaticFootprints(id))),
      )
      expect(Object.keys(statics!)[0]).toBe(d.defaultPreset)
    } else expect(statics).toBeUndefined()
    if (d.form === 'step') {
      // Per preset (R2), default first: the placeholder reserves the preset it will render.
      expect(JSON.parse(JSON.stringify(steps)), 'update entry-table.ts').toEqual(
        JSON.parse(JSON.stringify(vizStepFootprints(id))),
      )
      expect(Object.keys(steps!)[0]).toBe(d.defaultPreset)
    } else expect(steps).toBeUndefined()
  })

  it.each(ids)('%s: the lazy loader resolves to a component', async (id) => {
    const mod = await VIZ_TABLE[id][0]()
    expect(typeof mod.default).toBe('function')
  })

  it.each(ids)('%s: presets are unique, labelled within 18 characters, and include the default', (id) => {
    const d = VIZ_DESCRIPTORS[id as keyof typeof VIZ_DESCRIPTORS]
    const presetIds = d.presets.map((p) => p.id)
    expect(new Set(presetIds).size).toBe(presetIds.length)
    expect(presetIds).toContain(d.defaultPreset)
    for (const p of d.presets) {
      expect(p.label.length).toBeLessThanOrEqual(LIMITS.presetLabel)
      if ('log' in p) expect(p.log.id).toBe(`${d.engine.id}/${p.id}`)
      else {
        expect(p.title.length).toBeLessThanOrEqual(40)
        expect(p.caption.length).toBeLessThanOrEqual(LIMITS.why)
      }
    }
    expect(d.title.length).toBeLessThanOrEqual(40)
    // Measured widths at 320 (VIZ-H A2): the title line and the preset switcher.
    if (d.form === 'step') expect(validateDescriptor(d)).toEqual([])
  })

  it('exports a manifest the content repo can validate <Viz id preset> against', () => {
    const manifest = buildVizManifest()
    expect(manifest.schema).toBe(1)
    expect(manifest.visuals['event-loop']).toEqual({
      form: 'step',
      engine: 'event-loop',
      presets: ['basic-ordering', 'microtask-queued-during-drain'],
      defaultPreset: 'basic-ordering',
      since: '2026-11',
    })
    expect(manifest.visuals['environment-records']).toEqual({
      form: 'static',
      engine: 'env-records',
      presets: VIZ_DESCRIPTORS['environment-records'].presets.map((p) => p.id),
      defaultPreset: 'var-vs-let-loop',
      since: '2026-11',
    })
    expect(manifest.visuals['environment-records'].presets).toEqual(
      expect.arrayContaining(['var-vs-let-loop', 'factory-calls-vs-aliases']),
    )
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest)
  })

  it('provides a text alternative for every preset', () => {
    const alt = vizTextAlternative('event-loop', 'basic-ordering')!
    expect(alt.output).toBe('A, D, C, B')
    // The Start prediction (R7) and the mid-run checkpoint.
    expect(alt.items.filter((i) => i.kind === 'checkpoint')).toHaveLength(2)
    expect(vizTextAlternative('event-loop', 'nope')).toBeUndefined()

    const fig = vizStaticTextAlternative('environment-records', 'var-vs-let-loop')!
    expect(fig.outputs).toEqual([
      { label: 'var', text: '3, 3, 3' },
      { label: 'let', text: '0, 1, 2' },
    ])
    expect(fig.parts.map((p) => p.heading)).toEqual(['for (var i = 0; i < 3; i++)', 'for (let i = 0; i < 3; i++)'])
    expect(vizStaticTextAlternative('environment-records', 'nope')).toBeUndefined()
  })

  it('documents the footprint arithmetic for the specimen', () => {
    const m = definitionMetrics(VIZ_DESCRIPTORS['event-loop'])
    expect(m.narrow).toMatchObject({ header: 80, bar: 96, footer: 64 })
    expect(m.wide).toMatchObject({ header: 44, bar: 96, footer: 44 })
  })
})
