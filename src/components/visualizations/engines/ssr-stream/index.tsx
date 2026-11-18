'use client'

import { StepThrough } from '../../shell/StepThrough'
import type { StepThroughDefinition, VizComponentProps } from '../../shell/types'
import { ssrDescriptor, ssrEngineCore } from './descriptor'
import type { SSRState } from './model'
import { SsrStage } from './SsrStage'

/**
 * The lazily loaded ssr-stream chunk: renderer, presets and logs. Loaded by
 * `<Viz id="ssr-stream">` near the viewport. No code pane: the visual shows
 * the recorded wire, never lesson code.
 */

const definition: StepThroughDefinition<SSRState> = {
  ...ssrDescriptor,
  engine: { ...ssrEngineCore, Stage: SsrStage },
}

export default function SsrStreamViz({ preset, interactive }: VizComponentProps) {
  return <StepThrough def={definition} preset={preset} interactive={interactive} />
}
