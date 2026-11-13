import { useCallback, useState, type CSSProperties } from 'react'
import { EASE, EASE_CSS, motion, motionRules, reveal, type TweenToken } from '../../primitives/tokens-v3'

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
  /**
   * The travel, before the settle: `baseMs + msPerPx * length`, between
   * `minTravelMs` and `travelMs` (about 240 ms for a phone's 100 px ride,
   * 360 ms for a desktop's 250 px one). Shortened when two checks ride, so
   * the whole moment stays inside `reveal.maxMs`.
   */
  travelMs: 360,
  baseMs: 160,
  msPerPx: 0.8,
  /**
   * H3 R6: a single 120 ms settle (the stage `highlight` duration). It is the
   * last 120 ms of the travel (R2M-04): the rider sets down while it
   * decelerates onto its box, so the landing is the end of the motion and
   * the verdict sequence starts there, with no still frames in between.
   */
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
   * The plan's ceiling, verdict sequence included: the reveal budget less
   * five frames, the measured latency from the last landing to the first
   * beat's first frame (a React commit, then the fade's first frame), so the
   * moment as seen stays inside `reveal.maxMs`.
   */
  maxMs: reveal.maxMs - 80,
} as const

/** H3 R5: verdict, explanation, marks and tally fade in over 160 ms once the payoff lands. */
export const VERDICT_FADE_MS = 160
export const verdictFade = { duration: VERDICT_FADE_MS / 1000, ease: EASE }

/**
 * Q18 (R2M-04, R2M-05, R2M-15): after the last landing the outcome arrives
 * in one ordered sequence, one stagger token (40 ms) per beat, each a 160 ms
 * fade, instead of everything in one frame:
 * - `landing`: the row that received the tracked check takes the lime
 *   landing emphasis (Q9), as the rider sets down;
 * - `badges`: the in-row verdicts, Before and After alike, and an unmounted
 *   instance takes the removed role (a card changes color once);
 * - `verdict`: the dock's verdict, the ✓ and × with the answer emphasis, and
 *   the tally (narrated as it appears);
 * - `history`: the Before boxes show their checks again, as a quiet record of
 *   the starting state (R2M-15), last, so it never reads as a copy.
 */
export const BEAT_MS = motionRules.maxStaggerMs
export const BEAT = { landing: 0, badges: 1, verdict: 2, history: 3 } as const
export type Beat = (typeof BEAT)[keyof typeof BEAT]
/** From the last landing to the last frame of the sequence. */
export const SEQUENCE_MS = BEAT.history * BEAT_MS + VERDICT_FADE_MS

/** A framer transition for a beat: the verdict fade, delayed; instant when not played. */
export const beatFade = (on: boolean, beat: Beat) =>
  on ? { ...verdictFade, delay: (beat * BEAT_MS) / 1000 } : { duration: 0 }

/**
 * The CSS twin for class-driven changes on a beat (borders, fills, colors).
 * Off, the change is instant (`none` lands it in the same frame, D7).
 */
export const beatTransition = (on: boolean, beat: Beat): CSSProperties =>
  on
    ? {
        transitionDuration: `${VERDICT_FADE_MS}ms`,
        transitionDelay: `${beat * BEAT_MS}ms`,
        transitionTimingFunction: EASE_CSS,
      }
    : { transitionProperty: 'none' }

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
  /** Every check has landed: the verdict sequence (`BEAT`) plays. */
  landed: boolean
  /** Fade the verdict in (played, and not landed at once by a resize). */
  fade: boolean
  /** The verdict sequence is playing or has played: beats fade in on their delays. */
  sequence: boolean
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
    sequence: played && !cur.instant && landed,
    arrived: (row) => landed || cur.arrived.includes(row),
    landedRow: (row) => landed || cur.landedRows.includes(row),
    onArrive,
    onLand,
    onLanded,
  }
}
