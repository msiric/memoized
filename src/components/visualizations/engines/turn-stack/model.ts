import type { StateIntrospection } from '../../step-log/types'
import type { Pt } from './programs/types'

export type { Pt }

/**
 * The turn-stack notional machine (R4 convex hull, `monotone-chain-turn-pops`):
 * the points on a plot that never moves, each chain of Andrew's monotone
 * chain as a stack drawn as a polyline through its points in stack order,
 * and the one turn test each step stands on: the stack's top two points
 * (`o`, `a`) and the arriving point (`p`), joined by the turn arrow, with
 * the answer's own `cross(o, a, p)` in the side panel. A negative cross is a
 * right turn and pops `a` (with `<= 0`, a straight line pops it too).
 * Nothing here is computed from code: every state is a pause of a recorded
 * run (`build.ts`), and the truth test re-records it.
 */

export type Turn = {
  o: Pt
  a: Pt
  /** The arriving point. */
  p: Pt
  /** `cross(o, a, p)` as the answer computed it in the paused frame. */
  cross: number
  /** The loop popped `a` on this test (the comparison held). */
  pops: boolean
}

export type HullState = {
  /** The points in the order the chains read them: sorted by x, then y (recorded after the sort). */
  points: readonly Pt[]
  /** The chain being built, or `hull` once both are trimmed and joined; null at Start. */
  chain: 'lower' | 'upper' | 'hull' | null
  /** The lower chain's stack after this step (bottom first). */
  lower: readonly Pt[]
  /** The upper chain's stack after this step, or null before it starts. */
  upper: readonly Pt[] | null
  /** The point the loop is placing, or null. */
  p: Pt | null
  /** The turn test this step stands on, or null (fewer than two points on the stack). */
  turn: Turn | null
  /** The point this step popped, or null. */
  popped: Pt | null
  /** The comparison the program pops on: `<` keeps collinear points, `<=` drops them. */
  op: '<' | '<='
  /** What the program has printed (the observed trace). */
  output: readonly string[]
}

export const key = (p: Pt) => `${p[0]},${p[1]}`
export const label = (p: Pt) => `(${p[0]},${p[1]})`
export const pointId = (p: Pt) => `pt-${p[0]}-${p[1]}`
export const TURN_ID = 'turn'
export const CHAIN_ID = 'chain'
export const OUTPUT_ID = 'output'

/** The current chain's stack (the hull's points once joined: upper then lower, as the answer concatenates them). */
export function stackOf(s: HullState): readonly Pt[] {
  if (s.chain === 'upper') return s.upper ?? []
  if (s.chain === 'hull') return [...(s.upper ?? []), ...s.lower]
  return s.lower
}

export const turnWord = (cross: number) => (cross > 0 ? 'left' : cross < 0 ? 'right' : 'straight')
/** A signed value as the panel shows it (a true minus sign). */
export const signed = (n: number) => (n < 0 ? `−${-n}` : String(n))

export const hullIntrospection: StateIntrospection<HullState> = {
  ids(state) {
    const ids = new Set<string>([CHAIN_ID, OUTPUT_ID])
    for (const p of state.points) ids.add(pointId(p))
    if (state.turn) ids.add(TURN_ID)
    return ids
  },
  observedLog: (state) => state.output,
}

/** The stage's accessible name: the chain, its stack, the turn test and the verdict (spec §5.3). */
export function describeHull(s: HullState): string {
  const pts = `Points in sorted order: ${s.points.map(label).join(', ')}.`
  const lower = s.lower.length ? ` Lower chain: ${s.lower.map(label).join(', ')}.` : ''
  const upper = s.upper?.length ? ` Upper chain: ${s.upper.map(label).join(', ')}.` : ''
  const turn = s.turn
    ? ` cross(${label(s.turn.o)}, ${label(s.turn.a)}, ${label(s.turn.p)}) is ${s.turn.cross}, a ${turnWord(s.turn.cross)} turn, so ${label(s.turn.a)} ${s.turn.pops ? 'is popped' : 'stays'}.`
    : ''
  const placed = s.p && !s.popped && !s.turn ? ` ${label(s.p)} is pushed.` : ''
  const out = s.output.length ? ` Output: ${s.output.join(' ')}.` : ''
  return `${pts}${lower}${upper}${turn}${placed}${out}`
}
