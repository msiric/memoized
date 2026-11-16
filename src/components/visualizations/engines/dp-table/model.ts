import type { StateIntrospection } from '../../step-log/types'

/**
 * The dp-table notional machine (R4 shared visual 6, `dp-table-dependencies`):
 * a 1D table as a row of cells that never move, the current item and index,
 * and the one dependency each write has: cell `j` is written from cell
 * `j - x`, drawn as an arrow from the cell read to the cell written. Cells
 * written for the current item carry a "this item" bar, so a read of such a
 * cell (the item used a second time) shows as an arrow leaving a barred
 * cell. Nothing here is computed from code: every state is a pause of a
 * recorded run (`build.ts`), and the truth test re-records it.
 */

export type DPState = {
  /** The items (recorded). */
  nums: readonly number[]
  /** The table after this step's write (recorded at the next pause). */
  f: readonly boolean[]
  /** The current item, or null before the first. */
  x: number | null
  /** The index just written, or null when no write is on screen. */
  j: number | null
  /** The cell the write read (`j - x`), or null. */
  read: number | null
  /** Cells written so far for the current item, in write order. */
  pass: readonly number[]
  /** The names the code gives the table, the item and the index. */
  names: { table: string; item: string; index: string; target: string }
  /** What the program has printed (the observed trace). */
  output: readonly string[]
}

export const cellId = (i: number) => `cell-${i}`
export const J_ID = 'tag-j'
export const READ_ID = 'tag-read'
export const ITEM_ID = 'item'
export const OUTPUT_ID = 'output'

export const dpIntrospection: StateIntrospection<DPState> = {
  ids(state) {
    const ids = new Set<string>([ITEM_ID, OUTPUT_ID])
    for (let i = 0; i < state.f.length; i++) ids.add(cellId(i))
    if (state.j !== null) ids.add(J_ID)
    if (state.read !== null) ids.add(READ_ID)
    return ids
  },
  observedLog: (state) => state.output,
}

/** The true cells, as the sums the table says some subset reaches. */
export const reachable = (f: readonly boolean[]) => f.flatMap((v, i) => (v ? [i] : []))

/** The stage's accessible name: the table, the item, the write and its source (spec §5.3). */
export function describeTable(state: DPState): string {
  const { table: t, item, index } = state.names
  const cells = state.f.map((v, i) => `${t}[${i}] ${v}`).join(', ')
  const at = state.x === null ? 'No item yet.' : `${item} is ${state.x}.`
  const write =
    state.j !== null && state.read !== null
      ? ` ${t}[${state.j}] was written from ${t}[${state.read}]${state.pass.includes(state.read) ? `, which this item already wrote` : ''}.`
      : ''
  const pass = state.pass.length ? ` Written for this item: ${state.pass.map((i) => `${index} ${i}`).join(', ')}.` : ''
  const out = state.output.length ? ` Output: ${state.output.join(' ')}.` : ''
  return `${cells}. ${at}${write}${pass}${out}`
}
