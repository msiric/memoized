import type { Point } from '../../substrates/box-arrow'
import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W, W_WIDE } from './layout'
import type { CallNode, CallPanel } from './model'
import type { TreePause, TreeRecording } from './programs/types'

/**
 * Call trees (wave 3A, Backtracking): a take/skip recursion's calls, rebuilt
 * from the recorded pre-order and drawn left to right.
 *
 * Build: the recorder pauses at every call's entry (`call`: i, s, t) and at
 * the two returns that end a call with no children (`answer`, `cut`). A
 * call followed at once by its own `answer` or `cut` is a leaf; any other
 * call made exactly two calls, skip then take (the code's order), so the
 * pre-order alone fixes the tree. Nothing is computed: each node's (i, s, t)
 * and each cut's compared candidate are read from the recording; the build
 * only links them, and the truth test checks every link against the rule
 * the figure states (skip: i + 1, same s; take: same i, s - c[i]).
 *
 * Layout: a column per depth, a row per leaf in call order; a node sits on
 * its first (skip) child's row, so a skip is a straight edge and a take
 * bends down to its child's row, labelled with the candidate it adds.
 */

const num = (v: unknown, what: string): number => {
  if (typeof v !== 'number') throw new Error(`calls: ${what} is not a recorded number (${JSON.stringify(v)})`)
  return v
}
const nums = (v: unknown, what: string): number[] => {
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'number')) throw new Error(`calls: ${what} is not a recorded number list`)
  return v as number[]
}

export const callLabel = (n: Pick<CallNode, 'i' | 's'>) => `${n.i},${n.s}`
export const pathText = (t: readonly number[]) => `[${t.join(',')}]`
/** What a cut leaf says under its box: the comparison that failed, or that i ran past the candidates. */
export const cutText = (n: CallNode) => (n.end?.kind !== 'cut' ? '' : n.end.index ? `i = ${n.end.n}` : `${n.s} < ${n.end.c}`)

export function callNodes(rec: TreeRecording): {
  candidates: number[]
  nodes: CallNode[]
} {
  const ps: TreePause[] = rec.pauses.filter((p) => p.probe !== 'pop')
  const first = ps[0]
  if (first?.probe !== 'call') throw new Error('calls: the first pause is not a call')
  const candidates = nums(first.vars.candidates, 'candidates')
  const nodes: CallNode[] = []
  let k = 0
  const parse = (parent: CallNode | null, edge: CallNode['edge']): void => {
    const p = ps[k++]
    if (p?.probe !== 'call') throw new Error(`calls: pause ${k - 1} is ${p?.probe}, not a call`)
    const node: CallNode = {
      id: `c${nodes.length}`,
      i: num(p.vars.i, 'i'),
      s: num(p.vars.s, 's'),
      t: nums(p.vars.t, 't'),
      parent: parent?.id ?? null,
      edge,
    }
    if (edge === 'take') node.took = candidates[parent!.i]
    nodes.push(node)
    const next = ps[k]
    if (next && next.probe !== 'call' && next.vars.i === node.i && next.vars.s === node.s) {
      k++
      if (next.probe === 'answer') node.end = { kind: 'answer' }
      else if (next.vars.c === null || next.vars.c === undefined) node.end = { kind: 'cut', index: true, n: num(next.vars.n, 'n') }
      else node.end = { kind: 'cut', c: num(next.vars.c, 'c') }
      return
    }
    parse(node, 'skip')
    parse(node, 'take')
  }
  parse(null, null)
  if (k !== ps.length) throw new Error(`calls: ${ps.length - k} pauses after the root returned`)
  return { candidates, nodes }
}

/** The pop that undoes a take: the first recorded `pop` whose frame is (i, s), with t before it. */
export function popAt(rec: TreeRecording, i: number, s: number): number[] | null {
  const p = rec.pauses.find((x) => x.probe === 'pop' && x.vars.i === i && x.vars.s === s)
  return p ? nums(p.vars.t, 't') : null
}

export function callPanel(rec: TreeRecording, opts: { id: string; heading: string; legend: string[]; notes: string[] }): CallPanel {
  const { candidates, nodes } = callNodes(rec)
  return {
    kind: 'calls',
    id: opts.id,
    heading: opts.heading,
    candidates,
    nodes,
    legend: opts.legend,
    notes: opts.notes,
  }
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export const CALLS = {
  box: 22,
  boxPad: 6,
  rowPitch: 40,
  /** Baseline of the line under a box (t, or a cut's reason), from the box's top. */
  under: 22 + 13,
  top: 6,
  /** Where a take's bend turns down: this far right of its parent's box. */
  trunk: 8,
  corner: 6,
  /** Gap between a take's bend and its label (left of the bend, on the child's row). */
  labelGap: 4,
  notesGap: 8,
} as const

const smallW = (t: string) => Math.ceil(monoWidth(t, SIZE.small))
const valueW = (t: string) => Math.ceil(monoWidth(t, SIZE.value))

export type CallBox = {
  id: string
  x: number
  y: number
  w: number
  row: number
  depth: number
}
export type CallEdge = {
  to: string
  points: Point[]
  label?: { x: number; y: number; text: string }
}
export type CallGeometry = {
  width: number
  height: number
  boxes: Record<string, CallBox>
  edges: CallEdge[]
  top: number
  notesTop: number
}

/** The line under a node: its path t, or a cut's reason. */
export const underText = (n: CallNode) => (n.end?.kind === 'cut' ? cutText(n) : pathText(n.t))

export function layoutCalls(p: CallPanel, variant: 'narrow' | 'wide'): CallGeometry {
  const width = variant === 'wide' ? W_WIDE : W
  const kids = (id: string) => p.nodes.filter((n) => n.parent === id)
  const depth: Record<string, number> = {}
  for (const n of p.nodes) depth[n.id] = n.parent ? depth[n.parent] + 1 : 0
  // Rows: leaves in call order; a node takes its first child's row.
  const row: Record<string, number> = {}
  let leaves = 0
  for (const n of p.nodes) if (!kids(n.id).length) row[n.id] = leaves++
  for (const n of [...p.nodes].reverse()) if (row[n.id] === undefined) row[n.id] = row[kids(n.id)[0].id]
  const boxW = Math.max(...p.nodes.map((n) => valueW(callLabel(n)))) + 2 * CALLS.boxPad
  const maxDepth = Math.max(...Object.values(depth))
  // The last column must hold its widest line under a box, centred on the box.
  const lastNeed = Math.max(boxW, ...p.nodes.filter((n) => depth[n.id] === maxDepth).map((n) => smallW(underText(n)))) / 2
  const firstNeed = Math.max(boxW, ...p.nodes.filter((n) => depth[n.id] === 0).map((n) => smallW(underText(n)))) / 2
  const pitch = (width - firstNeed - lastNeed) / maxDepth
  const top = HEAD + p.legend.length * SIZE.line + CALLS.top
  const boxes: Record<string, CallBox> = {}
  for (const n of p.nodes) {
    const cx = firstNeed + depth[n.id] * pitch
    boxes[n.id] = {
      id: n.id,
      x: cx - boxW / 2,
      y: top + row[n.id] * CALLS.rowPitch,
      w: boxW,
      row: row[n.id],
      depth: depth[n.id],
    }
  }
  const edges: CallEdge[] = []
  for (const n of p.nodes) {
    if (!n.parent) continue
    const a = boxes[n.parent]
    const b = boxes[n.id]
    const ay = a.y + CALLS.box / 2
    const by = b.y + CALLS.box / 2
    const sx = a.x + a.w
    if (n.edge === 'skip') {
      edges.push({
        to: n.id,
        points: [
          { x: sx, y: ay },
          { x: b.x, y: by },
        ],
      })
      continue
    }
    const tx = sx + CALLS.trunk
    // The take's label: the candidate added, left of the bend on the child's row (that column is empty there).
    const label = { x: tx - CALLS.labelGap, y: by + 4, text: `+${n.took}` }
    edges.push({
      to: n.id,
      points: [
        { x: sx, y: ay },
        { x: tx, y: ay },
        { x: tx, y: by },
        { x: b.x, y: by },
      ],
      label,
    })
  }
  const drawn = top + (leaves - 1) * CALLS.rowPitch + CALLS.under + 4
  const notesTop = drawn + CALLS.notesGap
  return {
    width,
    height: notesTop + p.notes.length * SIZE.line,
    boxes,
    edges,
    top,
    notesTop,
  }
}
