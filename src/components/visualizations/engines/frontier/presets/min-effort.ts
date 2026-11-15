import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, num, pausesOf, show, source } from '../build'
import type { FChip, FNode, FrontierScene, FrontierState } from '../model'
import { minEffort as P } from '../programs/min-effort'
import type { FrontierRecording } from '../programs/types'
import recording from '../recordings/min-effort.json'

/**
 * Shortest Path Algorithms, preset 2 (R4 min-effort grid): the practice
 * answer for Path With Minimum Effort on [[1,2,2],[3,8,2],[5,3,5]]. The same
 * frontier as Dijkstra, with a route's cost the largest single climb instead
 * of a sum. One step per pop: the cell it settles and every neighbor whose
 * effort it lowers. The goal's first effort, 3 by the right column, is not
 * its last: the left column offers 2, and the call returns on the pop.
 */

const rec = recording as FrontierRecording
type Entry = [number, number, number]
type Grid = unknown[][]

const heights = pausesOf(rec, 'pop')[0].vars.heights as number[][]
const m = heights.length
const n = heights[0].length
const cells = heights.flatMap((row, i) => row.map((_, j) => [i, j] as const))
const nid = (i: number, j: number) => `n-${i}-${j}`
const name = (i: number, j: number) => `[${i}, ${j}]`
const entry = ([d, x, y]: Entry): FChip => ({ id: `k-${d}-${x}-${y}`, label: `[${d}, ${x}, ${y}]` })
const sorted = (h: Entry[]) => [...h].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])

const scene: FrontierScene = {
  kind: 'grid',
  title: 'heights',
  pos: Object.fromEntries(cells.map(([i, j]) => [nid(i, j), [j, i] as const])),
  lanes: [{ id: 'heap', label: 'heap' }],
}

function state(o: { heap: Entry[]; dist: Grid; current?: [number, number]; done: readonly string[]; vars?: FrontierState['vars']; console?: string[] }): FrontierState {
  const queued = new Set(o.heap.map(([, x, y]) => nid(x, y)))
  const nodes: FNode[] = cells.map(([i, j]) => ({
    id: nid(i, j),
    label: String(heights[i][j]),
    status: o.current && o.current[0] === i && o.current[1] === j ? 'current' : o.done.includes(nid(i, j)) ? 'done' : queued.has(nid(i, j)) ? 'frontier' : 'idle',
    badge: show(num(o.dist[i][j])),
  }))
  return { scene, nodes, edges: [], lanes: { heap: sorted(o.heap).map(entry) }, vars: o.vars ?? [], console: o.console ?? [] }
}

const steps: Step<FrontierState>[] = []
const done: string[] = []
const pops = pausesOf(rec, 'pop')
const popped = pausesOf(rec, 'popped')
const first = pops[0].vars as { heap: Entry[]; dist: Grid }
steps.push({
  state: state({ heap: first.heap, dist: first.dist, done }),
  event: 'Start',
  why: 'The start costs nothing, so its effort is 0 and every other effort is ∞ until a route reaches it.',
  narration: 'The heap holds [0, 0, 0]; every other effort is ∞.',
  focus: [],
  claim: 'modelled',
})

let askAt = -1
popped.forEach((pp, k) => {
  const { effort, i, j, heap, dist } = pp.vars as { effort: number; i: number; j: number; heap: Entry[]; dist: Grid }
  const vars = [{ name: 'effort', value: String(effort) }, { name: '[i, j]', value: name(i, j) }]
  if (i === m - 1 && j === n - 1) {
    steps.push({
      state: state({ heap, dist, current: [i, j], done, vars, console: [rec.stdout[0]] }),
      event: `Pop ${name(i, j)}: return ${effort}`,
      why: `The goal comes off the heap with effort ${effort}, so no route can climb less: the call returns on the pop.`,
      narration: `${name(i, j)} is popped with effort ${effort}; the call returns ${rec.stdout[0]}.`,
      line: lines(P, 41),
      focus: [nid(i, j), 'out-0'],
      claim: 'observed',
      observes: [0],
    })
    return
  }
  const after = pops[k + 1].vars as { heap: Entry[]; dist: Grid }
  const lowered = cells.filter(([x, y]) => num(after.dist[x][y]) < num(dist[x][y]))
  const pushed = after.heap.filter((e) => !heap.some((h) => h.join() === e.join()))
  const words = lowered.map(([x, y]) => `${name(x, y)} ${show(num(dist[x][y]))}→${num(after.dist[x][y])}`)
  if (askAt < 0 && lowered.some(([x, y]) => x === m - 1 && y === n - 1)) askAt = steps.length
  steps.push({
    state: state({ heap: after.heap, dist: after.dist, current: [i, j], done, vars }),
    event: `Pop ${name(i, j)}${lowered.length ? `: ${lowered.length} lower` : ''}`,
    why: lowered.length
      ? `${name(i, j)} has the least effort in the heap, so it is final; ${list(words)} by max(effort, climb).`
      : `${name(i, j)} has the least effort, so it is final; no neighbor gets a lower effort through it.`,
    narration: lowered.length ? `${name(i, j)} is settled at ${effort}; ${list(words)}.` : `${name(i, j)} is settled at ${effort}.`,
    line: lowered.length ? lines(P, 48, 50) : line(P, 40),
    focus: lowered.length ? pushed.slice(0, 2).map((e) => entry(e).id) : [nid(i, j)],
    claim: 'modelled',
  })
  done.push(nid(i, j))
})

// Asked when the goal first gets an effort (3, by the right column); the verdict lands with the return.
const checkpoints: Checkpoint[] = [
  {
    beforeStep: askAt + 1,
    verdict: 'end',
    prompt: '[2, 2] has effort 3 in the heap. What will the call return?',
    choices: ['1', '2', '3'].map((x) => ({ id: x, label: x, value: x })),
    answer: rec.stdout[0],
    feedback: {
      correct: 'Down the left column no climb is above 2.',
      byChoice: { '1': 'Every route climbs at least 2 somewhere.', '3': '3 was the first offer; a route with climbs of 2 wins.' },
    },
    locked: 'Step on to see the heap decide.',
    recap: { right: 'It returned {answer}', wrongLead: 'It returned {answer}, not {pick}' },
  },
]

export const minEffortLog: StepLog<FrontierState> = {
  id: 'bfs-dfs-frontier/min-effort-grid',
  schema: 1,
  source: source(P, rec),
  code: code(P),
  steps,
  checkpoints,
  observed: { log: rec.stdout },
}
