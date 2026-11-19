'use client'

import { useMemo } from 'react'
import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { withCode } from '../../shell/with-code'
import { turnStackDescriptor, turnStackEngineCore } from './descriptor'
import type { HullState } from './model'
import { TurnStackStage } from './TurnStackStage'

/**
 * The lazily loaded turn-stack chunk: renderer, presets and logs. Loaded by
 * `<Viz id="hull-turn-stack">` near the viewport.
 */

const definition: StepThroughDefinition<HullState> = {
  ...turnStackDescriptor,
  engine: { ...turnStackEngineCore, Stage: TurnStackStage },
}

export default function TurnStackViz({ preset, interactive, code }: VizComponentProps) {
  // A practice answer's pane arrives with the page (`code`), never in this chunk.
  const def = useMemo(() => withCode(definition, code), [code])
  return <StepThrough def={def} preset={preset} interactive={interactive} />
}
