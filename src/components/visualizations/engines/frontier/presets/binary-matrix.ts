import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, pausesOf, source } from '../build'
import type { FNode, FrontierScene, FrontierState } from '../model'
import { binaryMatrix as P } from '../programs/binary-matrix'
import type { FrontierRecording, Pause } from '../programs/types'
import recording from '../recordings/binary-matrix.json'

/**
 * Graph BFS, preset 2 (R4 `binary-matrix-8dir`): the practice answer for
 * Shortest Path in Binary Matrix on [[0,0,0],[1,1,0],[1,1,0]]. The answer
 * keeps a level in `q` and builds the next one in `nq`, so the two lanes
 * are the level divider the code really has; `ans` counts cells, starting
 * at 1, so the call returns 4 for a path of three moves. A visited cell is
 * marked by writing 1 into the grid, the value a wall has: the canvas shows
 * the grid's own values, and draws the walls dashed.
 */

const rec = recording as FrontierRecording
type Cell = [number, number]
type Grid = number[][]

const walls = pausesOf(rec, 'enter')[0].vars.grid as Grid
const size = walls.length
const cells: Cell[] = walls.flatMap((row, i) => row.map((_, j) => [i, j] as Cell))
const cid = ([i, j]: Cell) => `${i}-${j}`
const nid = (c: Cell) => `n-${cid(c)}`
const kid = (c: Cell) => `k-${cid(c)}`
const name = ([i, j]: Cell) => `[${i}, ${j}]`
const has = (xs: readonly Cell[], c: Cell) => xs.some((x) => x[0] === c[0] && x[1] === c[1])

const scene: FrontierScene = {
  kind: 'grid',
  title: 'grid',
  pos: Object.fromEntries(cells.map(([i, j]) => [nid([i, j]), [j, i] as const])),
  lanes: [
    { id: 'q', label: 'q' },
    { id: 'nq', label: 'nq' },
  ],
}

function state(o: { grid: Grid; q: Cell[]; nq: Cell[]; ans: number; current?: Cell; done: readonly Cell[]; console?: string[] }): FrontierState {
  const nodes: FNode[] = cells.map((c) => ({
    id: nid(c),
    label: String(o.grid[c[0]][c[1]]),
    status: walls[c[0]][c[1]]
      ? 'wall'
      : o.current && cid(o.current) === cid(c)
        ? 'current'
        : has(o.done, c)
          ? 'done'
          : has(o.q, c) || has(o.nq, c)
            ? 'frontier'
            : 'idle',
  }))
  return {
    scene,
    nodes,
    edges: [],
    lanes: { q: o.q.map((c) => ({ id: kid(c), label: name(c) })), nq: o.nq.map((c) => ({ id: kid(c), label: name(c) })) },
    vars: [{ name: 'ans', value: String(o.ans) }, ...(o.current ? [{ name: '[i, j]', value: name(o.current) }] : [])],
    console: o.console ?? [],
  }
}

const steps: Step<FrontierState>[] = []
const done: Cell[] = []
const pauses = rec.pauses.filter((p) => p.probe !== 'enter')
const v = (p: Pause) => p.vars as { ans: number; q?: Cell[]; nq?: Cell[]; grid: Grid; i?: number; j?: number }

const first = v(pauses[0])
steps.push({
  state: state({ grid: first.grid, q: first.q!, nq: [], ans: first.ans, done }),
  event: 'Start: q holds [0, 0]',
  why: '[0, 0] is open, so it is marked 1 (visited, the same value as a wall) and q starts with it; ans = 1 counts that cell.',
  narration: 'The start cell is marked 1 and q holds [0, 0]; ans is 1.',
  focus: [],
  claim: 'modelled',
})

let askAt = -1
for (let k = 1; k < pauses.length; k++) {
  const p = v(pauses[k])
  if (pauses[k].probe === 'expand') {
    const c: Cell = [p.i!, p.j!]
    if (p.i === size - 1 && p.j === size - 1) {
      done.push(c)
      steps.push({
        state: state({ grid: p.grid, q: p.q!, nq: p.nq!, ans: p.ans, current: c, done, console: [rec.stdout[0]] }),
        event: `Reach ${name(c)}: return ${rec.stdout[0]}`,
        why: `${name(c)} is the goal, so the call returns ans: the path's length in cells, counting the start, not its moves.`,
        narration: `${name(c)} is the goal; the call returns ${rec.stdout[0]}.`,
        line: lines(P, 11, 12),
        focus: [nid(c), 'out-0'],
        claim: 'observed',
        observes: [0],
      })
      break
    }
    const next = v(pauses[k + 1])
    const fresh = next.nq!.filter((x) => !has(p.nq!, x))
    steps.push({
      state: state({ grid: next.grid, q: p.q!, nq: next.nq!, ans: p.ans, current: c, done }),
      event: fresh.length ? `Expand ${name(c)}: mark ${fresh.length}` : `Expand ${name(c)}: nothing new`,
      why: fresh.length
        ? `${name(c)} is not the goal, so its 8 neighbors are checked: ${list(fresh.map(name))} ${fresh.length > 1 ? 'are' : 'is'} 0, so marked 1 and pushed to nq.`
        : `Every neighbor of ${name(c)} is a wall or already marked 1, so nq gets nothing new: a cell is queued once.`,
      narration: fresh.length ? `${list(fresh.map(name))} marked 1 and pushed to nq.` : `Nothing new from ${name(c)}.`,
      line: fresh.length ? lines(P, 16, 18) : line(P, 16),
      focus: fresh.length ? fresh.slice(0, 2).map(kid) : [nid(c)],
      claim: 'modelled',
    })
    done.push(c)
    if (has(fresh, [size - 1, size - 1])) askAt = steps.length - 1
  } else if (pauses[k].probe === 'swap') {
    const lvl = v(pauses[k + 1])
    steps.push({
      state: state({ grid: lvl.grid, q: lvl.q!, nq: [], ans: lvl.ans, done }),
      event: `Next level: ans = ${lvl.ans}`,
      why: `Every cell in nq is one move further, so q = nq starts the next level and ++ans makes the count ${lvl.ans}.`,
      narration: `q takes nq's cells; ans is now ${lvl.ans}.`,
      line: line(P, 23),
      focus: lvl.q!.slice(0, 2).map(kid),
      claim: 'modelled',
    })
    k++
  }
}

// Asked when the goal joins nq; the verdict lands with the return (the run's last output).
const checkpoints: Checkpoint[] = [
  {
    beforeStep: askAt + 1,
    verdict: 'end',
    prompt: '[2, 2] just joined nq. What will the call return?',
    choices: ['3', '4', '5'].map((x) => ({ id: x, label: x, value: x })),
    answer: rec.stdout[0],
    feedback: {
      correct: 'ans counts cells on the path, and it starts at 1.',
      byChoice: { '3': '3 counts moves; ans counts cells, from 1.', '5': 'One more level: ans goes from 3 to 4.' },
    },
    locked: 'Step on to the return.',
    recap: { right: 'It returned {answer}', wrongLead: 'It returned {answer}, not {pick}' },
  },
]

export const binaryMatrixLog: StepLog<FrontierState> = {
  id: 'bfs-dfs-frontier/binary-matrix-8dir',
  schema: 1,
  source: source(P, rec),
  code: code(P),
  steps,
  checkpoints,
  observed: { log: rec.stdout },
}
