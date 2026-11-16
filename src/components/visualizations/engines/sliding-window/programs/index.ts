import { kDistinctIfProgram, kDistinctWhileProgram } from './sliding-window'
import { setShrinkAbbaIfProgram, setShrinkAbbaProgram, setShrinkAbcabcbbProgram, setShrinkPwwkewProgram } from './strings'

/** Every program the sliding-window visual draws, by the recording file it is written to (`yarn viz:sliding-window`). */
export const WINDOW_PROGRAMS = {
  'sliding-window': [kDistinctWhileProgram, kDistinctIfProgram],
  strings: [setShrinkPwwkewProgram, setShrinkAbcabcbbProgram, setShrinkAbbaProgram, setShrinkAbbaIfProgram],
} as const
