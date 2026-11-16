import codeTokens from '../../code-tokens.json'
import type { EngineCore, Preset, StepThroughDescriptor } from '../../shell/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { framesMetrics } from './layout'
import { describeFrames, framesIntrospection, type FState } from './model'
import { addedLog, nestedOnceLog, removedLog } from './presets/emitter'
import { delegationLog, pipelineLog, takeLog, twoWayLog } from './presets/generators'
import { batchesLog, failureLog, refillLog } from './presets/worker-pool'

/**
 * The frames step-throughs without their renderer: pure data and functions,
 * so the registry, the manifest route and the tests use them without React.
 * One engine (`frames`), three visuals, one per lesson, each with its own
 * title: generator frames (Generators), the mapLimit worker pool
 * (Async/Await) and reentrant emit (Advanced Patterns). Every pane is
 * premium text, resolved with the page (`code.premium`), except the
 * fixed-batch contrast, which is the visual's own code.
 */

export const framesEngineCore: EngineCore<FState> = {
  id: 'frames',
  describe: describeFrames,
  layout: (logs, all) => framesMetrics(logs, all).layout,
  introspect: framesIntrospection,
}

const generatorPresets: Preset<FState>[] = [
  { id: 'twoWay-next-arg', label: 'next(arg)', log: twoWayLog },
  { id: 'take-closes-source', label: 'take closes', log: takeLog },
  { id: 'lazy-pipeline-pull', label: 'lazy pipeline', log: pipelineLog },
  { id: 'yield-star-forwarding', label: 'yield* forwards', log: delegationLog },
]

export const generatorFramesDescriptor: StepThroughDescriptor<FState> = {
  id: 'generator-frames',
  form: 'step',
  title: 'Generators: frames that pause',
  engine: framesEngineCore,
  presets: generatorPresets,
  defaultPreset: 'twoWay-next-arg',
  since: '2026-11',
}

const poolPresets: Preset<FState>[] = [
  { id: 'refill-on-settle', label: 'refill', log: refillLog },
  // The contrast is the visual's own code: its tokens are committed (`yarn viz:tokens`).
  { id: 'fixed-batches-contrast', label: 'fixed batches', log: withCodeTokens(batchesLog, codeTokens) },
  { id: 'failure-stops-claims', label: 'failure', log: failureLog },
]

export const workerPoolDescriptor: StepThroughDescriptor<FState> = {
  id: 'worker-pool',
  form: 'step',
  title: 'mapLimit: refill on settle',
  engine: framesEngineCore,
  presets: poolPresets,
  defaultPreset: 'refill-on-settle',
  since: '2026-11',
}

const emitPresets: Preset<FState>[] = [
  { id: 'once-consumed-by-nested-emit', label: 'nested once', log: nestedOnceLog },
  { id: 'removed-before-turn', label: 'removed', log: removedLog },
  { id: 'added-during-emit', label: 'added', log: addedLog },
]

export const emitFramesDescriptor: StepThroughDescriptor<FState> = {
  id: 'emit-frames',
  form: 'step',
  title: 'EventEmitter: reentrant emit',
  engine: framesEngineCore,
  presets: emitPresets,
  defaultPreset: 'once-consumed-by-nested-emit',
  since: '2026-11',
}
