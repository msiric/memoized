import type { HeapProgram } from '../model'
import { dataTypesPrograms } from './data-types'
import { objectsPrograms } from './objects'

/** Every lesson's programs, by recording file (`recordings/<lesson>.json`). */
export const HEAP_LESSONS: Record<string, HeapProgram[]> = {
  'data-types': dataTypesPrograms,
  objects: objectsPrograms,
}
