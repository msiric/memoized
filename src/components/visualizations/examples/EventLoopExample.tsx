import { SequenceStepper } from '../SequenceStepper'
import { buildEventLoopSteps } from '../SequenceStepper.data'

/**
 * The canonical "setTimeout vs Promise" event-loop walkthrough, ready to drop into a
 * lesson with a single tag: `<EventLoopExample />`. It composes the generic
 * SequenceStepper with the verified event-loop step-log, so the lesson author supplies
 * no data or layout (ADR-002, Tier 2). The generic renderer stays content-agnostic;
 * this wrapper owns the choice of example.
 */
export function EventLoopExample() {
  const { frames, code } = buildEventLoopSteps()
  return <SequenceStepper frames={frames} code={code} label="Event loop · setTimeout vs Promise ordering" />
}
