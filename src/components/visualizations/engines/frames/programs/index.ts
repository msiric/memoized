import { batchesProgram, failureProgram, refillProgram } from './async-await'
import { nestedOnceProgram, snapshotProgram } from './design-patterns'
import { delegationProgram, pipelineProgram, takeProgram, twoWayProgram } from './generators'

/** Every program the frames visuals draw, by the recording file it is written to (`yarn viz:frames`). */
export const FRAMES_PROGRAMS = {
  generators: [twoWayProgram, takeProgram, pipelineProgram, delegationProgram],
  'async-await': [refillProgram, batchesProgram, failureProgram],
  'design-patterns': [nestedOnceProgram, snapshotProgram],
} as const
