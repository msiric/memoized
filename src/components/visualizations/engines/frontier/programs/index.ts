import { bfsShortestPath } from './bfs-shortest-path'
import { binaryMatrix } from './binary-matrix'
import { bstIterator } from './bst-iterator'
import { dijkstra } from './dijkstra'
import { dfsCycle, dfsCycleNoBackEdge, dfsTopological } from './graph-dfs'
import { minEffort } from './min-effort'
import { courseScheduleII, kahn, kahnCycle, minHeightTrees } from './topological-sort'
import type { FrontierProgram } from './types'

/** Every program the frontier presets are built from, by id (the recording's file name). */
export const FRONTIER_PROGRAMS: readonly FrontierProgram[] = [
  bfsShortestPath,
  binaryMatrix,
  dijkstra,
  minEffort,
  bstIterator,
  // Wave 4B: Graph DFS and Topological Sort.
  dfsCycleNoBackEdge,
  dfsCycle,
  dfsTopological,
  kahn,
  courseScheduleII,
  kahnCycle,
  minHeightTrees,
]
