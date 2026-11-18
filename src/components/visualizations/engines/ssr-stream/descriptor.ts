import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import { ssrMetrics } from './layout'
import { describeSsr, ssrIntrospection, type SSRState } from './model'
import { streamLog, stringLog } from './presets/ssr'

/**
 * The ssr-stream step-through without its renderer: pure data and
 * functions, so the registry, the manifest route and the tests use it
 * without React. One lesson group (Server-Side Rendering).
 */

export const ssrEngineCore: EngineCore<SSRState> = {
  id: 'ssr-stream',
  describe: describeSsr,
  layout: (logs) => ssrMetrics(logs).layout,
  introspect: ssrIntrospection,
}

const presets: Preset<SSRState>[] = [
  {
    id: 'two-boundary-stream',
    label: 'Streaming',
    group: 'server-side-rendering',
    title: 'Streaming SSR and hydration',
    log: streamLog,
  },
  {
    id: 'renderToString-contrast',
    label: 'renderToString',
    group: 'server-side-rendering',
    log: stringLog,
  },
]

export const ssrDescriptor: StepThroughDescriptor<SSRState> = {
  id: 'ssr-stream',
  form: 'step',
  title: 'Streaming SSR and hydration',
  engine: ssrEngineCore,
  presets,
  defaultPreset: 'two-boundary-stream',
  since: '2026-11',
}
