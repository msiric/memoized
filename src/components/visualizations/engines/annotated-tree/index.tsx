import { StaticFigure } from '../../shell/StaticFigure'
import type { HashedProgram, StaticDefinition, VizStaticProps } from '../../shell/static-types'
import { AnnotatedTreeStage } from './AnnotatedTreeStage'
import { annotatedTreeDescriptor, annotatedTreeEngineCore } from './descriptor'
import type { TreeData } from './model'

/**
 * The annotated-tree figures. The server renders them into the lesson HTML
 * and the browser keeps that markup: this module is requested only after a
 * client-side navigation, where there is no server HTML to keep.
 */

const definition: StaticDefinition<TreeData, HashedProgram> = {
  ...annotatedTreeDescriptor,
  engine: { ...annotatedTreeEngineCore, Stage: AnnotatedTreeStage },
}

export default function AnnotatedTreeViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
