import { fenceLeProgram, fenceLtProgram, lessonPointsProgram } from './convex-hull'

/** Every program the turn-stack visual draws, by the recording file it is written to (`yarn viz:hull`). */
export const HULL_PROGRAMS = {
  'convex-hull': [lessonPointsProgram, fenceLtProgram, fenceLeProgram],
} as const
