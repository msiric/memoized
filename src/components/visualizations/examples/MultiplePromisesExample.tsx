import { SequenceStepper } from '../SequenceStepper'
import { buildMultiplePromisesSteps } from '../SequenceStepper.data'

/**
 * "Multiple Promises" event-loop walkthrough (ADR-002, Tier 2): two .then callbacks
 * run in the order they were queued, showing the microtask queue is FIFO. Embed with
 * a single tag: `<MultiplePromisesExample />`.
 */
export function MultiplePromisesExample() {
  const { frames, code } = buildMultiplePromisesSteps()
  return <SequenceStepper frames={frames} code={code} label="Event loop · multiple promises (microtask order)" />
}
