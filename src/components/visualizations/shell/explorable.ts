import type { StateIntrospection } from '../step-log/types'
import type { Preset } from './types'

/**
 * An explorable visual (spec §5, §8.3) as the registry and manifest see it:
 * React-free. Unlike a step-through it owns its own controls (the learner
 * sets inputs and predicts before each reveal), so it reports its reserved
 * footprint directly instead of through the StepThrough frame arithmetic.
 *
 * Each authored preset still carries a step-log (Start, one prediction
 * checkpoint, the reveal), so presets get the shared authoring lint, the
 * manifest and the text alternative like every other visual.
 */
export type ExplorableDescriptor<S> = {
  id: string
  form: 'explorable'
  /** Frame title. At most 40 characters. */
  title: string
  engine: { id: string; introspect: StateIntrospection<S> }
  presets: readonly Preset<S>[]
  defaultPreset: string
  since: string
  /** Reserved [narrow, wide] frame heights in px, the maximum over every state. */
  footprint: readonly [narrow: number, wide: number]
}
