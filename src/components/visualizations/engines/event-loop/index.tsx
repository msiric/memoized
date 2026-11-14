'use client'

import { StepThrough } from '../../shell/StepThrough'
import type {
  StepThroughDefinition,
  VizComponentProps,
} from '../../shell/types'
import { eventLoopDescriptor, eventLoopEngineCore } from './descriptor'
import { EventLoopStage } from './EventLoopStage'
import type { EventLoopState } from './model'

/**
 * The lazily loaded event-loop chunk: renderer, presets and logs. Loaded by
 * `<Viz id="event-loop">` when the frame nears the viewport.
 */

const definition: StepThroughDefinition<EventLoopState> = {
  ...eventLoopDescriptor,
  engine: { ...eventLoopEngineCore, Stage: EventLoopStage },
}

export default function EventLoopViz({
  preset,
  interactive,
}: VizComponentProps) {
  return (
    <StepThrough def={definition} preset={preset} interactive={interactive} />
  )
}
