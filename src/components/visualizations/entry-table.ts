import type { ComponentType } from 'react'
import type { VizComponentProps } from './shell/types'

/**
 * The only registry data in a lesson's first-load JavaScript: per id, a lazy
 * loader and the reserved [narrow, wide] frame heights in px (for a static
 * figure, its default preset's). Keep it tiny.
 * `registry.test.ts` fails if a height drifts from the computed footprint or
 * an id is missing from the registry or the server renderers.
 */
export type VizEntry = readonly [
  load: () => Promise<{ default: ComponentType<VizComponentProps> }>,
  narrow: number,
  wide: number,
  /**
   * Static figures only: [narrow, wide] heights per preset, default first.
   * Its presence marks the visual static: the server HTML is final and the
   * chunk loads only after a client-side navigation.
   */
  statics?: Record<string, readonly [number, number]>,
]

export const VIZ_TABLE: Record<string, VizEntry> = {
  'event-loop': [() => import('./engines/event-loop'), 886, 646],
  'environment-records': [
    () => import('./engines/env-records'),
    846,
    532,
    { 'var-vs-let-loop': [846, 532], 'factory-calls-vs-aliases': [822, 562] },
  ],
}
