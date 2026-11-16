import { StaticFigure } from '../../shell/StaticFigure'
import type { HashedProgram, StaticDefinition, VizStaticProps } from '../../shell/static-types'
import { protoDescriptor, protoEngineCore } from './proto-descriptor'
import type { ProtoDiagram } from './proto-model'
import { ProtoStage } from './ProtoStage'

/**
 * The prototype object graph (the heap graph's chain arrangement). The
 * server renders it into the lesson HTML and the browser keeps that markup:
 * this module is requested only after a client-side navigation.
 */

const definition: StaticDefinition<ProtoDiagram, HashedProgram> = {
  ...protoDescriptor,
  engine: { ...protoEngineCore, Stage: ProtoStage },
}

export default function PrototypeGraphViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
