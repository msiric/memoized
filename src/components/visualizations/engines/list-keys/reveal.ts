import { useCallback, useState } from 'react'
import { EASE, motion, reveal, type TweenToken } from '../../primitives/tokens-v3'

const tween = (t: unknown) => (t as TweenToken).duration * 1000
/** Stage `highlight` (120 ms) and `path` (220 ms), in ms. */
export const HIGHLIGHT_MS = tween(motion.highlight.full)
const PATH_MS = tween(motion.path.full)

/**
 * The list-keys reveal's timeline (D21, H3 R5 and R6), in one place.
 *
 * Local values, each traced to a decision; none is a new role. Merge note
 * (H3 F2): when tokens-v3 carries the shared reveal timing (F1, R5), point
 * `VERDICT_FADE_MS` at it.
 */
export const RIDE = {
  /** The travel, before the settle. Shortened when two checks ride, so the whole moment stays inside `reveal.maxMs`. */
  travelMs: 360,
  /** H3 R6: a single 120 ms settle on landing (the stage `highlight` duration). */
  settleMs: HIGHLIGHT_MS,
  /**
   * H3 R6: the rider and the lines share one easing, the reveal's own ride
   * curve (the platform's ease-in-out, `reveal.ride.ease`). The stage curve
   * (`EASE`) spends half its time on the last few pixels, which left the
   * rider visibly parked for 200 ms before its settle.
   */
  ease: reveal.ride.ease,
  /** The rider lifts this much (scale) with the lift shadow (D6) while it travels. */
  liftScale: 0.12,
  /** Shortest travel when the budget forces it shorter. */
  minTravelMs: 220,
  /** A second rider never leaves sooner than this after the first (the order reads). */
  minGapMs: 80,
  /** Riders keep this many of their own widths apart, so the second waits for the first to clear a crossing (H3 R6). */
  clearance: 1.5,
  /**
   * The plan's ceiling: the reveal budget less five frames, the measured
   * latency from the last landing to the verdict's first frame (a React
   * commit, then the fade's first frame), so the moment as seen stays
   * inside `reveal.maxMs`.
   */
  maxMs: reveal.maxMs - 80,
} as const

/** H3 R5: verdict, explanation, marks and tally fade in over 160 ms once the payoff lands. */
export const VERDICT_FADE_MS = 160
export const verdictFade = { duration: VERDICT_FADE_MS / 1000, ease: EASE }

/** The wrapper scene has no rider: its lines and state chip draw on the stage `path` token. */
export const WRAPPER_DRAW_MS = PATH_MS

/** What the stage and the dock read about the reveal in progress. */
export type RevealView = {
  /** Keys the director and the lines to one reveal. */
  key: string
  /** This reveal animates (full motion, a deliberate answer or skip). */
  played: boolean
  /** The director runs: played and not yet landed. */
  directing: boolean
  /** Every check has landed: the verdict, marks, badges and tally show. */
  landed: boolean
  /** Fade the verdict in (played, and not landed at once by a resize). */
  fade: boolean
  /** A row's line has reached it: its instance shows. */
  arrived: (row: string) => boolean
  /** A row's carried check has settled into it. */
  landedRow: (row: string) => boolean
  onArrive: (row: string) => void
  onLand: (row: string) => void
  onLanded: (instant: boolean) => void
}

type Progress = { key: string; arrived: readonly string[]; landedRows: readonly string[]; landed: boolean; instant: boolean }
const EMPTY: Progress = { key: '', arrived: [], landedRows: [], landed: false, instant: false }

export function useRevealView(key: string, played: boolean): RevealView {
  const [p, setP] = useState<Progress>(EMPTY)
  const cur = p.key === key ? p : EMPTY
  const landed = !played || cur.landed
  const add = (list: 'arrived' | 'landedRows') => (row: string) =>
    setP((q) => {
      const base = q.key === key ? q : { ...EMPTY, key }
      return base[list].includes(row) ? base : { ...base, [list]: [...base[list], row] }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onArrive = useCallback(add('arrived'), [key])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onLand = useCallback(add('landedRows'), [key])
  const onLanded = useCallback(
    (instant: boolean) =>
      setP((q) => ({ ...(q.key === key ? q : { ...EMPTY, key }), landed: true, instant })),
    [key],
  )
  return {
    key,
    played,
    directing: played && !landed,
    landed,
    fade: played && !cur.instant,
    arrived: (row) => landed || cur.arrived.includes(row),
    landedRow: (row) => landed || cur.landedRows.includes(row),
    onArrive,
    onLand,
    onLanded,
  }
}
