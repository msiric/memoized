'use client'

import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { swDescriptor, swEngineCore } from './descriptor'
import type { SwState } from './model'
import { SwStage } from './SwStage'

/**
 * The lazily loaded service-worker lifecycle chunk: renderer, presets and
 * logs. Loaded by `<Viz id="sw-lifecycle">` near the viewport.
 */

const definition: StepThroughDefinition<SwState> = {
  ...swDescriptor,
  engine: { ...swEngineCore, Stage: SwStage },
}

export default function SwLifecycleViz({ preset, interactive }: VizComponentProps) {
  return <StepThrough def={definition} preset={preset} interactive={interactive} />
}
