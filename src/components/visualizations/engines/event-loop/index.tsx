'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type {
  StepThroughDefinition,
  VizComponentProps,
} from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { eventLoopDescriptor, eventLoopEngineCore } from './descriptor'
import { EventLoopStage } from './EventLoopStage'
import type { EventLoopState } from './model'

/**
 * The lazily loaded event-loop chunk: renderer, presets and logs. Loaded by
 * `<Viz id="event-loop">` when the frame nears the viewport. A practice
 * question's pane (the call-stack trace) arrives with the page (`code`),
 * never in this chunk.
 */

const definition: StepThroughDefinition<EventLoopState> = {
  ...eventLoopDescriptor,
  engine: { ...eventLoopEngineCore, Stage: EventLoopStage },
}

export default function EventLoopViz({
  preset,
  interactive,
  code,
}: VizComponentProps) {
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
