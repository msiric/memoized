'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { slidingWindowDescriptor, slidingWindowEngineCore } from './descriptor'
import type { SWState } from './model'
import { SlidingWindowStage } from './SlidingWindowStage'

/**
 * The lazily loaded sliding-window chunk: renderer, presets and logs.
 * Loaded by `<Viz id="sliding-window">` near the viewport.
 */

const definition: StepThroughDefinition<SWState> = {
  ...slidingWindowDescriptor,
  engine: { ...slidingWindowEngineCore, Stage: SlidingWindowStage },
}

export default function SlidingWindowViz({ preset, interactive, code }: VizComponentProps) {
  // A practice answer's pane arrives with the page (`code`), never in this chunk.
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
