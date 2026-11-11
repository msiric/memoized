import { eventLoopDescriptor } from './engines/event-loop/descriptor'
import { footprintOf } from './shell/footprint'
import { textAlternative, type TextAlternative } from './shell/StepsAsText'
import type { StepThroughDescriptor } from './shell/types'

/**
 * The visualization registry (spec §6.1, §6.6): id -> form, engine, presets,
 * footprint and text alternative. React-free, so the manifest route, the
 * server and the tests share it.
 *
 * The lazy loaders live in `entry-table.ts` (the only part the browser loads
 * up front) and the server renderers in `registry.server.tsx`; a unit test
 * keeps all three in step.
 */

type AnyDescriptor = StepThroughDescriptor<any>

export const VIZ_DESCRIPTORS = {
  'event-loop': eventLoopDescriptor,
} satisfies Record<string, AnyDescriptor>

export type VizId = keyof typeof VIZ_DESCRIPTORS

export const VIZ_MANIFEST_SCHEMA = 1

export type VizManifest = {
  schema: typeof VIZ_MANIFEST_SCHEMA
  visuals: Record<
    string,
    { form: 'step' | 'static' | 'explorable'; engine: string; presets: string[]; defaultPreset: string; since: string }
  >
}

/** What content CI validates `<Viz id preset>` against (served at /viz-manifest.json). */
export function buildVizManifest(): VizManifest {
  const visuals: VizManifest['visuals'] = {}
  for (const [id, d] of Object.entries(VIZ_DESCRIPTORS) as [string, AnyDescriptor][]) {
    visuals[id] = {
      form: d.form,
      engine: d.engine.id,
      presets: d.presets.map((p) => p.id),
      defaultPreset: d.defaultPreset,
      since: d.since,
    }
  }
  return { schema: VIZ_MANIFEST_SCHEMA, visuals }
}

export function descriptorFor(id: string): AnyDescriptor | undefined {
  return (VIZ_DESCRIPTORS as Record<string, AnyDescriptor>)[id]
}

/** The reserved [narrow, wide] frame heights for a visual. */
export function vizFootprint(id: string): readonly [number, number] | undefined {
  const d = descriptorFor(id)
  return d ? footprintOf(d) : undefined
}

export function vizTextAlternative(id: string, preset?: string): TextAlternative | undefined {
  const d = descriptorFor(id)
  const p = d?.presets.find((x) => x.id === (preset ?? d.defaultPreset))
  return p ? textAlternative(p.log) : undefined
}
