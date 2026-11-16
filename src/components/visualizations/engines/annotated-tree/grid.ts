import { monoWidth } from '../../substrates/text-metrics'
import { HEAD, SIZE, W } from './layout'
import type { GridCellView, GridPanel } from './model'
import type { TreeRecording } from './programs/types'

/**
 * Candidate grids (wave 3A, K-way Merge: Find K Pairs with Smallest Sums):
 * row i is nums1[i], column j is nums2[j], each cell its pair's sum. Build:
 * the arrays, the heap after seeding, each pop's (i, j) and the heap after
 * its push are the recorded ones; a cell's state is read from them (in the
 * heap, popped with its pop number), and an arrow runs from a popped cell to
 * the cell its iteration pushed (the heap after the push minus the heap
 * after the pop). The duplicate-producing alternative (push (i + 1, j) and
 * (i, j + 1)) is not a program of the lesson: its panel only names the one
 * cell such a rule reaches from two popped parents, with both arrows; a
 * structural fact the truth test checks, never a recorded run.
 */

type Entry = [number, number, number]

const heapOf = (v: unknown): Entry[] => {
  if (!Array.isArray(v)) throw new Error('grid: the heap was not recorded')
  return v as Entry[]
}
const key = (e: Entry) => `${e[1]},${e[2]}`

export type KPairsRun = {
  nums1: number[]
  nums2: number[]
  seeded: Entry[]
  pops: {
    i: number
    j: number
    pushed: [number, number] | null
    heap: Entry[]
  }[]
  result: string
}

export function kPairsRun(rec: TreeRecording): KPairsRun {
  const first = rec.pauses.find((p) => p.probe === 'test')!
  const nums1 = first.vars.nums1 as number[]
  const nums2 = first.vars.nums2 as number[]
  const pops: KPairsRun['pops'] = []
  for (let k = 0; k < rec.pauses.length; k++) {
    const p = rec.pauses[k]
    if (p.probe !== 'pop') continue
    const after = rec.pauses[k + 1]
    if (after?.probe !== 'next') throw new Error('grid: a pop without its iteration end')
    const before = new Set(heapOf(p.vars.heap).map(key))
    const added = heapOf(after.vars.heap).filter((e) => !before.has(key(e)))
    if (added.length > 1) throw new Error('grid: one iteration pushed more than one cell')
    pops.push({
      i: p.vars.i as number,
      j: p.vars.j as number,
      pushed: added.length ? [added[0][1], added[0][2]] : null,
      heap: heapOf(after.vars.heap),
    })
  }
  return {
    nums1,
    nums2,
    seeded: heapOf(first.vars.heap),
    pops,
    result: rec.stdout[0],
  }
}

const sums = (run: KPairsRun): GridCellView[] => run.nums1.flatMap((a, i) => run.nums2.map((b, j) => ({ i, j, sum: a + b })))
const axes = (run: KPairsRun) => ({
  rows: { name: 'nums1', values: run.nums1 },
  cols: { name: 'nums2', values: run.nums2 },
})

/** After seeding: the heap's cells. */
export function seededPanel(run: KPairsRun, opts: { id: string; heading: string; notes: string[] }): GridPanel {
  const inHeap = new Set(run.seeded.map(key))
  const cells = sums(run).map((c) => (inHeap.has(`${c.i},${c.j}`) ? { ...c, state: 'heap' as const } : c))
  return {
    kind: 'grid',
    id: opts.id,
    heading: opts.heading,
    ...axes(run),
    cells,
    arrows: [],
    mark: 'heap',
    notes: opts.notes,
  }
}

/** After `n` pops: popped cells numbered in pop order, the heap's cells, one arrow per push. */
export function poppedPanel(run: KPairsRun, n: number, opts: { id: string; heading: string; notes: string[] }): GridPanel {
  const pops = run.pops.slice(0, n)
  const order = new Map(pops.map((p, k) => [`${p.i},${p.j}`, k + 1]))
  const inHeap = new Set(pops[pops.length - 1].heap.map(key))
  const cells = sums(run).map((c): GridCellView => {
    const o = order.get(`${c.i},${c.j}`)
    if (o) return { ...c, state: 'popped', order: o }
    return inHeap.has(`${c.i},${c.j}`) ? { ...c, state: 'heap' } : c
  })
  const arrows = pops.flatMap((p) => (p.pushed ? [{ from: [p.i, p.j] as [number, number], to: p.pushed }] : []))
  return {
    kind: 'grid',
    id: opts.id,
    heading: opts.heading,
    ...axes(run),
    cells,
    arrows,
    mark: 'heap',
    notes: opts.notes,
  }
}

/**
 * The alternative rule's first collision: the cell (1, 1) is the down
 * neighbour of (0, 1) and the right neighbour of (1, 0), so pushing both
 * neighbours of every pop reaches it twice. Values are the run's sums.
 */
export function twicePanel(run: KPairsRun, opts: { id: string; heading: string; notes: string[] }): GridPanel {
  const into: [number, number] = [1, 1]
  const parents: [number, number][] = [
    [into[0] - 1, into[1]],
    [into[0], into[1] - 1],
  ]
  const cells = sums(run).map((c): GridCellView => {
    if (c.i === into[0] && c.j === into[1]) return { ...c, state: 'twice' }
    return parents.some(([i, j]) => i === c.i && j === c.j) ? { ...c, state: 'pop' } : c
  })
  return {
    kind: 'grid',
    id: opts.id,
    heading: opts.heading,
    ...axes(run),
    cells,
    arrows: parents.map((from) => ({ from, to: into })),
    mark: 'twice',
    notes: opts.notes,
  }
}

// ---------------------------------------------------------------------------
// Layout: an addition table, `+` in the corner, row values (nums1) in the
// gutter, column values (nums2) over the cells.
// ---------------------------------------------------------------------------

export const GRID = {
  cell: { w: 52, h: 38 },
  /** Room between cells for a push arrow. */
  gap: 24,
  header: 18,
  gutterGap: 10,
  top: 4,
  arrowInset: 3,
  notesGap: 10,
} as const

export type GridGeometry = {
  width: number
  height: number
  x: number[]
  y: number[]
  gutter: number
  headerY: number
  notesTop: number
}

/** The label a cell carries under its sum (state is never colour alone). */
export function cellLabel(c: GridCellView): string {
  if (c.state === 'heap') return 'heap'
  if (c.state === 'popped') return `pop ${c.order}`
  if (c.state === 'pop') return 'pop'
  if (c.state === 'twice') return 'twice'
  return ''
}

export function layoutGrid(p: GridPanel): GridGeometry {
  const gutter = Math.ceil(Math.max(...p.rows.values.map((v) => monoWidth(String(v), SIZE.small)))) + GRID.gutterGap
  const x = p.cols.values.map((_, j) => gutter + j * (GRID.cell.w + GRID.gap))
  const headerY = HEAD + GRID.top + 12
  const top = HEAD + GRID.top + GRID.header
  const y = p.rows.values.map((_, i) => top + i * (GRID.cell.h + GRID.gap))
  const drawn = y[y.length - 1] + GRID.cell.h
  const notesTop = drawn + GRID.notesGap
  return {
    width: W,
    height: notesTop + p.notes.length * SIZE.line,
    x,
    y,
    gutter,
    headerY,
    notesTop,
  }
}
