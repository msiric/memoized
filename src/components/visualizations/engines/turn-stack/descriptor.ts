import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import { turnStackMetrics } from './layout'
import { describeHull, hullIntrospection, type HullState } from './model'
import { fenceLeLog, fenceLtLog, lessonPointsLog } from './presets/convex-hull'

/**
 * The turn-stack step-through without its renderer: pure data and functions,
 * so the registry, the manifest route and the tests use it without React.
 * One id (`hull-turn-stack`), one lesson group per lesson (`Preset.group`).
 */

export const turnStackEngineCore: EngineCore<HullState> = {
  id: 'hull-turn-stack',
  describe: describeHull,
  layout: (logs, all) => turnStackMetrics(logs, all).layout,
  introspect: hullIntrospection,
}

const presets: Preset<HullState>[] = [
  // Convex Hull, erect-the-fence (a practice answer: tokens come with the page).
  {
    id: 'monotone-chain-turn-pops',
    label: 'Lesson',
    group: 'convex-hull',
    title: 'Convex hull: which turns pop',
    log: lessonPointsLog,
  },
  { id: 'fence-collinear-lt', label: 'Fence < 0', group: 'convex-hull', log: fenceLtLog },
  { id: 'fence-collinear-le', label: 'Fence <= 0', group: 'convex-hull', log: fenceLeLog },
]

export const turnStackDescriptor: StepThroughDescriptor<HullState> = {
  id: 'hull-turn-stack',
  form: 'step',
  title: 'Monotone chain: the turn test',
  engine: turnStackEngineCore,
  presets,
  defaultPreset: 'monotone-chain-turn-pops',
  since: '2026-11',
}
