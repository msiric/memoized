'use client'

import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { linkedListDescriptor, linkedListEngineCore } from './descriptor'
import { LinkedListStage } from './LinkedListStage'
import type { LLState } from './model'

/**
 * The lazily loaded pointer-rewiring chunk: renderer, presets and logs.
 * Loaded by `<Viz id="linked-list-pointer-rewiring">` near the viewport.
 */

const definition: StepThroughDefinition<LLState> = {
  ...linkedListDescriptor,
  engine: { ...linkedListEngineCore, Stage: LinkedListStage },
}

export default function LinkedListViz({ preset, interactive }: VizComponentProps) {
  return <StepThrough def={definition} preset={preset} interactive={interactive} />
}
