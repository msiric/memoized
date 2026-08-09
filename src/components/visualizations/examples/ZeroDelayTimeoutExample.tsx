import { SequenceStepper } from '../SequenceStepper'
import { buildZeroDelayTimeoutSteps } from '../SequenceStepper.data'

/**
 * "setTimeout with Zero Delay" event-loop walkthrough (ADR-002, Tier 2): two 0ms
 * timers still defer to macrotasks and run FIFO, one per loop turn. Embed with a
 * single tag: `<ZeroDelayTimeoutExample />`.
 */
export function ZeroDelayTimeoutExample() {
  const { frames, code } = buildZeroDelayTimeoutSteps()
  return <SequenceStepper frames={frames} code={code} label="Event loop · setTimeout with zero delay (macrotask order)" />
}
