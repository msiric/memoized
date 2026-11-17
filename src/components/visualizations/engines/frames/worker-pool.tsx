'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { workerPoolDescriptor, framesEngineCore } from './descriptor'
import { FramesStage } from './FramesStage'
import type { FState } from './model'

/**
 * The lazily loaded `<Viz id="worker-pool">` chunk: the frames renderer, presets
 * and logs. A practice answer's pane arrives with the page (`code`), never
 * in this chunk.
 */

const definition: StepThroughDefinition<FState> = {
  ...workerPoolDescriptor,
  engine: { ...framesEngineCore, Stage: FramesStage },
}

export default function WorkerPoolViz({ preset, interactive, code }: VizComponentProps) {
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
