import { emitFramesDescriptor, generatorFramesDescriptor, workerPoolDescriptor } from './descriptor'

/** The three frames visuals, for the dev gallery (`?fx=<preset>`) and the e2e helpers. React-free. */
export const FRAMES_VIZ = [generatorFramesDescriptor, workerPoolDescriptor, emitFramesDescriptor] as const

/** The frames visual whose presets include `preset` (preset ids are unique across the three). */
export function framesVizFor(preset: string): string | undefined {
  return FRAMES_VIZ.find((d) => d.presets.some((p) => p.id === preset))?.id
}
