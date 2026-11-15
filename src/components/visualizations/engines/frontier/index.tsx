'use client'

import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { frontierDescriptor, frontierEngineCore } from './descriptor'
import { FrontierStage } from './FrontierStage'
import type { FrontierState } from './model'

/** The lazily loaded frontier chunk: renderer, presets and logs (`<Viz id="bfs-dfs-frontier">`). */
const definition: StepThroughDefinition<FrontierState> = {
  ...frontierDescriptor,
  engine: { ...frontierEngineCore, Stage: FrontierStage },
}

export default function FrontierViz({ preset, interactive }: VizComponentProps) {
  return <StepThrough def={definition} preset={preset} interactive={interactive} />
}
