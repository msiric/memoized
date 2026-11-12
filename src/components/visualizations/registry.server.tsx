import type { ComponentType } from 'react'
import EnvRecordsViz from './engines/env-records'
import EventLoopViz from './engines/event-loop'
import type { VizComponentProps } from './shell/types'

/**
 * Server renderers: `<Viz>` requires this module only when `window` is
 * undefined, so these imports never reach the browser's first-load bundle.
 * The server renders the static Start frame (real HTML, text alternative
 * included) and the browser keeps it until the engine chunk loads. Static
 * figures are final markup: the browser keeps them and never loads a chunk.
 */
export const VIZ_SERVER: Record<string, ComponentType<VizComponentProps>> = {
  'event-loop': EventLoopViz,
  'environment-records': EnvRecordsViz,
}
