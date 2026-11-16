import type { StateIntrospection } from '../../step-log/types'
import type { WindowNames } from './program'

/**
 * The sliding-window notional machine (R4 shared visual 2): the string as a
 * row of cells that never move, the window as a bracket band under the cells
 * from the left edge to the right edge (each edge a tag named as the code
 * names it), what the window keeps beside it (a count map's `key: count`
 * entries, or a Set's members) and the best length so far. Nothing here is
 * computed from code: every state is a pause of a recorded run (`build.ts`),
 * and the truth test re-records it.
 */

export type StoreEntry = { key: string; count?: number }

export type SWState = {
  /** The string the window slides over (recorded). */
  text: string
  names: WindowNames
  /** The count map's most distinct keys (`K`), recorded; absent for a Set. */
  k?: number
  left: number
  /** The right edge's index, or null before the first character is read. */
  right: number | null
  /**
   * The right edge's character is read but not in the store yet: the Set
   * version deletes from the left before it adds the new character.
   */
  pending: boolean
  /** The store in insertion order (a map's keys, a Set's members). */
  store: readonly StoreEntry[]
  best: number
  /** What the program has printed (the observed trace). */
  output: readonly string[]
}

export const cellId = (i: number) => `cell-${i}`
export const keyId = (key: string) => `key-${key}`
export const LEFT_ID = 'edge-left'
export const RIGHT_ID = 'edge-right'
export const WINDOW_ID = 'window'
export const BEST_ID = 'best'
export const OUTPUT_ID = 'output'

/** The window's length as the code computes it (`right - left + 1`), 0 before the first read. */
export const windowLength = (s: Pick<SWState, 'left' | 'right'>) => (s.right === null ? 0 : s.right - s.left + 1)

/** The characters the window spans, in order. */
export const windowText = (s: Pick<SWState, 'left' | 'right' | 'text'>) => (s.right === null ? '' : s.text.slice(s.left, s.right + 1))

export const swIntrospection: StateIntrospection<SWState> = {
  ids(state) {
    const ids = new Set<string>([LEFT_ID, WINDOW_ID, BEST_ID, OUTPUT_ID])
    if (state.right !== null) ids.add(RIGHT_ID)
    for (let i = 0; i < state.text.length; i++) ids.add(cellId(i))
    for (const e of state.store) ids.add(keyId(e.key))
    return ids
  },
  observedLog: (state) => state.output,
  region: (_state, id) => (id.startsWith('key-') ? 'store' : undefined),
}

const quote = (t: string) => `"${t}"`

/** The store in words: `a: 2, c: 1` or `w, k, e`. */
export function storeText(state: Pick<SWState, 'store'>): string {
  if (!state.store.length) return 'empty'
  return state.store.map((e) => (e.count === undefined ? e.key : `${e.key}: ${e.count}`)).join(', ')
}

/** The stage's accessible name: the window, what it keeps and the best length (spec §5.3). */
export function describeWindow(state: SWState): string {
  const { names } = state
  const win =
    state.right === null
      ? `No character read yet; ${names.left} is ${state.left}.`
      : `The window is ${quote(windowText(state))}, ${names.left} ${state.left} to ${names.right} ${state.right}${state.pending ? `, with ${quote(state.text[state.right])} read but not in ${names.store} yet` : ''}.`
  const keep = `${names.store} holds ${storeText(state)}${state.k !== undefined ? ` (${state.store.length} keys, K is ${state.k})` : ''}.`
  const out = state.output.length ? ` Output: ${state.output.join(' ')}.` : ''
  return `String ${quote(state.text)}. ${win} ${keep} ${names.best} is ${state.best}.${out}`
}
