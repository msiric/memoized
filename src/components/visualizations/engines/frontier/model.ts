import type { StateIntrospection } from '../../step-log/types'

/**
 * The frontier notional machine (R4 shared visual 1, `bfs-dfs-frontier`): a
 * container decides which vertex is expanded next. A FIFO queue gives BFS
 * levels, a stack gives the iterator's in-order walk, a min-heap gives
 * Dijkstra. One machine, three canvases (a graph, a grid, a tree) and one
 * frontier lane, so every preset reads the same way: the canvas shows each
 * vertex's state, the lane shows what waits, the console what printed.
 *
 * State is carried by text and shape, never by color alone (spec A7): a
 * vertex in the frontier is also a chip in the lane with its name; the one
 * being expanded is named in the canvas header (`vertex B`) and has a doubled
 * edge; a finished vertex is filled solid; a wall is dashed.
 *
 * Ids are stable across steps: `n-<v>` for a vertex or cell, `k-<entry>`
 * for a frontier chip (a heap entry's id carries its key, so the stale
 * `(9, 1)` and the fresh `(8, 1)` are two chips), `e-<from>-<to>` for an
 * edge, `out-<k>` for console output.
 */

export type NodeStatus = 'idle' | 'frontier' | 'current' | 'done' | 'wall'

export type FNode = {
  id: string
  /** The vertex name, the tree value or the cell's value (mono). */
  label: string
  status: NodeStatus
  /** A recorded value beside the vertex: its distance (`∞` before one is written). */
  badge?: string
}

export type FEdge = {
  id: string
  from: string
  to: string
  /** Edge weight label (weighted graphs). */
  weight?: number
  /** The edge the current step examines. */
  active?: boolean
}

export type FChip = { id: string; label: string }

export type FVar = {
  name: string
  value: string
  /** A popped heap entry that is skipped (struck through, `removed` role). */
  stale?: boolean
}

/** What a preset draws, constant across its steps. */
export type FrontierScene = {
  kind: 'graph' | 'grid' | 'tree'
  /** Canvas heading (`Graph`, `Grid`, `BST`). */
  title: string
  /** Edges drawn with arrowheads. */
  directed?: boolean
  /** Layout units per vertex: column and row (graph, tree), or column and row of the cell (grid). */
  pos: Record<string, readonly [number, number]>
  /** The frontier lanes, in order: what each one is called (`queue`, `nq`) and how it is drawn. */
  lanes: readonly { id: string; label: string; vertical?: boolean }[]
  /** The lanes sit side by side in one row (`q` and `nq`, one level beside the next). */
  laneRow?: boolean
}

export type FrontierState = {
  scene: FrontierScene
  nodes: readonly FNode[]
  edges: readonly FEdge[]
  /** Chips per lane id (queue head first; a stack bottom first; a heap sorted by key). */
  lanes: Record<string, readonly FChip[]>
  /** The locals that name what is happening (`vertex B`), shown in the canvas header. */
  vars: readonly FVar[]
  console: readonly string[]
}

export const outId = (k: number) => `out-${k}`
export const nodeId = (v: string | number) => `n-${v}`

export const frontierIntrospection: StateIntrospection<FrontierState> = {
  ids(state) {
    const ids = new Set<string>(['canvas', 'console', ...state.scene.lanes.map((l) => l.id)])
    for (const n of state.nodes) ids.add(n.id)
    for (const e of state.edges) ids.add(e.id)
    for (const chips of Object.values(state.lanes)) for (const c of chips) ids.add(c.id)
    state.console.forEach((_, k) => ids.add(outId(k)))
    return ids
  },
  observedLog: (state) => state.console,
  region(state, id) {
    for (const [lane, chips] of Object.entries(state.lanes)) if (chips.some((c) => c.id === id)) return lane
    return undefined
  },
}

const STATUS_WORD: Record<NodeStatus, string> = {
  idle: 'unvisited',
  frontier: 'waiting',
  current: 'being expanded',
  done: 'done',
  wall: 'wall',
}

/** The stage's accessible name: every vertex with its state, the lanes and the console (spec §5.3). */
export function describeFrontier(state: FrontierState): string {
  const nodes = state.nodes
    .map((n) => `${n.label}${state.scene.kind === 'grid' ? ` at ${n.id.slice(2).replace('-', ',')}` : ''} ${STATUS_WORD[n.status]}${n.badge ? ` (${n.badge})` : ''}`)
    .join(', ')
  const lanes = state.scene.lanes
    .map((l) => `${l.label}: ${(state.lanes[l.id] ?? []).map((c) => c.label).join(', ') || 'empty'}`)
    .join('. ')
  const vars = state.vars.length ? ` ${state.vars.map((v) => `${v.name} ${v.value}${v.stale ? ' (stale)' : ''}`).join(', ')}.` : ''
  return `${state.scene.title}: ${nodes}.${vars} ${lanes}. Console: ${state.console.length ? state.console.join(', ') : 'empty'}.`
}
