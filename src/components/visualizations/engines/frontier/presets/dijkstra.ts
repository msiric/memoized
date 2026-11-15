import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, num, pausesOf, show, source } from '../build'
import { nodeId, type FChip, type FEdge, type FNode, type FVar, type FrontierScene, type FrontierState } from '../model'
import { dijkstra as P } from '../programs/dijkstra'
import type { FrontierRecording } from '../programs/types'
import recording from '../recordings/dijkstra.json'

/**
 * Shortest Path Algorithms, preset 1 (R4 `dijkstra-priority-frontier`): the
 * lesson's Graph.dijkstra on its own 5-vertex directed graph, drawn from the
 * edges the run recorded. The min-heap is the frontier, listed by key (the
 * heap's array order is an implementation detail). The heap cannot change a
 * key, so an improved distance pushes a second entry and the old one is
 * skipped when popped: the `uDist > dist[u]` line.
 */

const rec = recording as FrontierRecording
type Heap = [number, number][]

const adj = pausesOf(rec, 'pop')[0].vars.adj as [number, [number, number][]][]
const V = (pausesOf(rec, 'pop')[0].vars.dist as unknown[]).length
const vertices = Array.from({ length: V }, (_, k) => k)

const scene: FrontierScene = {
  kind: 'graph',
  title: 'Graph',
  directed: true,
  pos: { 'n-0': [0, 0.8], 'n-1': [2, 0], 'n-2': [3, 0.8], 'n-3': [2, 1.6], 'n-4': [0.55, 1.6] },
  lanes: [{ id: 'heap', label: 'minHeap' }],
}

const edges: FEdge[] = adj.flatMap(([u, es]) => es.map(([v, w]) => ({ id: `e-${u}-${v}`, from: nodeId(u), to: nodeId(v), weight: w })))
const entry = ([key, v]: [number, number]): FChip => ({ id: `k-${key}-${v}`, label: `(${key}, ${v})` })
const sorted = (h: Heap) => [...h].sort((a, b) => a[0] - b[0] || a[1] - b[1])

function state(o: { heap: Heap; dist: unknown[]; current?: number; done: ReadonlySet<number>; active?: string; vars?: FVar[]; console?: string[] }): FrontierState {
  const inHeap = new Set(o.heap.map(([, v]) => v))
  const nodes: FNode[] = vertices.map((v) => ({
    id: nodeId(v),
    label: String(v),
    status: v === o.current ? 'current' : o.done.has(v) ? 'done' : inHeap.has(v) ? 'frontier' : 'idle',
    badge: show(num(o.dist[v])),
  }))
  return {
    scene,
    nodes,
    edges: edges.map((e) => (e.id === o.active ? { ...e, active: true } : e)),
    lanes: { heap: sorted(o.heap).map(entry) },
    vars: o.vars ?? [],
    console: o.console ?? [],
  }
}

const steps: Step<FrontierState>[] = []
const done = new Set<number>()
const pauses = rec.pauses
const first = pauses[0].vars as { heap: Heap; dist: unknown[] }
steps.push({
  state: state({ heap: first.heap, dist: first.dist, done }),
  event: 'Start',
  why: 'dist[0] = 0 and every other distance is ∞, so the only entry, (0, 0), is the first to pop.',
  narration: 'dist is 0 for vertex 0 and ∞ for the rest; the heap holds (0, 0).',
  focus: [],
  claim: 'modelled',
})

let reveal = -1
let current: number | undefined
for (let k = 0; k < pauses.length; k++) {
  const p = pauses[k]
  const vars = p.vars as { heap: Heap; dist: unknown[]; u: number; uDist: number; v: number; weight: number }
  if (p.probe === 'popped') {
    if (current !== undefined) done.add(current)
    const { u, uDist } = vars
    const du = num(vars.dist[u])
    const edgesOut = adj.find(([x]) => x === u)?.[1] ?? []
    if (uDist > du) {
      current = undefined
      steps.push({
        state: state({ heap: vars.heap, dist: vars.dist, done, vars: [{ name: 'popped', value: `(${uDist}, ${u})`, stale: true }] }),
        event: `Pop (${uDist}, ${u}): stale, skip`,
        why: `dist[${u}] is already ${du}, less than ${uDist}, so this older entry is skipped: the continue line.`,
        narration: `(${uDist}, ${u}) is popped and skipped, because dist[${u}] is ${du}.`,
        line: line(P, 90),
        focus: [nodeId(u)],
        claim: 'modelled',
      })
      continue
    }
    current = u
    steps.push({
      state: state({ heap: vars.heap, dist: vars.dist, current: u, done, vars: [{ name: 'u', value: String(u) }, { name: 'uDist', value: String(uDist) }] }),
      event: `Pop (${uDist}, ${u})`,
      why: edgesOut.length
        ? `${uDist} is the smallest key in the heap, so dist[${u}] = ${uDist} is final: every other path is at least as long.`
        : `${uDist} is the smallest key, so dist[${u}] = ${uDist} is final; ${u} has no outgoing edges, so nothing else changes.`,
      narration: `(${uDist}, ${u}) is popped; dist[${u}] is ${uDist}.`,
      line: lines(P, 88),
      focus: [nodeId(u)],
      claim: 'modelled',
    })
  } else if (p.probe === 'relax') {
    const { u, v, weight } = vars
    const next = pauses[k + 1].vars as { heap: Heap; dist: unknown[] }
    const du = num(vars.dist[u])
    const before = num(vars.dist[v])
    const after = num(next.dist[v])
    const improved = after < before
    if (u === 2 && v === 1 && improved) reveal = steps.length
    steps.push({
      state: state({
        heap: next.heap,
        dist: next.dist,
        current: u,
        done,
        active: `e-${u}-${v}`,
        vars: [{ name: 'u', value: String(u) }, { name: 'v', value: String(v) }],
      }),
      event: improved ? `dist[${v}]: ${show(before)} → ${after}` : `Edge ${u} → ${v}: no change`,
      why: improved
        ? `${du} + ${weight} = ${after} is less than ${show(before)}, so dist[${v}] drops and (${after}, ${v}) is pushed${before < Infinity ? `; (${before}, ${v}) stays in the heap` : ''}.`
        : `${du} + ${weight} = ${du + weight} is not less than dist[${v}] = ${show(before)}, so nothing changes.`,
      narration: improved ? `dist[${v}] becomes ${after}; (${after}, ${v}) is pushed.` : `${du} + ${weight} is not shorter than ${show(before)}.`,
      line: improved ? lines(P, 95) : lines(P, 94),
      focus: improved ? [`k-${after}-${v}`, nodeId(v)] : [`e-${u}-${v}`, nodeId(v)],
      claim: 'modelled',
    })
  } else if (p.probe === 'return') {
    if (current !== undefined) done.add(current)
    steps.push({
      state: state({ heap: vars.heap, dist: vars.dist, done, console: [rec.stdout[0]] }),
      event: 'Return dist',
      why: 'The heap is empty, so every distance is final; the stale entry changed nothing because it was skipped.',
      narration: `dijkstra returns ${rec.stdout[0]}.`,
      line: line(P, 102),
      focus: ['out-0'],
      claim: 'observed',
      observes: [0],
    })
  }
}

// Asked as 2 settles (dist[1] is still 9); the reveal is 2's edge to 1.
const checkpoints: Checkpoint[] = [
  {
    beforeStep: reveal,
    prompt: 'After 2 relaxes 1, heap entries for 1?',
    choices: [
      { id: '1', label: '1' },
      { id: '2', label: '2' },
      { id: '0', label: '0' },
    ],
    answer: '2',
    feedback: {
      correct: '(8, 1) joins and (9, 1) stays: a key never changes.',
      byChoice: {
        '1': 'Nothing removes (9, 1) now: it is skipped when popped.',
        '0': '6 + 2 = 8 is less than 9, so (8, 1) is pushed.',
      },
    },
    recap: { right: 'Two: (8, 1) and the stale (9, 1)', wrongLead: 'Two, (8, 1) and the stale (9, 1), not {pick}' },
  },
]

export const dijkstraLog: StepLog<FrontierState> = {
  id: 'bfs-dfs-frontier/dijkstra-lazy-heap',
  schema: 1,
  source: source(P, rec),
  code: code(P),
  steps,
  checkpoints,
  observed: { log: rec.stdout },
}
