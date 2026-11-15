'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { frontierDescriptor, frontierEngineCore } from './descriptor'
import { FrontierStage } from './FrontierStage'
import type { FrontierState } from './model'

/** The lazily loaded frontier chunk: renderer, presets and logs (`<Viz id="bfs-dfs-frontier">`). */
const definition: StepThroughDefinition<FrontierState> = {
  ...frontierDescriptor,
  engine: { ...frontierEngineCore, Stage: FrontierStage },
}

export default function FrontierViz({ preset, interactive, code }: VizComponentProps) {
  // A practice answer's pane arrives with the page (`code`), never in this chunk.
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
