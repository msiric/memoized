import { bfsShortestPath } from './bfs-shortest-path'
import { binaryMatrix } from './binary-matrix'
import { bstIterator } from './bst-iterator'
import { dijkstra } from './dijkstra'
import { minEffort } from './min-effort'
import type { FrontierProgram } from './types'

/** Every program the frontier presets are built from, by id (the recording's file name). */
export const FRONTIER_PROGRAMS: readonly FrontierProgram[] = [bfsShortestPath, binaryMatrix, dijkstra, minEffort, bstIterator]
