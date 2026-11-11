import { describe, expect, it } from 'vitest'
import { VIZ_TABLE } from './entry-table'
import { VIZ_DESCRIPTORS, buildVizManifest, vizFootprint, vizTextAlternative } from './registry'
import { VIZ_SERVER } from './registry.server'
import { definitionMetrics } from './shell/footprint'
import { LIMITS } from './step-log/validate'

describe('visualization registry', () => {
  const ids = Object.keys(VIZ_DESCRIPTORS).sort()

  it('keeps the entry table, the server renderers and the registry in step', () => {
    expect(Object.keys(VIZ_TABLE).sort()).toEqual(ids)
    expect(Object.keys(VIZ_SERVER).sort()).toEqual(ids)
  })

  it.each(ids)('%s: the entry table reserves exactly the computed footprint', (id) => {
    const [, narrow, wide] = VIZ_TABLE[id]
    expect([narrow, wide], 'update entry-table.ts').toEqual([...vizFootprint(id)!])
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
      expect(p.log.id).toBe(`${d.engine.id}/${p.id}`)
    }
    expect(d.title.length).toBeLessThanOrEqual(40)
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
    expect(JSON.parse(JSON.stringify(manifest))).toEqual(manifest)
  })

  it('provides a text alternative for every preset', () => {
    const alt = vizTextAlternative('event-loop', 'basic-ordering')!
    expect(alt.output).toBe('A, D, C, B')
    expect(alt.items.filter((i) => i.kind === 'checkpoint')).toHaveLength(1)
    expect(vizTextAlternative('event-loop', 'nope')).toBeUndefined()
  })

  it('documents the footprint arithmetic for the specimen', () => {
    const m = definitionMetrics(VIZ_DESCRIPTORS['event-loop'])
    expect(m.narrow).toMatchObject({ header: 72, bar: 112, footer: 60 })
    expect(m.wide).toMatchObject({ header: 44, bar: 96, footer: 44 })
  })
})
