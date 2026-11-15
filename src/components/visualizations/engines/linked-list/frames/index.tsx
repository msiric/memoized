import { StaticFigure } from '../../../shell/StaticFigure'
import type { HashedProgram, StaticDefinition, VizStaticProps } from '../../../shell/static-types'
import { linkedListFramesDescriptor, linkedListFramesEngineCore } from './descriptor'
import { FramesStage } from './FramesStage'
import type { FramesData } from './model'

/**
 * The pointer-rewiring frames. The server renders them into the lesson HTML
 * and the browser keeps that markup: this module is requested only after a
 * client-side navigation, where there is no server HTML to keep.
 */

const definition: StaticDefinition<FramesData, HashedProgram> = {
  ...linkedListFramesDescriptor,
  engine: { ...linkedListFramesEngineCore, Stage: FramesStage },
}

export default function LinkedListFramesViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
