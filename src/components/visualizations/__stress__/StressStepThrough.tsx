'use client'

import { useMemo } from 'react'
import { EventLoopStage } from '../engines/event-loop/EventLoopStage'
import type { EventLoopState } from '../engines/event-loop/model'
import { StepThrough } from '../shell/StepThrough'
import type { StepThroughDefinition } from '../shell/types'
import { EVENT_LOOP_FIXTURES } from './event-loop.fixtures'

/**
 * Renders an adversarial event-loop fixture through the real StepThrough
 * shell and EventLoopStage (client only: the definition holds the stage
 * component, which cannot cross the server boundary as a prop).
 */
export function StressStepThrough({ fixture }: { fixture: keyof typeof EVENT_LOOP_FIXTURES }) {
  const def = useMemo<StepThroughDefinition<EventLoopState>>(() => {
    const d = EVENT_LOOP_FIXTURES[fixture]
    return { ...d, engine: { ...d.engine, Stage: EventLoopStage } }
  }, [fixture])
  return <StepThrough def={def} />
}
