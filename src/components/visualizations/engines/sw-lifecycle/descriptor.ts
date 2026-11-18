import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import { swMetrics } from './layout'
import { describeSw, swIntrospection, type SwState } from './model'
import { firstInstallLog, skipWaitingLog, updateLog } from './presets/service-workers'

/**
 * The service-worker lifecycle step-through without its renderer: pure data
 * and functions, so the registry, the manifest route and the tests use it
 * without React. One lesson group (Service Workers).
 */

export const swEngineCore: EngineCore<SwState> = {
  id: 'sw-lifecycle',
  describe: describeSw,
  layout: (logs) => swMetrics(logs).layout,
  introspect: swIntrospection,
}

const presets: Preset<SwState>[] = [
  { id: 'update-and-reload', label: 'Update', group: 'service-workers', title: 'Service worker: who controls each tab', log: updateLog },
  { id: 'skipWaiting', label: 'skipWaiting', group: 'service-workers', log: skipWaitingLog },
  { id: 'first-install-claim', label: 'First visit', group: 'service-workers', log: firstInstallLog },
]

export const swDescriptor: StepThroughDescriptor<SwState> = {
  id: 'sw-lifecycle',
  form: 'step',
  title: 'Service worker lifecycle',
  engine: swEngineCore,
  presets,
  defaultPreset: 'update-and-reload',
  since: '2026-11',
}
