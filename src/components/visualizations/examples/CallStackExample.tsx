import { SequenceStepper } from '../SequenceStepper'
import { buildCallStackSteps } from '../SequenceStepper.data'

/**
 * A call-stack push/pop walkthrough for the context-and-call-stack lesson, ready to
 * drop in with a single tag: `<CallStackExample />`. It composes the generic
 * SequenceStepper with the verified call-stack step-log and renders only the Call
 * stack lane (ADR-002, Tier 2), so the lesson author supplies no data or layout.
 */
export function CallStackExample() {
  const { frames, code } = buildCallStackSteps()
  return <SequenceStepper frames={frames} code={code} lanes={['stack']} label="Call stack · nested function calls" />
}
