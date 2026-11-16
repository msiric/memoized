import { StaticFigure } from '../../shell/StaticFigure'
import type { HashedProgram, StaticDefinition, VizStaticProps } from '../../shell/static-types'
import { lanesDescriptor, lanesEngineCore } from './descriptor'
import { LanesStage } from './LanesStage'
import type { LanesData } from './model'

/**
 * The lanes figures. The server renders them into the lesson HTML and the
 * browser keeps that markup: this module is requested only after a
 * client-side navigation.
 */

const definition: StaticDefinition<LanesData, HashedProgram> = {
  ...lanesDescriptor,
  engine: { ...lanesEngineCore, Stage: LanesStage },
}

export default function LanesViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
