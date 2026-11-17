import { StaticFigure } from '../../shell/StaticFigure'
import type { AnyProgram, StaticDefinition, VizStaticProps } from '../../shell/static-types'
import { heapGraphDescriptor, heapGraphEngineCore } from './descriptor'
import { HeapGraphStage } from './HeapGraphStage'
import type { HeapDiagram } from './model'

/**
 * The heap-graph figure. The server renders it into the lesson HTML and the
 * browser keeps that markup: this module is requested only after a
 * client-side navigation, where there is no server HTML to keep.
 */

const definition: StaticDefinition<HeapDiagram, AnyProgram> = {
  ...heapGraphDescriptor,
  engine: { ...heapGraphEngineCore, Stage: HeapGraphStage },
}

export default function HeapGraphViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
