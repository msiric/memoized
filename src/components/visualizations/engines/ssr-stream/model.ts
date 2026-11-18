import type { StateIntrospection } from '../../step-log/types'
import type { Slot, SlotView } from './truth/types'

export type { Slot, SlotView }

/**
 * The ssr-stream notional machine (R4, server-side rendering): three synced
 * panels. The wire (the server's writes, each shown as a few short lines
 * cut from the recorded HTML), the screen (Header and two slots, Product
 * upper and Reviews lower, each showing nothing, its fallback or its
 * content) and a badge per boundary: fallback, HTML hidden (its HTML is on
 * the wire but not revealed yet), static HTML, hydrating, interactive.
 * Every state is a point of a recorded run (`build.ts`): React 19's real
 * stream on Node 24 and what Chromium showed and logged.
 */

export type Badge = 'none' | 'fallback' | 'hidden' | 'static' | 'hydrating' | 'interactive'

export const BADGE_TEXT: Record<Exclude<Badge, 'none'>, string> = {
  fallback: 'fallback',
  hidden: 'HTML hidden',
  static: 'static HTML',
  hydrating: 'hydrating',
  interactive: 'interactive',
}

/** One line of the wire: a cut of one recorded write (`pieces` joined by `…`). */
export type WireLine = { chunk: number; text: string; pieces: readonly string[] }

export type SSRState = {
  mode: 'stream' | 'string'
  /** The time readout: ms of the run, or a phase in words. */
  at: string
  /** The lines on the wire so far (each chunk's lines arrive together). */
  wire: readonly WireLine[]
  /** The response has ended (the last write's last line says so). */
  ended: boolean
  /** The server's writes so far, with their ms (the time column). */
  chunks: readonly { ms: number }[]
  /** The Header has painted. */
  painted: boolean
  slots: Record<Slot, { view: SlotView; badge: Badge }>
  /** The data delay of each slot on the server (the harness's), ms. */
  dataMs: Record<Slot, number>
  /** A click on Reviews' button is waiting (sent, not handled yet). */
  pendingClick: boolean
  /** What the click handler logged (the observed trace). */
  output: readonly string[]
}

export const SLOTS: readonly Slot[] = ['product', 'reviews']
export const SLOT_TITLE: Record<Slot, string> = { product: 'Product', reviews: 'Reviews' }
export const SLOT_BUTTON: Record<Slot, string> = { product: 'Add', reviews: 'Helpful' }

export const chunkId = (k: number) => `wire-${k}`
export const slotId = (s: Slot) => `slot-${s}`
export const SCREEN_ID = 'screen'
export const OUTPUT_ID = 'output'
export const CLICK_ID = 'click'

export const ssrIntrospection: StateIntrospection<SSRState> = {
  ids(state) {
    const ids = new Set<string>([SCREEN_ID, OUTPUT_ID, ...SLOTS.map(slotId)])
    for (let k = 0; k < state.chunks.length; k++) ids.add(chunkId(k))
    if (state.pendingClick) ids.add(CLICK_ID)
    return ids
  },
  observedLog: (state) => state.output,
}

const viewWords = (s: Slot, st: SSRState) => {
  const v = st.slots[s]
  const what = v.view === 'none' ? 'nothing' : v.view === 'fallback' ? `"Loading ${s}"` : `its content`
  return `${SLOT_TITLE[s]} shows ${what}${v.badge === 'none' ? '' : ` (${BADGE_TEXT[v.badge]})`}`
}

/** The stage's accessible name: the wire so far, the screen, each badge and the handler log (spec §5.3). */
export function describeSsr(state: SSRState): string {
  const wire = state.wire.length ? `Wire: ${state.wire.map((l) => l.text).join(' ')}${state.ended ? ' The response has ended' : ''}.` : 'Nothing on the wire yet.'
  const screen = state.painted ? `Screen: Header, ${SLOTS.map((s) => viewWords(s, state)).join(', ')}.` : 'The screen is blank.'
  const click = state.pendingClick ? ' A click on Helpful is waiting.' : ''
  const out = state.output.length ? ` Handler log: ${state.output.join(', ')}.` : ''
  return `At ${state.at}. ${wire} ${screen}${click}${out}`
}
