import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, pausesOf, source } from '../build'
import { nodeId, type FEdge, type FNode, type FrontierScene, type FrontierState } from '../model'
import { bfsShortestPath as P } from '../programs/bfs-shortest-path'
import type { FrontierRecording } from '../programs/types'
import recording from '../recordings/bfs-shortest-path.json'

/**
 * Graph BFS, preset 1 (R4 `bfs-levels-code-graph`): the lesson's
 * bfsShortestPath on its own example graph, drawn from the adjacency the run
 * recorded (C-F and E-F, no C-E). One step dequeues a vertex, the next
 * examines its neighbors: a vertex gets its distance the first time it is
 * seen, and the `in` check keeps it.
 *
 * Drawn by level (A, then B and C, then D, E and F), which is the run's own
 * result. The lesson's code has no level counter or levelSize, so the queue
 * has no divider: the distance badges carry the levels.
 */

const rec = recording as FrontierRecording
type Dist = Record<string, number>

const graph = pausesOf(rec, 'dequeue')[0].vars.graph as Record<string, string[]>
const vertices = Object.keys(graph)

const scene: FrontierScene = {
  kind: 'graph',
  title: 'Graph',
  pos: { 'n-A': [2, 0], 'n-B': [1, 1], 'n-C': [3, 1], 'n-D': [0.5, 2], 'n-E': [1.75, 2], 'n-F': [3, 2] },
  lanes: [{ id: 'queue', label: 'queue' }],
}

const edges: FEdge[] = vertices.flatMap((u, i) =>
  graph[u].filter((v) => vertices.indexOf(v) > i).map((v) => ({ id: `e-${u}-${v}`, from: nodeId(u), to: nodeId(v) })),
)
const edgeId = (u: string, v: string) => (vertices.indexOf(u) < vertices.indexOf(v) ? `e-${u}-${v}` : `e-${v}-${u}`)
const chipId = (v: string) => `k-${v}`

function state(opts: {
  queue: string[]
  dist: Dist
  current?: string
  done: ReadonlySet<string>
  active?: readonly string[]
  console?: string[]
}): FrontierState {
  const nodes: FNode[] = vertices.map((v) => ({
    id: nodeId(v),
    label: v,
    status: v === opts.current ? 'current' : opts.done.has(v) ? 'done' : opts.queue.includes(v) ? 'frontier' : 'idle',
    badge: v in opts.dist ? String(opts.dist[v]) : undefined,
  }))
  const active = new Set(opts.active ?? [])
  return {
    scene,
    nodes,
    edges: edges.map((e) => (active.has(e.id) ? { ...e, active: true } : e)),
    lanes: { queue: opts.queue.map((v) => ({ id: chipId(v), label: v })) },
    vars: opts.current ? [{ name: 'vertex', value: opts.current }] : [],
    console: opts.console ?? [],
  }
}

const steps: Step<FrontierState>[] = []
const done = new Set<string>()
const first = pausesOf(rec, 'dequeue')[0].vars as { queue: string[]; distances: Dist }
const start = first.queue[0]
steps.push({
  state: state({ queue: first.queue, dist: first.distances, done }),
  event: `Start at ${start}`,
  why: `Only ${start} is in the queue, at distance ${first.distances[start]}, so the loop expands ${start} first.`,
  narration: `The queue holds ${start}; distances holds ${start}: ${first.distances[start]}.`,
  focus: [],
  claim: 'modelled',
})

// The checks, grouped by the vertex being expanded (every vertex here has a neighbor).
const pauses = rec.pauses
/** Index of the step on which each vertex first gets its distance. */
const labelledAt: Record<string, number> = {}
const nextCheck = (from: number) => pauses.findIndex((p, i) => i >= from && p.probe === 'check')
for (let at = nextCheck(0); at >= 0; at = nextCheck(at)) {
  const v = pauses[at].vars.vertex as string
  const checks = []
  while (pauses[at]?.probe === 'check' && pauses[at].vars.vertex === v) checks.push(pauses[at++])
  const after = pauses[at].vars as { queue: string[]; distances: Dist }
  const head = checks[0].vars as { queue: string[]; distances: Dist }
  const d = head.distances[v]

  steps.push({
    state: state({ queue: head.queue, dist: head.distances, current: v, done }),
    event: `Dequeue ${v}`,
    why: `${v} has waited longest, so shift() takes it next; its distance, ${d}, was fixed when it was first seen.`,
    narration: `${v} leaves the head of the queue, at distance ${d}.`,
    line: line(P, 7),
    focus: [nodeId(v)],
    claim: 'modelled',
  })

  const fresh = checks.filter((c) => !((c.vars.neighbor as string) in (c.vars.distances as Dist))).map((c) => c.vars.neighbor as string)
  const seen = checks.map((c) => c.vars.neighbor as string).filter((n) => !fresh.includes(n))
  done.add(v)
  const has = (xs: string[]) => (xs.length > 1 ? 'already have' : 'already has')
  const why = !fresh.length
    ? `${list(seen)} ${has(seen)} a distance, so nothing joins the queue: a first label is never rewritten.`
    : seen.length
      ? `${list(seen)} ${has(seen)} a distance, so the in check skips ${seen.length > 1 ? 'them' : 'it'}; ${list(fresh)} ${fresh.length > 1 ? 'get' : 'gets'} ${d} + 1 = ${d + 1}.`
      : `${list(fresh)} ${fresh.length > 1 ? 'have' : 'has'} no distance yet, so ${fresh.length > 1 ? 'each gets' : 'it gets'} ${d} + 1 = ${d + 1} and joins the back of the queue.`
  for (const n of fresh) labelledAt[n] = steps.length
  steps.push({
    state: state({ queue: after.queue, dist: after.distances, done, active: (fresh.length ? fresh : seen).map((n) => edgeId(v, n)) }),
    event: fresh.length ? `Label ${list(fresh)}` : `${v}: nothing new`,
    why,
    narration: fresh.length ? `${list(fresh)} get distance ${d + 1} and join the queue.` : `Every neighbor of ${v} already has a distance.`,
    line: fresh.length ? lines(P, 11, 12) : line(P, 10),
    focus: fresh.length ? fresh.slice(0, 2).map(chipId) : seen.slice(0, 2).map(nodeId),
    claim: 'modelled',
  })
}

const end = pauses[pauses.length - 1].vars as { distances: Dist }
steps.push({
  state: state({ queue: [], dist: end.distances, done, console: [rec.stdout[0]] }),
  event: 'Return distances',
  why: 'The queue is empty, so every vertex keeps the distance of the level where BFS first reached it.',
  narration: `bfsShortestPath returns ${rec.stdout[0]}.`,
  line: line(P, 17),
  focus: ['out-0'],
  claim: 'observed',
  observes: [0],
})

// Asked as C is dequeued: C and E both neighbor F; the reveal is the step that labels F.
const reveal = labelledAt.F
const checkpoints: Checkpoint[] = [
  {
    beforeStep: reveal,
    prompt: 'Which vertex sets distances[F]?',
    choices: [
      { id: 'c', label: 'C' },
      { id: 'e', label: 'E' },
    ],
    answer: 'c',
    feedback: {
      correct: 'C is dequeued before E, so it reaches F first.',
      byChoice: {
        e: 'E comes later, and the in check never relabels F.',
      },
    },
    recap: { right: 'C set distances[F]', wrongLead: 'C set distances[F], not {pick}' },
  },
]

export const bfsLevels: StepLog<FrontierState> = {
  id: 'bfs-dfs-frontier/bfs-levels',
  schema: 1,
  source: source(P, rec),
  code: code(P),
  steps,
  checkpoints,
  observed: { log: rec.stdout },
}
