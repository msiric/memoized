import { StaticFigure } from '../../shell/StaticFigure'
import type { StaticDefinition, VizStaticProps } from '../../shell/static-types'
import { envRecordsDescriptor, envRecordsEngineCore } from './descriptor'
import { EnvRecordsStage } from './EnvRecordsStage'
import type { EnvDiagram } from './model'

/**
 * The environment-records figure. The server renders it into the lesson
 * HTML and the browser keeps that markup: this module is requested only
 * after a client-side navigation, where there is no server HTML to keep.
 */

const definition: StaticDefinition<EnvDiagram> = {
  ...envRecordsDescriptor,
  engine: { ...envRecordsEngineCore, Stage: EnvRecordsStage },
}

export default function EnvRecordsViz({ preset }: VizStaticProps) {
  return <StaticFigure def={definition} preset={preset} />
}
