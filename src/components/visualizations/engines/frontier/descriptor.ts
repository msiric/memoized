import codeTokens from '../../code-tokens.json'
import type { EngineCore, StepThroughDescriptor } from '../../shell/types'
import { withCodeTokens } from '../../step-log/with-tokens'
import { frontierMetrics } from './layout'
import { describeFrontier, frontierIntrospection, type FrontierState } from './model'
import { bfsLevels } from './presets/bfs-levels'
import { binaryMatrixLog } from './presets/binary-matrix'
import { bstIteratorLog } from './presets/bst-iterator'
import { dijkstraLog } from './presets/dijkstra'
import { minEffortLog } from './presets/min-effort'

/**
 * The frontier visual (R4 shared visual 1, `bfs-dfs-frontier`) without its
 * renderer: one engine, one preset group per lesson (`Preset.group`), so
 * each lesson's frame offers only its own examples.
 */

export const frontierEngineCore: EngineCore<FrontierState> = {
  id: 'bfs-dfs-frontier',
  describe: describeFrontier,
  layout: (logs, all) => frontierMetrics(logs, all).layout,
  introspect: frontierIntrospection,
}

export const frontierDescriptor: StepThroughDescriptor<FrontierState> = {
  id: 'bfs-dfs-frontier',
  form: 'step',
  title: 'Frontier: what is expanded next',
  engine: frontierEngineCore,
  presets: [
    // Graph BFS (common-techniques/graph-bfs).
    { id: 'bfs-levels', label: 'Distances', group: 'graph-bfs', log: withCodeTokens(bfsLevels, codeTokens) },
    { id: 'binary-matrix-8dir', label: 'Binary matrix', group: 'graph-bfs', log: withCodeTokens(binaryMatrixLog, codeTokens) },
    // Shortest Path Algorithms (advanced-topics/shortest-path-algorithms).
    { id: 'dijkstra-lazy-heap', label: 'Dijkstra', group: 'shortest-path', log: withCodeTokens(dijkstraLog, codeTokens) },
    { id: 'min-effort-grid', label: 'Minimum effort', group: 'shortest-path', log: withCodeTokens(minEffortLog, codeTokens) },
    // Trees (user-defined-data-structures/trees).
    { id: 'bst-iterator-stack', label: 'BST iterator', group: 'trees', log: withCodeTokens(bstIteratorLog, codeTokens) },
  ],
  defaultPreset: 'bfs-levels',
  since: '2026-11',
}
