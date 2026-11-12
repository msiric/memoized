import { envRecordsDescriptor } from './engines/env-records/descriptor'
import { eventLoopDescriptor } from './engines/event-loop/descriptor'
import { footprintOf } from './shell/footprint'
import { staticFootprints } from './shell/static-footprint'
import type { StaticDescriptor, StaticTextAlternative } from './shell/static-types'
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

type AnyDescriptor = StepThroughDescriptor<any> | StaticDescriptor<any>

export const VIZ_DESCRIPTORS = {
  'event-loop': eventLoopDescriptor,
  'environment-records': envRecordsDescriptor,
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
      presets: d.presets.map((p: { id: string }) => p.id),
      defaultPreset: d.defaultPreset,
      since: d.since,
    }
  }
  return { schema: VIZ_MANIFEST_SCHEMA, visuals }
}

/** Every step-through preset's log (code tokens, truth tests). */
export function stepThroughLogs() {
  return Object.values(VIZ_DESCRIPTORS as Record<string, AnyDescriptor>).flatMap((d) =>
    d.form === 'step' ? d.presets.map((p) => p.log) : [],
  )
}

export function descriptorFor(id: string): AnyDescriptor | undefined {
  return (VIZ_DESCRIPTORS as Record<string, AnyDescriptor>)[id]
}

/**
 * The reserved [narrow, wide] frame heights for a visual. A step-through
 * reserves one box for every preset; a static figure is sized per preset.
 */
export function vizFootprint(id: string, preset?: string): readonly [number, number] | undefined {
  const d = descriptorFor(id)
  if (!d) return undefined
  if (d.form === 'step') return footprintOf(d)
  return staticFootprints(d)[preset ?? d.defaultPreset]
}

/** Per-preset footprints of a static visual, default first (the entry table's fourth slot). */
export function vizStaticFootprints(id: string): Record<string, readonly [number, number]> | undefined {
  const d = descriptorFor(id)
  return d?.form === 'static' ? staticFootprints(d) : undefined
}

export function vizTextAlternative(id: string, preset?: string): TextAlternative | undefined {
  const d = descriptorFor(id)
  if (d?.form !== 'step') return undefined
  const p = d.presets.find((x) => x.id === (preset ?? d.defaultPreset))
  return p ? textAlternative(p.log) : undefined
}

/** A static figure's text alternative, with each program's verified output. */
export function vizStaticTextAlternative(id: string, preset?: string): StaticTextAlternative | undefined {
  const d = descriptorFor(id)
  if (d?.form !== 'static') return undefined
  const p = d.presets.find((x) => x.id === (preset ?? d.defaultPreset))
  if (!p) return undefined
  return {
    ...d.engine.describe(p.data),
    outputs: p.programs.map((pr) => ({ label: pr.id, text: pr.observed.join(', ') })),
  }
}
