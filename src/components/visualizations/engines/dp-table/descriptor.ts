import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import { dpTableMetrics } from './layout'
import { describeTable, dpIntrospection, type DPState } from './model'
import { knapsackDownLog, knapsackUpLog } from './presets/knapsack-1d'

/**
 * The dp-table step-through without its renderer: pure data and functions,
 * so the registry, the manifest route and the tests use it without React.
 * One id for the shared visual (R4 shared visual 6, `dp-table-dependencies`),
 * one lesson group per lesson (`Preset.group`).
 */

export const dpTableEngineCore: EngineCore<DPState> = {
  id: 'dp-table-dependencies',
  describe: describeTable,
  layout: (logs, all) => dpTableMetrics(logs, all).layout,
  introspect: dpIntrospection,
}

const presets: Preset<DPState>[] = [
  // Dynamic Programming, partition-equal-subset-sum (a practice answer: tokens come with the page).
  {
    id: 'knapsack-1d-desc-vs-asc',
    label: 'j downward',
    group: 'dynamic-programming',
    log: knapsackDownLog,
  },
  {
    id: 'knapsack-1d-asc',
    label: 'j upward',
    group: 'dynamic-programming',
    log: knapsackUpLog,
  },
]

export const dpTableDescriptor: StepThroughDescriptor<DPState> = {
  id: 'dp-table-dependencies',
  form: 'step',
  title: 'DP table: what each write reads',
  engine: dpTableEngineCore,
  presets,
  defaultPreset: 'knapsack-1d-desc-vs-asc',
  since: '2026-11',
}
