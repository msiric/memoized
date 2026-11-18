import type { ComponentType } from 'react'
import AnnotatedTreeViz from './engines/annotated-tree'
import EnvRecordsViz from './engines/env-records'
import EventLoopViz from './engines/event-loop'
import EmitFramesViz from './engines/frames/emit-frames'
import GeneratorFramesViz from './engines/frames/generator-frames'
import WorkerPoolViz from './engines/frames/worker-pool'
import FrontierViz from './engines/frontier'
import LanesViz from './engines/lanes'
import PrototypeGraphViz from './engines/heap-graph/prototype'
import HeapGraphViz from './engines/heap-graph'
import LinkedListViz from './engines/linked-list'
import LinkedListFramesViz from './engines/linked-list/frames'
import ListKeysViz from './engines/list-keys'
import SlidingWindowViz from './engines/sliding-window'
import DpTableViz from './engines/dp-table'
import SwLifecycleViz from './engines/sw-lifecycle'
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
  'list-keys': ListKeysViz,
  'heap-graph': HeapGraphViz,
  'bfs-dfs-frontier': FrontierViz,
  'linked-list-pointer-rewiring': LinkedListViz,
  'linked-list-frames': LinkedListFramesViz,
  'sliding-window': SlidingWindowViz,
  'annotated-tree': AnnotatedTreeViz,
  'dp-table-dependencies': DpTableViz,
  'sw-lifecycle': SwLifecycleViz,
  'prototype-object-graph': PrototypeGraphViz,
  lanes: LanesViz,
  'generator-frames': GeneratorFramesViz,
  'worker-pool': WorkerPoolViz,
  'emit-frames': EmitFramesViz,
}
