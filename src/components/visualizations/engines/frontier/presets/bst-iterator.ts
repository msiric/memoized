import type { Checkpoint, Step, StepLog } from '../../../step-log/types'
import { code, line, lines, list, pausesOf, source } from '../build'
import { nodeId, type FEdge, type FNode, type FrontierScene, type FrontierState } from '../model'
import { bstIterator as P } from '../programs/bst-iterator'
import type { FrontierRecording } from '../programs/types'
import recording from '../recordings/bst-iterator.json'

/**
 * Trees (R4 `tree-explicit-stack`): the BSTIterator practice answer beside
 * the lesson's BST. The stack is the frontier, drawn bottom first with its
 * top marked. Each next() pops one node; a node with a right child also
 * pushes that child's left spine, so the next smallest value is always on
 * top. The tree is drawn from the shape the run recorded.
 */

const rec = recording as FrontierRecording
type Shape = [number, Shape | null, Shape | null] | null

const tree = pausesOf(rec, 'push')[0].vars.tree as Shape
const pos: Record<string, readonly [number, number]> = {}
const edges: FEdge[] = []
const order: number[] = []
const right: Record<number, number | undefined> = {}
;(function walk(s: Shape, depth: number, parent?: number) {
  if (!s) return
  const [v, l, r] = s
  walk(l, depth + 1, v)
  pos[nodeId(v)] = [order.length, depth]
  order.push(v)
  right[v] = r?.[0]
  if (parent !== undefined) edges.push({ id: `e-${parent}-${v}`, from: nodeId(parent), to: nodeId(v) })
  walk(r, depth + 1, v)
})(tree, 0)

const scene: FrontierScene = {
  kind: 'tree',
  title: 'BST',
  pos,
  lanes: [{ id: 'stack', label: 'this.stack', vertical: true }],
}
const chip = (v: number) => ({ id: `k-${v}`, label: String(v) })

function state(o: { stack: number[]; current?: number; done: readonly number[]; console: string[] }): FrontierState {
  const nodes: FNode[] = order.map((v) => ({
    id: nodeId(v),
    label: String(v),
    status: v === o.current ? 'current' : o.done.includes(v) ? 'done' : o.stack.includes(v) ? 'frontier' : 'idle',
  }))
  return {
    scene,
    nodes,
    edges,
    lanes: { stack: o.stack.map(chip) },
    vars: o.current !== undefined ? [{ name: 'res', value: String(o.current) }] : [],
    console: [...o.console],
  }
}

const steps: Step<FrontierState>[] = []
const done: number[] = []
const out: string[] = []
const spineOf = pausesOf(rec, 'push').map((p) => p.vars.cur as number)
const ctor = pausesOf(rec, 'pop')[0].vars.stack as number[]
steps.push({
  state: state({ stack: ctor, done, console: out }),
  event: `Constructor: push ${list(spineOf.map(String))}`,
  why: `The constructor pushes the root and keeps going left, so the smallest value, ${ctor[ctor.length - 1]}, is on top.`,
  narration: `The stack holds ${list(ctor.map(String))}, with ${ctor[ctor.length - 1]} on top.`,
  focus: [],
  claim: 'modelled',
})

let reveal = -1
const pauses = rec.pauses
let observed = 0
for (let k = 0; k < pauses.length; k++) {
  if (pauses[k].probe !== 'popped') continue
  const { res } = pauses[k].vars as { res: number }
  const spine: number[] = []
  let j = k + 1
  while (pauses[j].probe === 'spine') spine.push(pauses[j++].vars.cur as number)
  const after = pauses[j].vars.stack as number[]
  if (spine.length) {
    if (res === 20) reveal = steps.length
    steps.push({
      state: state({ stack: after, current: res, done, console: out }),
      event: `Pop ${res}, push ${list(spine.map(String))}`,
      why: `${res} has a right child, ${right[res]}, so next() pushes it and its left spine: the next smallest is on top again.`,
      narration: `${res} is popped; ${list(spine.map(String))} ${spine.length > 1 ? 'are' : 'is'} pushed.`,
      line: lines(P, 24, 29),
      focus: spine.slice(-2).map((v) => chip(v).id),
      claim: 'modelled',
    })
  }
  done.push(res)
  out.push(rec.stdout[observed])
  const last = after.length === 0
  steps.push({
    state: state({ stack: after, done, console: [...out] }),
    event: spine.length ? `Return ${res}` : `next() returns ${res}`,
    why: last
      ? 'The stack is empty, so hasNext() is false: each node was pushed once and popped once, so next() is O(1) amortized.'
      : spine.length
        ? `next() returns ${res}; the stack already holds what comes after it, smallest on top.`
        : `${res} was on top, so next() pops it; it has no right child, so nothing is pushed.`,
    narration: `next() returns ${res}.`,
    line: spine.length ? line(P, 32) : lines(P, 24, 25),
    focus: [`out-${observed}`],
    claim: 'observed',
    observes: [observed],
  })
  observed++
}

// Asked as next() is about to pop 20 (the stack is [20]); the reveal is the push of its right spine.
const checkpoints: Checkpoint[] = [
  {
    beforeStep: reveal,
    prompt: 'next() pops 20. What is on the stack after the call?',
    choices: [
      { id: 'a', label: '[30]' },
      { id: 'b', label: '[30, 25]' },
      { id: 'c', label: '[25, 30, 35]' },
    ],
    answer: 'b',
    feedback: {
      correct: '30 goes on, then its left spine: 25 on top.',
      byChoice: {
        a: "30's left child 25 is pushed too, on top.",
        c: 'Only the left spine: 35 waits until 30 pops.',
      },
    },
    recap: { right: 'The stack was [30, 25]', wrongLead: 'The stack was [30, 25], not {pick}' },
  },
]

export const bstIteratorLog: StepLog<FrontierState> = {
  id: 'bfs-dfs-frontier/bst-iterator-stack',
  schema: 1,
  source: source(P, rec),
  code: code(P),
  steps,
  checkpoints,
  observed: { log: rec.stdout },
}
