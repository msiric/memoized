import type { StateIntrospection } from '../../step-log/types'

/**
 * The linked-list pointer-rewiring notional machine (R4 shared visual 3):
 * nodes stay where they were created, each node's `next` is one arrow, and
 * every pointer variable is a tag in its own lane, under (or over) the node
 * it holds. A variable that holds `null` sits in the null column at the end
 * of the row. Nothing here is computed from code: every state is built from
 * a recorded run (`build.ts`), and the truth test re-records it.
 */

export type LLNode = {
  id: string
  /** The node's value as the program prints it. */
  label: string
}

/** A pointer variable in scope: the node index it holds, or null. */
export type LLPointer = { name: string; at: number | null }

/** Which lanes the preset draws, nearest the row last above and first below. */
export type LLLanes = { above: readonly string[]; below: readonly string[] }

export type LLState = {
  nodes: readonly LLNode[]
  /** Per node: the index its `next` holds, or null. */
  next: readonly (number | null)[]
  /** The pointer variables in scope at this point, in lane order. */
  pointers: readonly LLPointer[]
  /** Constant for a preset: the lane of every variable it ever shows. */
  lanes: LLLanes
  /** What the program has printed so far (the observed trace). */
  output: readonly string[]
}

export const nodeId = (i: number) => `n${i}`
export const linkId = (i: number) => `link-${i}`
export const pointerId = (name: string) => `p-${name}`
export const outId = (k: number) => `out-${k}`
export const NULL_ID = 'null'
export const OUTPUT_ID = 'output'

export const linkedListIntrospection: StateIntrospection<LLState> = {
  ids(state) {
    const ids = new Set<string>([NULL_ID, OUTPUT_ID])
    state.nodes.forEach((_, i) => {
      ids.add(nodeId(i))
      ids.add(linkId(i))
    })
    for (const p of state.pointers) ids.add(pointerId(p.name))
    state.output.forEach((_, k) => ids.add(outId(k)))
    return ids
  },
  observedLog: (state) => state.output,
}

/** The node index `name` holds in `state` (undefined when it is not in scope). */
export function pointerAt(state: LLState, name: string): number | null | undefined {
  return state.pointers.find((p) => p.name === name)?.at
}

/**
 * The walk from `start` along `next`: the visited indices, ending with the
 * first repeated index when the walk loops (so a cycle reads `1 4 3 2 1`).
 */
export function walk(state: Pick<LLState, 'next'>, start: number | null): { order: number[]; loops: boolean } {
  const order: number[] = []
  const seen = new Set<number>()
  let at = start
  while (at !== null && at !== undefined) {
    order.push(at)
    if (seen.has(at)) return { order, loops: true }
    seen.add(at)
    at = state.next[at]
  }
  return { order, loops: false }
}

const label = (state: LLState, i: number | null) => (i === null ? 'null' : state.nodes[i].label)

/**
 * Nodes with repeated values (a palindrome's 1, 2, 2, 1) are told apart by
 * their position: "the second 2".
 */
export function nodeName(state: Pick<LLState, 'nodes'>, i: number): string {
  const v = state.nodes[i].label
  const same = state.nodes.flatMap((n, k) => (n.label === v ? [k] : []))
  if (same.length < 2) return v
  const ord = ['first', 'second', 'third', 'fourth'][same.indexOf(i)] ?? `#${same.indexOf(i) + 1}`
  return `the ${ord} ${v}`
}

/** The stage's accessible name: every link and every pointer (spec §5.3). */
export function describeLinkedList(state: LLState): string {
  const links = state.nodes
    .map((n, i) => `${nodeName(state, i)} points to ${state.next[i] === null ? 'null' : nodeName(state, state.next[i]!)}`)
    .join(', ')
  const ptrs = state.pointers.length
    ? state.pointers.map((p) => `${p.name} is ${p.at === null ? 'null' : `on ${nodeName(state, p.at)}`}`).join(', ')
    : 'no pointers yet'
  const out = state.output.length ? ` Output: ${state.output.join(' ')}.` : ''
  return `Links: ${links}. Pointers: ${ptrs}.${out}`
}

export { label as nodeLabel }
