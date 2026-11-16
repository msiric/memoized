import { canPartitionDownProgram, canPartitionUpProgram } from './dynamic-programming'

/** Every program the dp-table visual draws, by the recording file it is written to (`yarn viz:dp`). */
export const DP_PROGRAMS = {
  'dynamic-programming': [canPartitionDownProgram, canPartitionUpProgram],
} as const
