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
   * Static figures only: [narrow, wide, col] heights per preset, default
   * first (`col`: the full lesson column, from 1280).
   * Its presence marks the visual static: the server HTML is final and the
   * chunk loads only after a client-side navigation.
   */
  statics?: Record<string, readonly [number, number, number]>,
  /**
   * Step-throughs and explorables: heights per preset, default first (R2: every
   * reserved band is sized to the preset on screen): [narrow, wide, small,
   * tight, tighter], the frame laid out at the narrowest content width of
   * each band (H3 R2 Q16: a 375 phone, 768, a 320 phone, and very large
   * text), so the reserve holds at any text size.
   */
  steps?: Record<string, readonly [number, number, number, number, number]>,
]

export const VIZ_TABLE: Record<string, VizEntry> = {
  'event-loop': [
    () => import('./engines/event-loop'),
    816,
    576,
    undefined,
    {
      'basic-ordering': [816, 576, 844, 1008, 1072],
      'microtask-queued-during-drain': [844, 716, 872, 964, 1072],
    },
  ],
  'environment-records': [
    () => import('./engines/env-records'),
    890,
    572,
    { 'var-vs-let-loop': [890, 572, 548], 'factory-calls-vs-aliases': [830, 550, 526] },
  ],
  'list-keys': [
    () => import('./engines/list-keys'),
    878,
    566,
    undefined,
    {
      'index-insert-top': [878, 566, 890, 1094, 1222],
      'id-insert-top': [878, 566, 890, 1094, 1218],
      'index-delete-first': [730, 522, 782, 974, 1078],
      'index-append': [878, 566, 890, 1094, 1222],
      'random-key': [878, 566, 890, 1118, 1218],
      'parent-type-change': [786, 566, 826, 1030, 1094],
    },
  ],
}
