import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, source } from '../build'
import { nodeId, type FEdge, type FNode, type FrontierScene, type FrontierState } from '../model'
import { dfsCycle, dfsCycleNoBackEdge, dfsTopological } from '../programs/graph-dfs'
import type { FrontierProgram, FrontierRecording, Pause } from '../programs/types'
import cycleRec from '../recordings/dfs-cycle.json'
import noBackRec from '../recordings/dfs-cycle-no-back-edge.json'
import topoRec from '../recordings/dfs-topological.json'

/**
 * Graph DFS (R4 `dfs-directed-recstack`, wave 4B): the frontier in DFS
 * stack mode. The recursion stack is the frontier: `recStack` is drawn as a
 * lane beside `visited`, bottom first, and on the canvas a vertex on the
 * stack keeps the queued sky edge, the running call the doubled edge and a
 * finished vertex the solid fill, so "visited" and "on the stack" read
 * apart. One step enters a vertex (through the edge that called it),
 * examines an edge to a vertex already visited, or finishes a vertex
 * (`recStack.delete`). Every set and stack is read from the recording.
 *
 * Three presets: the lesson's example with E's list emptied (the run
 * reaches A -> C, a visited vertex that is done, not on the stack: no
 * cycle), the example as written (E -> A finds A on the stack: a cycle),
 * and topologicalSort's finish order on the A-F DAG, reversed.
 */

type Graph = Record<string, string[]>
type Sets = { visited: string[]; recStack: string[] }

const WORDS = { frontier: 'on recStack', current: 'running', done: 'done' } as const

/** The cycle graph's places: no edge crosses another (A -> C runs under B and D). */
const CYCLE_POS: Record<string, readonly [number, number]> = {
  'n-A': [0, 1],
  'n-B': [1, 0],
  'n-D': [2, 0],
  'n-C': [2, 1],
  'n-E': [1, 2],
}

const vChip = (v: string) => ({ id: `k-v-${v}`, label: v })
const rChip = (v: string) => ({ id: `k-r-${v}`, label: v })
const edgeId = (u: string, v: string) => `e-${u}-${v}`

function edgesOf(graph: Graph): FEdge[] {
  return Object.entries(graph).flatMap(([u, vs]) => vs.map((v) => ({ id: edgeId(u, v), from: nodeId(u), to: nodeId(v) })))
}

function cycleLog(id: string, P: FrontierProgram, rec: FrontierRecording, ask: (steps: Step<FrontierState>[], at: Record<string, number>) => Checkpoint[]): StepLog<FrontierState> {
  const pauses = rec.pauses
  const graph = pauses.find((p) => p.probe === 'enter')!.vars.graph as Graph
  const vertices = Object.keys(graph)
  const scene: FrontierScene = {
    kind: 'graph',
    title: 'Graph',
    directed: true,
    pos: CYCLE_POS,
    lanes: [
      { id: 'visited', label: 'visited' },
      { id: 'recStack', label: 'recStack' },
    ],
    laneRow: true,
    words: WORDS,
  }
  const edges = edgesOf(graph)
  const state = (s: Sets, o: { current?: string; active?: string; neighbor?: string; console?: string[] } = {}): FrontierState => ({
    scene,
    nodes: vertices.map(
      (v): FNode => ({
        id: nodeId(v),
        label: v,
        status: v === o.current ? 'current' : s.recStack.includes(v) ? 'frontier' : s.visited.includes(v) ? 'done' : 'idle',
      }),
    ),
    edges: edges.map((e) => (e.id === o.active ? { ...e, active: true } : e)),
    lanes: { visited: s.visited.map(vChip), recStack: s.recStack.map(rChip) },
    vars: [
      ...(o.current ? [{ name: 'vertex', value: o.current }] : []),
      ...(o.neighbor ? [{ name: 'neighbor', value: o.neighbor }] : []),
    ],
    console: o.console ?? [],
  })
  const sets = (p: Pause): Sets => ({ visited: p.vars.visited as string[], recStack: p.vars.recStack as string[] })
  const top = (s: Sets) => s.recStack[s.recStack.length - 1]

  const steps: Step<FrontierState>[] = [
    {
      state: state(sets(pauses[0])),
      event: 'Start: nothing visited',
      why: `Both sets are empty, so the loop first calls dfs(${pauses[0].vars.vertex}): recStack will hold the path from it to the call running now.`,
      narration: 'visited and recStack are empty.',
      focus: [],
      claim: 'modelled',
    },
  ]
  /** The step each named event landed on (`A>C`: the edge from A to C examined, `finish:E`). */
  const at: Record<string, number> = {}
  for (let i = 0; i < pauses.length; i++) {
    const p = pauses[i]
    if (p.probe === 'outer') {
      const v = p.vars.vertex as string
      if (!(sets(p).visited as string[]).includes(v)) {
        // A top-level call on an unvisited vertex: the state after its adds is the pause after its entry.
        const after = sets(pauses[i + 2])
        steps.push({
          state: state(after, { current: v }),
          event: `Call dfs(${v})`,
          why: `${v} is not visited, so dfs adds it to both sets: it is on the current path until all its edges are done.`,
          narration: `dfs(${v}) adds ${v} to visited and to recStack.`,
          line: lines(P, 9, 10),
          focus: [nodeId(v), rChip(v).id],
          claim: 'modelled',
        })
        i += 1
        continue
      }
      // The loop's later calls on vertices already visited, one step.
      const tried: string[] = []
      let j = i
      while (pauses[j]?.probe === 'outer') {
        tried.push(pauses[j].vars.vertex as string)
        j += 2
      }
      steps.push({
        state: state(sets(pauses[j - 1])),
        event: `The loop tries ${list(tried)}`,
        why: `Each is in visited and not on recStack, so its dfs returns false at once: only a vertex on the path can close a cycle.`,
        narration: `dfs(${tried.join('), dfs(')}) each return false: already visited.`,
        line: line(P, 7),
        focus: tried.slice(0, 2).map(nodeId),
        claim: 'modelled',
      })
      i = j - 1
      continue
    }
    if (p.probe === 'edge') {
      const u = p.vars.vertex as string
      const w = p.vars.neighbor as string
      const s = sets(p)
      at[`${u}>${w}`] = steps.length
      if (!s.visited.includes(w)) {
        const after = sets(pauses[i + 2])
        steps.push({
          state: state(after, { current: w, active: edgeId(u, w) }),
          event: `${u} → ${w}: call dfs(${w})`,
          why: `${w} is not visited, so the call adds it to both sets and goes deeper before ${u} looks at its next edge.`,
          narration: `${u} calls dfs(${w}); recStack is now ${list(after.recStack)}.`,
          line: lines(P, 9, 10),
          focus: [nodeId(w), rChip(w).id],
          claim: 'modelled',
        })
        i += 1
        continue
      }
      if (s.recStack.includes(w)) {
        steps.push({
          state: state(s, { current: u, neighbor: w, active: edgeId(u, w) }),
          event: `${u} → ${w}: ${w} is on recStack`,
          why: `${w} has not finished: the path ${s.recStack.join(', ')} runs from ${w} to ${u}, so recStack.has(${w}) returns true.`,
          narration: `${w} is on the recursion stack: the edge ${u} to ${w} closes a cycle.`,
          line: line(P, 6),
          focus: [nodeId(w)],
          claim: 'modelled',
        })
        const out = rec.stdout[0]
        steps.push({
          state: state(s, { console: [out] }),
          event: `Return ${out}`,
          why: 'Each call on the path returns true at once, so no vertex finishes.',
          narration: `dfsCycleDetection returns ${out}.`,
          line: line(P, 21),
          focus: ['out-0'],
          claim: 'observed',
          observes: [0],
        })
        break
      }
      steps.push({
        state: state(s, { current: u, neighbor: w, active: edgeId(u, w) }),
        event: `${u} → ${w}: ${w} is done`,
        why: `${w} is in visited but not on recStack: all its paths ended without coming back to ${u}, so dfs(${w}) returns false.`,
        narration: `${w} is visited and finished, not on the recursion stack: no cycle through ${u} to ${w}.`,
        line: line(P, 7),
        focus: [nodeId(w)],
        claim: 'modelled',
      })
      i += 1
      continue
    }
    if (p.probe === 'finish') {
      const v = p.vars.vertex as string
      const after = sets(pauses[i + 1])
      at[`finish:${v}`] = steps.length
      const back = top(after)
      steps.push({
        state: state(after, { current: back }),
        event: `Finish ${v}: off recStack`,
        why: `Every edge out of ${v} is done, so recStack.delete(${v}) runs; ${v} stays visited${back ? ` and ${back} resumes its loop` : ''}.`,
        narration: `${v} leaves the recursion stack and stays in visited.`,
        line: line(P, 16),
        focus: [nodeId(v)],
        claim: 'modelled',
      })
      continue
    }
    if (p.probe === 'return') {
      const out = rec.stdout[0]
      steps.push({
        state: state(sets(p), { console: [out] }),
        event: `Return ${out}`,
        why: 'No edge reached a vertex still on recStack, so there is no cycle.',
        narration: `dfsCycleDetection returns ${out}.`,
        line: line(P, 24),
        focus: ['out-0'],
        claim: 'observed',
        observes: [0],
      })
    }
  }
  return { id: `bfs-dfs-frontier/${id}`, schema: 1, source: source(P, rec), code: code(P), steps, checkpoints: ask(steps, at), observed: { log: rec.stdout } }
}

/** E's list emptied: the run meets C, visited and done, on A's second edge. */
export const dfsDirectedRecstackLog = cycleLog('dfs-directed-recstack', dfsCycleNoBackEdge, noBackRec as FrontierRecording, (_steps, at) => [
  {
    beforeStep: at['A>C'],
    prompt: 'C is visited. Is A → C a cycle?',
    choices: [
      { id: 'cycle', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
    answer: 'no',
    feedback: {
      correct: 'C is done, not on recStack: its paths ended without coming back to A.',
      byChoice: { cycle: 'Visited is not enough: only a vertex still on recStack closes a cycle.' },
    },
    recap: { right: 'A → C reached a finished vertex, no cycle', wrongLead: 'A → C was no cycle: C had finished' },
  },
])

/** The lesson's example as written: E -> A meets A on the stack. */
export const dfsBackEdgeLog = cycleLog('dfs-back-edge', dfsCycle, cycleRec as FrontierRecording, (_steps, at) => [
  {
    beforeStep: at['E>A'],
    prompt: 'A is visited. Is E → A a cycle?',
    choices: [
      { id: 'cycle', label: 'Yes' },
      { id: 'no', label: 'No' },
    ],
    answer: 'cycle',
    feedback: {
      correct: 'A is still on recStack: the path A, B, D, C, E leads back to it.',
      byChoice: { no: 'A has not finished: it is on recStack, so E → A closes a cycle.' },
    },
    recap: { right: 'E → A closed a cycle', wrongLead: 'E → A closed a cycle: A was on recStack' },
  },
])

// ---------------------------------------------------------------------------
// topologicalSort: the finish order, reversed.
// ---------------------------------------------------------------------------

const topo = topoRec as FrontierRecording

function topologicalLog(): StepLog<FrontierState> {
  const P = dfsTopological
  const pauses = topo.pauses
  const graph = pauses[0].vars.graph as Graph
  const vertices = Object.keys(graph)
  const scene: FrontierScene = {
    kind: 'graph',
    title: 'DAG',
    directed: true,
    pos: { 'n-A': [0, 0], 'n-C': [1, 0], 'n-E': [2, 0], 'n-B': [0, 1], 'n-D': [1, 1], 'n-F': [3, 1] },
    lanes: [
      { id: 'visited', label: 'visited' },
      { id: 'stack', label: 'stack' },
    ],
    laneRow: true,
    words: { frontier: 'on the call path', current: 'running', done: 'pushed' },
  }
  const edges = edgesOf(graph)
  const sChip = (v: string) => ({ id: `k-s-${v}`, label: v })
  type T = { visited: string[]; stack: string[] }
  const path: string[] = []
  const state = (t: T, o: { active?: string; neighbor?: string; console?: string[] } = {}): FrontierState => {
    const current = path[path.length - 1]
    return {
      scene,
      nodes: vertices.map((v): FNode => ({
        id: nodeId(v),
        label: v,
        status: v === current ? 'current' : path.includes(v) ? 'frontier' : t.stack.includes(v) ? 'done' : 'idle',
      })),
      edges: edges.map((e) => (e.id === o.active ? { ...e, active: true } : e)),
      lanes: { visited: t.visited.map(vChip), stack: t.stack.map(sChip) },
      vars: [...(current ? [{ name: 'vertex', value: current }] : []), ...(o.neighbor ? [{ name: 'neighbor', value: o.neighbor }] : [])],
      console: o.console ?? [],
    }
  }
  const t = (p: Pause): T => ({ visited: p.vars.visited as string[], stack: p.vars.stack as string[] })
  const steps: Step<FrontierState>[] = [
    {
      state: state(t(pauses[0])),
      event: 'Start: nothing visited',
      why: 'A vertex is pushed only after every vertex it reaches is pushed, so stack fills in finish order, last first.',
      narration: 'visited and stack are empty.',
      focus: [],
      claim: 'modelled',
    },
  ]
  const out = topo.stdout[0]
  let reveal = -1
  for (let i = 0; i < pauses.length; i++) {
    const p = pauses[i]
    if (p.probe === 'enter' && (i === 0 || pauses[i - 1].probe !== 'check')) {
      const v = p.vars.vertex as string
      path.push(v)
      steps.push({
        state: state(t(pauses[i + 1])),
        event: `Call dfs(${v})`,
        why: `The loop reaches ${v} first among the unvisited, so dfs(${v}) starts a new path from it.`,
        narration: `dfs(${v}) marks ${v} visited.`,
        line: line(P, 6),
        focus: [nodeId(v), vChip(v).id],
        claim: 'modelled',
      })
      continue
    }
    if (p.probe === 'check') {
      const u = p.vars.vertex as string
      const w = p.vars.neighbor as string
      if ((p.vars.visited as string[]).includes(w)) {
        steps.push({
          state: state(t(p), { active: edgeId(u, w), neighbor: w }),
          event: `${u} → ${w}: visited, skip`,
          why: `${w} is already visited${(p.vars.stack as string[]).includes(w) ? ' and pushed' : ''}, so ${u} does not call it again: ${w} will still come after ${u}.`,
          narration: `${w} is already visited; ${u} moves on.`,
          line: line(P, 9),
          focus: [nodeId(w)],
          claim: 'modelled',
        })
        continue
      }
      path.push(w)
      steps.push({
        state: state(t(pauses[i + 2]), { active: edgeId(u, w) }),
        event: `${u} → ${w}: call dfs(${w})`,
        why: `${w} is not visited, so ${u} calls it and waits: ${u} is pushed only after ${w} is.`,
        narration: `${u} calls dfs(${w}).`,
        line: lines(P, 9, 10),
        focus: [nodeId(w), vChip(w).id],
        claim: 'modelled',
      })
      i += 1
      continue
    }
    if (p.probe === 'push') {
      const v = p.vars.vertex as string
      path.pop()
      const after = t(pauses[i + 1])
      steps.push({
        state: state(after),
        event: `Push ${v}`,
        why: `Every edge out of ${v} is done, so ${v} goes on stack now, after everything it leads to.`,
        narration: `${v} is pushed; stack is ${list(after.stack)}.`,
        line: line(P, 14),
        focus: [nodeId(v), sChip(v).id],
        claim: 'modelled',
      })
      continue
    }
    if (p.probe === 'return') {
      reveal = steps.length
      steps.push({
        state: state(t(p), { console: [out] }),
        event: 'Return stack reversed',
        why: 'Reversed, the finish order puts every edge forward: last pushed comes first.',
        narration: `topologicalSort returns ${out}.`,
        line: line(P, 23),
        focus: ['out-0'],
        claim: 'observed',
        observes: [0],
      })
    }
  }
  const stack = t(pauses[pauses.length - 1]).stack
  const first = stack[stack.length - 1]
  const checkpoints: Checkpoint[] = [
    {
      beforeStep: reveal,
      prompt: 'Which vertex does it return first?',
      choices: [
        { id: stack[0], label: stack[0] },
        { id: first, label: first, value: out },
      ],
      answer: first,
      feedback: {
        correct: `reverse() puts the last vertex pushed, ${first}, first: nothing points into it.`,
        byChoice: { [stack[0]]: `${stack[0]} finished first, so after reverse() it comes last.` },
      },
      recap: { right: `${first} came first, pushed last`, wrongLead: `${first} came first, not {pick}` },
    },
  ]
  return { id: 'bfs-dfs-frontier/dfs-finish-order', schema: 1, source: source(P, topo), code: code(P), steps, checkpoints, observed: { log: topo.stdout } }
}

export const dfsFinishOrderLog = topologicalLog()
