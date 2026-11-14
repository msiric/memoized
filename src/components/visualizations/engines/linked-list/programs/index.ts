import { detectCycleProgram } from './fast-and-slow-pointers'
import { reverseBetweenProgram, reverseFullProgram } from './linked-list-reversal'
import { palindromeEvenProgram, palindromeFalseProgram, palindromeOddProgram } from './linked-lists'

/** Every program the linked-list visuals draw, by the recording file it is written to (`yarn viz:linked-list`). */
export const POINTER_PROGRAMS = {
  'linked-list-reversal': [reverseBetweenProgram, reverseFullProgram],
  'linked-lists': [palindromeOddProgram, palindromeEvenProgram, palindromeFalseProgram],
  'fast-and-slow-pointers': [detectCycleProgram],
} as const
