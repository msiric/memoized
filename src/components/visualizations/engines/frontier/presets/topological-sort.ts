import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, source } from '../build'
import { nodeId, type FChip, type FEdge, type FNode, type FrontierScene, type FrontierState } from '../model'
import { courseScheduleII, kahn, kahnCycle, minHeightTrees } from '../programs/topological-sort'
import type { FrontierProgram, FrontierRecording, Pause } from '../programs/types'
import courseRec from '../recordings/course-schedule-ii.json'
import kahnCycleRec from '../recordings/kahn-cycle.json'
import kahnRec from '../recordings/kahn.json'
import mhtRec from '../recordings/min-height-trees.json'

/**
 * Topological Sort (R4 `kahn-indegree`, wave 4B): the frontier in queue
 * mode with in-degree badges. Each vertex carries its recorded in-degree;
 * a dequeued vertex's edges are examined one step at a time (the target's
 * badge counts down, the edge is then spent, drawn dashed) and a vertex
 * whose badge reaches 0 joins the back of the queue. The output order is a
 * lane of its own. Four presets: the lesson's Kahn example, Course Schedule
 * II (each pair [a, b] is an edge b -> a), the example with one edge turned
 * into a cycle (the queue empties with badges left: it returns []), and
 * Minimum Height Trees (degrees count down as leaves are peeled, layer by
 * layer). Every badge, queue and order is read from the recording.
 */

type Vars = Record<string, unknown>
const nums = (v: unknown) => v as number[]
const chip = (lane: string) => (v: number): FChip => ({ id: `k-${lane}-${v}`, label: String(v) })

const KAHN_POS: Record<string, readonly [number, number]> = {
  'n-5': [0, 0],
  'n-0': [1, 0],
  'n-4': [2, 0],
  'n-2': [0, 1],
  'n-3': [1, 1],
  'n-1': [2, 1],
}

type KahnNames = {
  graph: string
  degree: string
  queue: string
  order: string
  u: string
  v: string
  /** The probe that pauses after the decrement (Kahn's check), or before it (the answer's `--indeg[j]`). */
  decAfter: boolean
}
type KahnOpts = {
  id: string
  P: FrontierProgram
  rec: FrontierRecording
  scene: FrontierScene
  names: KahnNames
  /** Pane lines: the decrement, the push, the dequeue, the seeding loop, the return on success and on a cycle. */
  at: { dec: number; push: number; pop: [number, number]; seed: [number, number]; ok: number; cycle: number; build?: [number, number] }
  ask: (steps: Step<FrontierState>[], marks: Record<string, number>) => Checkpoint[]
  /** Start with no edges drawn (the edges are a step: the course pairs). */
  buildStep?: boolean
  /** The Start caption, where the preset changes the lesson's input. */
  startWhy?: string
}

function kahnLog(o: KahnOpts): StepLog<FrontierState> {
  const { P, rec, scene, names: N, at } = o
  const pauses = rec.pauses
  const built = pauses.find((p) => p.probe === 'built')!.vars
  const graph = built[N.graph] as number[][]
  const n = graph.length
  const edges: FEdge[] = graph.flatMap((vs, u) => vs.map((v) => ({ id: `e-${u}-${v}`, from: nodeId(u), to: nodeId(v) })))
  const spent = new Set<string>()
  const qChip = chip('q')
  const oChip = chip('o')
  const state = (s: { degree?: number[]; queue: number[]; order: number[]; current?: number; active?: string; noEdges?: boolean; console?: string[]; v?: number }): FrontierState => ({
    scene,
    nodes: Array.from({ length: n }, (_, v): FNode => ({
      id: nodeId(v),
      label: String(v),
      status: v === s.current ? 'current' : s.queue.includes(v) ? 'frontier' : s.order.includes(v) ? 'done' : 'idle',
      badge: s.degree ? String(s.degree[v]) : undefined,
    })),
    edges: s.noEdges ? [] : edges.map((e) => (e.id === s.active ? { ...e, active: true } : spent.has(e.id) ? { ...e, removed: true } : e)),
    lanes: { queue: s.queue.map(qChip), order: s.order.map(oChip) },
    vars: [
      ...(s.current !== undefined ? [{ name: N.u, value: String(s.current) }] : []),
      ...(s.v !== undefined ? [{ name: N.v, value: String(s.v) }] : []),
    ],
    console: s.console ?? [],
  })
  const deg = (p: Pause) => nums(p.vars[N.degree])
  const steps: Step<FrontierState>[] = []
  const marks: Record<string, number> = {}
  const indeg = deg(pauses.find((p) => p.probe === 'built')!)
  if (o.buildStep) {
    const pairs = pauses.filter((p) => p.probe === 'pair').map((p) => [p.vars.a, p.vars.b] as [number, number])
    steps.push({
      state: state({ queue: [], order: [], noEdges: true }),
      event: `Start: ${pairs.length} pairs`,
      why: `Each pair [a, b] says a needs b first, so the edge must run from b to a: b is output before a.`,
      narration: `prerequisites: ${pairs.map(([a, b]) => `[${a}, ${b}]`).join(', ')}.`,
      focus: [],
      claim: 'modelled',
    })
    marks.build = steps.length
    const [a, b] = pairs[0]
    steps.push({
      state: state({ degree: indeg, queue: [], order: [] }),
      event: `Build: edges b → a`,
      why: `g[b].push(a) adds the edge ${b} → ${a} for [${a}, ${b}], so indeg[${a}] counts it: ${a} waits for ${b}.`,
      narration: `Edges ${edges.map((e) => `${e.from.slice(2)} to ${e.to.slice(2)}`).join(', ')}; in-degrees ${indeg.join(', ')}.`,
      line: lines(P, ...at.build!),
      focus: [`e-${b}-${a}`, nodeId(a)],
      claim: 'modelled',
    })
  } else {
    steps.push({
      state: state({ degree: indeg, queue: [], order: [] }),
      event: 'Start: in-degrees counted',
      why: o.startWhy ?? `Each badge counts the edges into its vertex; only a vertex at 0 has nothing left to wait for, so only it may be output.`,
      narration: `In-degrees ${indeg.map((d, v) => `${v}: ${d}`).join(', ')}.`,
      focus: [],
      claim: 'modelled',
    })
  }
  const seeded = pauses.find((p) => p.probe === 'seeded')!
  const seedQ = nums(seeded.vars[N.queue])
  marks.seed = steps.length
  steps.push({
    state: state({ degree: deg(seeded), queue: seedQ, order: [] }),
    event: `Seed the queue: ${seedQ.join(', ')}`,
    why: `The loop pushes every vertex at in-degree 0 in index order, so ${seedQ[0]} is at the head${seedQ.length > 1 ? ` before ${list(seedQ.slice(1).map(String))}` : ''}.`,
    narration: `The queue holds ${list(seedQ.map(String))}.`,
    // The push alone: the seeding loop's rows would not fit the phone's code window.
    line: line(P, at.seed[1]),
    focus: seedQ.slice(0, 2).map((v) => qChip(v).id),
    claim: 'modelled',
  })
  const start = pauses.indexOf(seeded)
  let current: number | undefined
  for (let i = start + 1; i < pauses.length; i++) {
    const p = pauses[i]
    const next = pauses[i + 1]
    if (p.probe === 'pop') {
      current = p.vars[N.u] as number
      const order = nums(next.vars[N.order])
      const out = graph[current].length
      steps.push({
        state: state({ degree: deg(p), queue: nums(p.vars[N.queue]), order, current }),
        event: `Dequeue ${current}${out ? '' : ': no edges out'}`,
        why: out
          ? `${current} is at the head, so it is output next; ${out > 1 ? `each of its ${out} edges` : 'its one edge'} now stops counting against its target.`
          : `${current} is at the head, so it is output next; nothing depends on it, so no badge changes.`,
        narration: `${current} leaves the queue and is appended to the order.`,
        line: lines(P, ...at.pop),
        focus: [nodeId(current), oChip(current).id],
        claim: 'modelled',
      })
      continue
    }
    if (p.probe === 'dec') {
      const v = p.vars[N.v] as number
      const u = p.vars[N.u] as number
      // The degree after the decrement: this pause (after it) or the next (before it).
      const after = N.decAfter ? deg(p)[v] : deg(next)[v]
      const before = after + 1
      const queue = nums(next.vars[N.queue])
      const pushed = after === 0
      const id = `e-${u}-${v}`
      marks[`${u}>${v}`] = steps.length
      steps.push({
        state: state({ degree: N.decAfter ? deg(p) : deg(next), queue, order: nums(next.vars[N.order]), current: u, active: id, v }),
        event: pushed ? `${u} → ${v}: enqueue ${v}` : `${u} → ${v}: in-degree ${before} → ${after}`,
        why: pushed
          ? `${v}'s last incoming edge is spent, so nothing it waits for is left: it joins the back of the queue.`
          : `${u} is output, so this edge no longer holds ${v} back; ${v} still waits for ${after} more.`,
        narration: `The in-degree of ${v} drops from ${before} to ${after}${pushed ? `; ${v} joins the queue` : ''}.`,
        line: pushed ? lines(P, at.dec, at.push) : line(P, at.dec),
        focus: pushed ? [nodeId(v), qChip(v).id] : [nodeId(v)],
        claim: 'modelled',
      })
      spent.add(id)
      continue
    }
    if (p.probe === 'end') {
      const order = nums(p.vars[N.order])
      const out = rec.stdout[0]
      const ok = order.length === n
      marks.end = steps.length
      steps.push({
        state: state({ degree: deg(p), queue: [], order, console: [out] }),
        event: ok ? `Return all ${n}` : `Stalled: return []`,
        why: ok
          ? 'Every vertex reached 0 and was output, so every edge points forward.'
          : 'Badges above 0 are left: those vertices wait on each other, so it fails.',
        narration: `It returns ${out}.`,
        line: line(P, ok ? at.ok : at.cycle),
        focus: ['out-0'],
        claim: 'observed',
        observes: [0],
      })
    }
  }
  return { id: `bfs-dfs-frontier/${o.id}`, schema: 1, source: source(P, rec), code: code(P), steps, checkpoints: o.ask(steps, marks), observed: { log: rec.stdout } }
}

const KAHN_NAMES: KahnNames = { graph: 'graph', degree: 'inDegree', queue: 'queue', order: 'order', u: 'u', v: 'v', decAfter: true }
const KAHN_AT = { dec: 24, push: 26, pop: [20, 21] as [number, number], seed: [12, 14] as [number, number], ok: 32, cycle: 35 }
const kahnScene = (): FrontierScene => ({
  kind: 'graph',
  title: 'DAG',
  directed: true,
  pos: KAHN_POS,
  lanes: [
    { id: 'queue', label: 'queue' },
    { id: 'order', label: 'order' },
  ],
  laneRow: true,
  words: { frontier: 'queued', current: 'dequeued', done: 'output' },
  badge: 'in-degree',
})

export const kahnIndegreeLog = kahnLog({
  id: 'kahn-indegree',
  P: kahn,
  rec: kahnRec as FrontierRecording,
  scene: kahnScene(),
  names: KAHN_NAMES,
  at: KAHN_AT,
  ask: (_s, m) => [
    {
      beforeStep: m.seed,
      prompt: 'Which vertex is output first?',
      choices: [
        { id: '5', label: '5' },
        { id: '4', label: '4' },
      ],
      answer: '4',
      feedback: {
        correct: 'The seeding loop runs i = 0 to 5, so 4 is queued before 5.',
        byChoice: { '5': 'Both are sources, but the loop queues them in index order: 4 first.' },
      },
      recap: { right: '4 was output first, queued in index order', wrongLead: '4 was output first, not 5' },
    },
  ],
})

export const kahnCycleLog = kahnLog({
  id: 'kahn-cycle-stall',
  P: kahnCycle,
  rec: kahnCycleRec as FrontierRecording,
  scene: { ...kahnScene(), title: 'Graph' },
  startWhy: 'The example with [3, 1] turned into [3, 5]: 5 → 2 → 3 → 5 is a cycle, so those three each wait on another.',
  names: KAHN_NAMES,
  at: KAHN_AT,
  ask: (_s, m) => [
    {
      beforeStep: m.end,
      prompt: 'Queue empty. What is returned?',
      choices: [
        { id: 'partial', label: '[4, 1]' },
        { id: 'empty', label: '[]', value: '[]' },
      ],
      answer: 'empty',
      feedback: {
        correct: 'Only 2 of 6 were output: 5, 2 and 3 wait on each other, so it returns [].',
        byChoice: { partial: 'The length check sees 2 of 6, so the partial order is dropped: [].' },
      },
      recap: { right: 'it returned [], a cycle stalled the queue', wrongLead: 'it returned [], not [4, 1]' },
    },
  ],
})

export const courseScheduleLog = kahnLog({
  id: 'course-schedule-ii-edges',
  P: courseScheduleII,
  rec: courseRec as FrontierRecording,
  scene: {
    kind: 'graph',
    title: 'Courses',
    directed: true,
    pos: { 'n-0': [0, 0], 'n-1': [1, 0], 'n-2': [2, 0], 'n-3': [3, 0] },
    lanes: [
      { id: 'queue', label: 'q' },
      { id: 'order', label: 'ans' },
    ],
    laneRow: true,
    words: { frontier: 'queued', current: 'dequeued', done: 'output' },
    badge: 'in-degree',
  },
  names: { graph: 'g', degree: 'indeg', queue: 'q', order: 'ans', u: 'i', v: 'j', decAfter: false },
  at: { dec: 19, push: 20, pop: [16, 17], seed: [9, 11], ok: 24, cycle: 24, build: [5, 6] },
  buildStep: true,
  ask: (_s, m) => [
    {
      beforeStep: m.build,
      prompt: 'Which way does [1, 0] point?',
      choices: [
        { id: 'fwd', label: '0 → 1' },
        { id: 'back', label: '1 → 0' },
      ],
      answer: 'fwd',
      feedback: {
        correct: 'g[b].push(a): from the prerequisite 0 to the course 1 that waits for it.',
        byChoice: { back: 'The edge runs from what comes first: [1, 0] is 0 → 1, and indeg[1] counts it.' },
      },
      recap: { right: '[1, 0] pointed 0 → 1', wrongLead: '[1, 0] pointed 0 → 1, not 1 → 0' },
    },
  ],
})

// ---------------------------------------------------------------------------
// Minimum Height Trees: leaves peeled layer by layer, degrees counting down.
// ---------------------------------------------------------------------------

function mhtLog(): StepLog<FrontierState> {
  const P = minHeightTrees
  const rec = mhtRec as FrontierRecording
  const pauses = rec.pauses
  const built = pauses.find((p) => p.probe === 'built')!.vars
  const g = built.g as number[][]
  const n = g.length
  const pairs: [number, number][] = []
  g.forEach((vs, a) => vs.forEach((b) => a < b && pairs.push([a, b])))
  const scene: FrontierScene = {
    kind: 'graph',
    title: 'Tree',
    pos: { 'n-0': [0, 0], 'n-1': [0, 1], 'n-2': [0, 2], 'n-3': [1, 1], 'n-4': [2, 1], 'n-5': [3, 1] },
    lanes: [
      { id: 'q', label: 'q (this layer)' },
      { id: 't', label: 't (next layer)' },
    ],
    laneRow: true,
    words: { frontier: 'a leaf in q or t', current: 'being peeled', done: 'peeled' },
    badge: 'degree',
  }
  const peeled = new Set<number>()
  // One chip id per lane: q = t swaps the layer (t's chips leave, q's arrive), never a chip travelling over the old layer.
  const kq = (v: number): FChip => ({ id: `k-q-${v}`, label: String(v) })
  const kt = (v: number): FChip => ({ id: `k-t-${v}`, label: String(v) })
  const state = (s: { degree: number[]; q: number[]; t: number[]; current?: number; b?: number; console?: string[] }): FrontierState => ({
    scene,
    nodes: Array.from({ length: n }, (_, v): FNode => ({
      id: nodeId(v),
      label: String(v),
      status: v === s.current ? 'current' : s.q.includes(v) || s.t.includes(v) ? (peeled.has(v) ? 'done' : 'frontier') : peeled.has(v) ? 'done' : 'idle',
      badge: String(s.degree[v]),
    })),
    edges: pairs.map(([a, b]): FEdge => ({ id: `e-${a}-${b}`, from: nodeId(a), to: nodeId(b), ...(peeled.has(a) || peeled.has(b) ? { removed: true } : {}) })),
    lanes: { q: s.q.map(kq), t: s.t.map(kt) },
    vars: [...(s.current !== undefined ? [{ name: 'a', value: String(s.current) }] : [])],
    console: s.console ?? [],
  })
  const degree = (p: Pause) => nums(p.vars.degree)
  const steps: Step<FrontierState>[] = []
  const first = degree(pauses.find((p) => p.probe === 'built')!)
  steps.push({
    state: state({ degree: first, q: [], t: [] }),
    event: 'Start: degrees counted',
    why: 'Each badge counts a vertex’s edges; a leaf has degree 1, and only leaves can be peeled off without cutting the tree apart.',
    narration: `Degrees ${first.map((d, v) => `${v}: ${d}`).join(', ')}.`,
    focus: [],
    claim: 'modelled',
  })
  const seeded = pauses.find((p) => p.probe === 'seeded')!
  const q0 = nums(seeded.vars.q)
  steps.push({
    state: state({ degree: degree(seeded), q: q0, t: [] }),
    event: `Seed q: leaves ${q0.join(', ')}`,
    why: `Only vertices of degree 1 go in, so q holds the outermost layer: ${list(q0.map(String))}.`,
    narration: `q holds ${list(q0.map(String))}.`,
    line: line(P, 16),
    focus: q0.slice(0, 2).map((v) => kq(v).id),
    claim: 'modelled',
  })
  let q = q0
  for (let i = pauses.indexOf(seeded) + 1; i < pauses.length; i++) {
    const p = pauses[i]
    if (p.probe === 'peel') {
      const a = p.vars.a as number
      const nbrs: number[] = []
      let j = i + 1
      while (pauses[j].probe === 'dec') nbrs.push(pauses[j++].vars.b as number)
      const after = pauses[j]
      const d = degree(after)
      const t = nums(after.vars.t)
      const before = nums(p.vars.t)
      const pushed = t.filter((v) => !before.includes(v))
      peeled.add(a)
      const drop = (b: number) => `degree[${b}] ${d[b] + 1} → ${d[b]}`
      steps.push({
        state: state({ degree: d, q, t, current: a }),
        event: pushed.length ? `Peel ${a}: ${pushed[0]} to t` : nbrs.length === 1 ? `Peel ${a}: degree[${nbrs[0]}] → ${d[nbrs[0]]}` : `Peel ${a}`,
        why: pushed.length
          ? `Peeling ${a} drops degree[${pushed[0]}] to 1, so ${pushed[0]} is a leaf of the next layer and joins t.`
          : nbrs.length === 1
            ? `Peeling ${a} lowers degree[${nbrs[0]}] to ${d[nbrs[0]]}, not 1, so ${nbrs[0]} is not a leaf yet and t is unchanged.`
            : `Peeling ${a} lowers the degrees of ${list(nbrs.map(String))}; none lands on exactly 1, so t stays empty.`,
        narration: `${a} is peeled; ${nbrs.map(drop).join(', ')}${pushed.length ? `; ${pushed[0]} joins t` : ''}.`,
        line: pushed.length ? lines(P, 26, 27) : line(P, 26),
        focus: pushed.length ? [nodeId(a), kt(pushed[0]).id] : [nodeId(a)],
        claim: 'modelled',
      })
      i = j - 1
      continue
    }
    if (p.probe === 'splice') {
      const t = nums(p.vars.t)
      if (!t.length) continue
      q = t
      steps.push({
        state: state({ degree: degree(p), q, t: [] }),
        event: `q = t: ${t.join(', ')}`,
        why: `Round over: the old layer is gone, so the next layer's leaves, ${list(t.map(String))}, become q.`,
        narration: `q is now ${list(t.map(String))}.`,
        line: line(P, 31),
        focus: t.slice(0, 2).map((v) => kq(v).id),
        claim: 'modelled',
      })
      continue
    }
    if (p.probe === 'end') {
      const out = rec.stdout[0]
      steps.push({
        state: state({ degree: degree(p), q: [], t: [], console: [out] }),
        event: 'Return the last layer',
        why: 'The last layer pushed no new leaves, so ans keeps it: the centre of the tree.',
        narration: `findMinHeightTrees returns ${out}.`,
        line: line(P, 33),
        focus: ['out-0'],
        claim: 'observed',
        observes: [0],
      })
    }
  }
  const out = rec.stdout[0]
  const checkpoints: Checkpoint[] = [
    {
      beforeStep: 1,
      verdict: 'end',
      prompt: 'Which roots are left at the end?',
      choices: [
        { id: '3', label: '3' },
        { id: '34', label: '3 and 4', value: out },
        { id: '4', label: '4' },
      ],
      answer: '34',
      feedback: {
        correct: 'The longest path 0-3-4-5 has four vertices, so its centre is two: 3 and 4.',
        byChoice: {
          '3': '3 has the most edges, but the centre of the path 0-3-4-5 is 3 and 4.',
          '4': '4 is one of two: the centre of the path 0-3-4-5 is 3 and 4.',
        },
      },
      recap: { right: '3 and 4 were the roots', wrongLead: '3 and 4 were the roots, not {pick}' },
    },
  ]
  return { id: 'bfs-dfs-frontier/mht-leaf-peeling', schema: 1, source: source(P, rec), code: code(P), steps, checkpoints, observed: { log: rec.stdout } }
}

export const mhtLeafPeelingLog = mhtLog()
