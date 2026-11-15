'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
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

export default function LinkedListViz({ preset, interactive, code }: VizComponentProps) {
  // A practice answer's pane arrives with the page (`code`), never in this chunk.
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
