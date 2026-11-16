'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { dpTableDescriptor, dpTableEngineCore } from './descriptor'
import { DpTableStage } from './DpTableStage'
import type { DPState } from './model'

/**
 * The lazily loaded dp-table chunk: renderer, presets and logs. Loaded by
 * `<Viz id="dp-table-dependencies">` near the viewport.
 */

const definition: StepThroughDefinition<DPState> = {
  ...dpTableDescriptor,
  engine: { ...dpTableEngineCore, Stage: DpTableStage },
}

export default function DpTableViz({ preset, interactive, code }: VizComponentProps) {
  // A practice answer's pane arrives with the page (`code`), never in this chunk.
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
