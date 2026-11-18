import type { EngineLayout, PerVariant, Variant } from '../../shell/types'
import type { StepLog } from '../../step-log/types'
import { monoWidth, sansWidth } from '../../substrates/text-metrics'
import { SLOTS, TABS, tabText, workerLabel, type SwState } from './model'

/**
 * Service-worker stage geometry (D16 rules, as the frames'). No code pane:
 * the run is the browser's lifecycle, not lines of the reader's code. Every
 * band exists on every step (an empty slot says "empty", a closed tab
 * "closed"), so nothing appears or disappears mid-run, and every band is one
 * chip row high, checked here against every step's widest label.
 *
 * narrow (< 768): the two tabs side by side, the registration's three slots
 *   stacked (installing, waiting, active: a worker card travels down them,
 *   and a redundant one leaves the active slot downward), then Cache
 *   Storage. Sized so the tabs, the slots, the
 *   caption and Next fit a 375x667 phone under the site header (Q15).
 * wide (>= 768): the tabs and Cache Storage on the left, the slots on the
 *   right.
 *
 * All lengths are px at the default 16 px root and rendered in rem (D19).
 */

export const G = {
  gap: 8,
  columnGap: 16,
  pad: 8,
  padNarrow: 6,
  border: 1,
  laneInset: 6,
  label: 16,
  labelGap: 4,
  chip: 28,
  chipGap: 8,
  /** Chip values: mono 13 (`type.value`); tight frame mono 12. */
  text: 13,
  small: 12,
} as const

export const STAGE_MIN: PerVariant<number> = { narrow: 288, wide: 606 }
/** The narrow stage under very large text on a phone (`vz-tight`), px at the default root (as the frames'). */
export const STAGE_TIGHT = 200
/** A lane's chip room in the tight frame (as the frames' `TIGHT_LANE_IN`). */
export const TIGHT_LANE_IN = 174

const chipWidth = (label: string, size: number = G.text, pad = 6) => Math.ceil(monoWidth(label, size) + 2 * pad + 2 * G.border)
const laneIn = (w: number) => w - 2 * G.laneInset - 2 * G.border

/** A band: border, padding, the label line, its gap and one chip row. */
export const band = (pad: number) => 2 * G.border + 2 * pad + G.label + G.labelGap + G.chip

export type SwMetrics = {
  band: PerVariant<number>
  /** The right column's slot stack (wide) and the left column's tabs and caches. */
  slots: PerVariant<number>
  side: PerVariant<number>
}

/** Width problems over every step: a chip or tab text that would not fit its band on one row at the tight frame. */
export function fitProblems(logs: readonly StepLog<SwState>[]): string[] {
  const out: string[] = []
  // A tab card in the tight frame: half the stage, 4 px insets (`vz-tight:px-1`) and a 1 px border.
  const tab = (STAGE_TIGHT - G.gap) / 2 - 2 * 4 - 2 * G.border
  for (const log of logs)
    log.steps.forEach(({ state }, i) => {
      for (const s of SLOTS) {
        const ws = state.slots[s].map((w) => chipWidth(workerLabel(w), G.small, 2))
        if (ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * G.chipGap > TIGHT_LANE_IN) out.push(`${log.id} step ${i}: ${s} overflows`)
      }
      const cs = state.caches.map((c) => chipWidth(c, G.small, 2))
      if (cs.reduce((a, b) => a + b, 0) + (cs.length - 1) * G.chipGap > TIGHT_LANE_IN) out.push(`${log.id} step ${i}: caches overflow`)
      for (const t of TABS) {
        const text = tabText(state.tabs[t])
        const w = text.startsWith('→') ? chipWidth(text, G.small, 2) : Math.ceil(sansWidth(text, G.small))
        if (w > tab) out.push(`${log.id} step ${i}: tab ${t} "${text}" is ${w}px > ${tab}`)
      }
    })
  return out
}

export function swMetrics(logs: readonly StepLog<SwState>[]): SwMetrics & { layout: EngineLayout } {
  const per = <T>(f: (v: Variant) => T): PerVariant<T> => ({ narrow: f('narrow'), wide: f('wide') })
  const problems = fitProblems(logs)
  if (problems.length) throw new Error(`sw-lifecycle: ${problems.join('; ')}`)
  // One chip row per band on a 375 phone too (the narrow lane room), checked with full-size chips.
  for (const log of logs)
    for (const { state } of log.steps) {
      const cs = state.caches.map((c) => chipWidth(c))
      if (cs.reduce((a, b) => a + b, 0) + (cs.length - 1) * G.chipGap > laneIn(STAGE_MIN.narrow)) throw new Error('sw-lifecycle: caches overflow at 320')
    }
  const b = per((v) => band(v === 'wide' ? G.pad : G.padNarrow))
  const slots = per((v) => SLOTS.length * b[v] + (SLOTS.length - 1) * G.gap)
  const side = per((v) => 2 * b[v] + G.gap)
  const stage = {
    // Tabs, the four slots, Cache Storage.
    narrow: b.narrow + G.gap + slots.narrow + G.gap + b.narrow,
    wide: Math.max(slots.wide, side.wide),
  }
  const metrics: SwMetrics = { band: b, slots, side }
  return { ...metrics, layout: { stage, codeRows: { narrow: 0, wide: 0 }, detail: metrics } }
}
